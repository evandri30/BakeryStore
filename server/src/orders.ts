// Order rules that touch money and stock. Kept free of Express so they can be tested directly.
import { createHash, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { prisma } from './db.js'
import { env } from './env.js'
import type { Address, Prisma } from './generated/prisma/client.js'
import { HttpError } from './http.js'
import { snap } from './integrations.js'

export const orderItemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1),
      quantity: z.int().min(1, 'Jumlah minimal 1').max(99),
    }),
  )
  .min(1, 'Keranjang kosong')
  .max(50)

type OrderInput = {
  userId: string
  addressId: string
  items: z.infer<typeof orderItemsSchema>
  paymentType: 'COD' | 'ONLINE'
}

/**
 * Creates the order and takes the stock in one transaction.
 * Stock is decremented with a conditional UPDATE (stock >= qty), so two buyers
 * racing for the last items cannot both succeed.
 */
export async function createOrder({ userId, addressId, items, paymentType }: OrderInput) {
  const wanted = new Map<string, number>()
  for (const it of items) wanted.set(it.productId, (wanted.get(it.productId) ?? 0) + it.quantity)
  const productIds = [...wanted.keys()]

  return prisma.$transaction(async (tx) => {
    const address = await tx.address.findFirst({ where: { id: addressId, userId }, select: { id: true } })
    if (!address) throw new HttpError(404, 'Alamat tidak ditemukan')

    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, offerPrice: true },
    })
    if (products.length !== productIds.length) throw new HttpError(404, 'Ada produk yang tidak ditemukan')

    const lines = products.map((p) => ({ product: p, quantity: wanted.get(p.id) ?? 0 }))
    for (const { product, quantity } of lines) {
      const { count } = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      })
      if (count === 0) throw new HttpError(409, `Stok "${product.name}" tidak cukup`)
    }

    const amount = lines.reduce((sum, l) => sum + l.product.offerPrice * l.quantity, 0)
    const order = await tx.order.create({
      data: {
        userId,
        addressId,
        amount,
        paymentType,
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
            unitPrice: l.product.offerPrice,
          })),
        },
      },
    })

    await tx.cartItem.deleteMany({ where: { userId, productId: { in: productIds } } })
    return order
  })
}

/**
 * Cancels an unpaid, unfinished order and gives its stock back.
 * Returns false when the order was already paid, done or cancelled (safe to call twice).
 */
export async function cancelOrder(orderId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, isPaid: false, status: { notIn: ['CANCELLED', 'DONE'] } },
      data: { status: 'CANCELLED' },
    })
    if (count === 0) return false

    const items = await tx.orderItem.findMany({ where: { orderId } })
    for (const it of items) {
      await tx.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } })
    }
    return true
  })
}

/** Unpaid online orders give their stock back after this long. Matches the Snap expiry. */
export const PAYMENT_WINDOW_MINUTES = 60

/**
 * Cancels online orders whose payment window has passed.
 * shortcut: runs lazily (before new orders and order lists) instead of on a schedule,
 * which is enough for one small shop and needs no paid cron.
 */
export async function expireUnpaidOrders(now = new Date()) {
  const cutoff = new Date(now.getTime() - PAYMENT_WINDOW_MINUTES * 60_000)
  const stale = await prisma.order.findMany({
    where: {
      paymentType: 'ONLINE',
      isPaid: false,
      status: { not: 'CANCELLED' },
      // The window starts when this payment attempt started (after a switch to online), else at ordering.
      OR: [{ paymentStartedAt: { lt: cutoff } }, { paymentStartedAt: null, createdAt: { lt: cutoff } }],
    },
    select: { id: true },
  })
  for (const o of stale) await cancelOrder(o.id)
}

/** Applies a Midtrans transaction status (from a notification or a status check) to our order. */
const isPaidStatus = (transactionStatus: string, fraudStatus?: string) =>
  transactionStatus === 'settlement' || (transactionStatus === 'capture' && fraudStatus === 'accept')

export async function applyPaymentStatus(orderId: string, transactionStatus: string, fraudStatus?: string) {
  if (isPaidStatus(transactionStatus, fraudStatus)) {
    const { count } = await prisma.order.updateMany({ where: { id: orderId, status: { not: 'CANCELLED' } }, data: { isPaid: true } })
    // Paid after the window closed: the stock is already released. Needs a manual refund.
    if (count === 0) console.warn(`Payment received for cancelled order ${orderId}`)
  } else if (['expire', 'cancel', 'deny', 'failure'].includes(transactionStatus)) {
    await cancelOrder(orderId)
  }
  // "pending" and anything else: nothing to do yet.
}

export const midtransNotificationSchema = z.object({
  order_id: z.string().min(1),
  status_code: z.string().min(1),
  gross_amount: z.string().min(1),
  signature_key: z.string().min(1),
  transaction_status: z.string().min(1),
  fraud_status: z.string().optional(),
})

/** Midtrans signs notifications with sha512(order_id + status_code + gross_amount + serverKey). */
export function isValidMidtransSignature(n: z.infer<typeof midtransNotificationSchema>, serverKey: string) {
  const expected = createHash('sha512')
    .update(n.order_id + n.status_code + n.gross_amount + serverKey)
    .digest()
  const given = Buffer.from(n.signature_key, 'hex')
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/** The order_id Midtrans knows this order's current payment by. */
export const midtransRef = (order: { id: string; paymentRef: string | null }) => order.paymentRef ?? order.id

/**
 * Starts a Midtrans Snap payment under a fresh reference. A new reference every time,
 * because Midtrans rejects an order_id it has seen before (e.g. after switching COD -> online).
 */
export async function startSnapPayment(order: { id: string; amount: number }, address: Address, now = new Date()) {
  const ref = `${order.id}-${now.getTime().toString(36)}`
  const transaction = await snap.createTransaction({
    transaction_details: { order_id: ref, gross_amount: order.amount },
    customer_details: { first_name: address.firstName, last_name: address.lastName, email: address.email, phone: address.phone },
    callbacks: { finish: `${env.CLIENT_URL}/my-orders` },
    expiry: { unit: 'minute', duration: PAYMENT_WINDOW_MINUTES },
  })
  return { ref, token: transaction.token }
}

/**
 * Switches an order between cash on delivery and online payment, after it was placed.
 * Only while it is unpaid and still PROCESSING (the kitchen has not started packing it).
 */
export async function changePaymentMethod(orderId: string, userId: string, to: 'COD' | 'ONLINE', now = new Date()) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { address: true } })
  if (!order) throw new HttpError(404, 'Order tidak ditemukan')
  if (order.isPaid || order.status !== 'PROCESSING') {
    throw new HttpError(409, 'Metode pembayaran hanya bisa diganti selama pesanan belum dibayar dan belum dikemas')
  }
  if (order.paymentType === to) throw new HttpError(409, 'Pesanan ini sudah memakai metode itu')

  // Only switch if nothing changed meanwhile (a payment landing, the seller starting to pack).
  const unchanged = { id: order.id, isPaid: false, status: 'PROCESSING', paymentType: order.paymentType } as const
  let data: Prisma.OrderUpdateManyMutationInput

  if (to === 'COD') {
    const ref = midtransRef(order)
    // Close the open payment first so it cannot be paid after the switch.
    // Fails with 404 when no payment method was ever chosen in the popup: nothing to close then.
    await snap.transaction.expire(ref).catch(() => undefined)
    const t = await snap.transaction.status(ref).catch(() => null)
    if (t && isPaidStatus(t.transaction_status, t.fraud_status)) {
      await applyPaymentStatus(order.id, t.transaction_status, t.fraud_status)
      throw new HttpError(409, 'Pesanan ini ternyata sudah dibayar')
    }
    data = { paymentType: 'COD', snapToken: null, paymentRef: null, paymentStartedAt: null }
  } else {
    let payment: { ref: string; token: string }
    try {
      payment = await startSnapPayment(order, order.address, now)
    } catch (err) {
      console.error('Midtrans createTransaction failed', err)
      throw new HttpError(502, 'Gagal membuat pembayaran, silakan coba lagi')
    }
    data = { paymentType: 'ONLINE', snapToken: payment.token, paymentRef: payment.ref, paymentStartedAt: now }
  }

  const { count } = await prisma.order.updateMany({ where: unchanged, data })
  if (count === 0) throw new HttpError(409, 'Status pesanan baru saja berubah, muat ulang halaman')
  return prisma.order.findUniqueOrThrow({ where: { id: order.id } })
}

/** Orders that count as real sales: not cancelled, and cash on delivery or already paid online. */
const realOrder = {
  status: { not: 'CANCELLED' },
  OR: [{ paymentType: 'COD' }, { isPaid: true }],
} satisfies Prisma.OrderWhereInput

const DAY_MS = 24 * 60 * 60_000
const WIB_OFFSET_MS = 7 * 60 * 60_000 // Asia/Jakarta has no daylight saving: always UTC+7
/** "YYYY-MM-DD" of the shop's calendar day (Asia/Jakarta) for a moment in time. */
const wibDay = (d: Date) => new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10)

/** Numbers for the seller dashboard. Revenue counts paid orders only, on the day they were placed (WIB). */
export async function getSalesSummary(now = new Date()) {
  const todayStart = new Date(Date.parse(wibDay(now)) - WIB_OFFSET_MS) // 00:00 WIB today, in UTC
  const since = new Date(todayStart.getTime() - 6 * DAY_MS)

  const rows = await prisma.$queryRaw<{ day: string; revenue: number; orders: number }[]>`
    SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS day,
           SUM(amount)::int AS revenue,
           COUNT(*)::int AS orders
    FROM "Order"
    WHERE "isPaid" AND status <> 'CANCELLED' AND "createdAt" >= ${since} AND "createdAt" <= ${now}
    GROUP BY 1`
  const daily = Array.from({ length: 7 }, (_, i) => {
    const day = wibDay(new Date(since.getTime() + i * DAY_MS))
    const row = rows.find((r) => r.day === day)
    return { day, revenue: row?.revenue ?? 0, orders: row?.orders ?? 0 }
  })

  const [byStatus, top, lowStock] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where: realOrder, _count: { _all: true } }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: realOrder },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.product.findMany({
      where: { stock: { lte: 5 } },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, stock: true, images: true },
    }),
  ])
  const names = await prisma.product.findMany({
    where: { id: { in: top.map((t) => t.productId) } },
    select: { id: true, name: true, images: true },
  })
  const count = (status: string) => byStatus.find((s) => s.status === status)?._count._all ?? 0

  return {
    today: daily[6] ?? { day: wibDay(now), revenue: 0, orders: 0 },
    week: { revenue: daily.reduce((s, d) => s + d.revenue, 0), orders: daily.reduce((s, d) => s + d.orders, 0) },
    daily,
    waiting: { PROCESSING: count('PROCESSING'), PACKING: count('PACKING'), SHIPPING: count('SHIPPING') },
    topProducts: top.flatMap((t) => {
      const p = names.find((x) => x.id === t.productId)
      return p ? [{ id: p.id, name: p.name, image: p.images[0] ?? null, sold: t._sum.quantity ?? 0 }] : []
    }),
    lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, stock: p.stock, image: p.images[0] ?? null })),
  }
}
