import type { RequestHandler } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { env } from '../env.js'
import { HttpError, parse } from '../http.js'
import { snap } from '../integrations.js'
import { currentUserId } from '../middlewares/auth.js'
import {
  applyPaymentStatus,
  cancelOrder,
  changePaymentMethod,
  createOrder,
  expireUnpaidOrders,
  isValidMidtransSignature,
  midtransNotificationSchema,
  midtransRef,
  orderItemsSchema,
  startSnapPayment,
} from '../orders.js'

const placeSchema = z.object({
  addressId: z.string().min(1, 'Pilih alamat'),
  items: orderItemsSchema,
  paymentType: z.enum(['COD', 'ONLINE']),
})

const withDetails = { items: { include: { product: true } }, address: true } as const

// POST /api/order
export const place: RequestHandler = async (req, res) => {
  const input = parse(placeSchema, req.body)
  await expireUnpaidOrders() // frees stock held by abandoned payments first
  const order = await createOrder({ userId: currentUserId(req), ...input })

  if (order.paymentType === 'COD') {
    res.status(201).json({ success: true, orderId: order.id, message: 'Pesanan berhasil dibuat' })
    return
  }

  // Online: the order stays unpaid until Midtrans confirms it through the notification below.
  const address = await prisma.address.findUniqueOrThrow({ where: { id: order.addressId } })
  try {
    const payment = await startSnapPayment(order, address, order.createdAt)
    await prisma.order.update({
      where: { id: order.id },
      data: { snapToken: payment.token, paymentRef: payment.ref, paymentStartedAt: order.createdAt },
    })
    res.status(201).json({ success: true, orderId: order.id, token: payment.token })
  } catch (err) {
    console.error('Midtrans createTransaction failed', err)
    await cancelOrder(order.id)
    // Put the items back in the cart so the customer can simply try again.
    await prisma.cartItem.createMany({
      data: input.items.map((i) => ({ userId: order.userId, productId: i.productId, quantity: i.quantity })),
      skipDuplicates: true,
    })
    throw new HttpError(502, 'Gagal membuat pembayaran, silakan coba lagi')
  }
}

// POST /api/order/midtrans/notification (called by Midtrans, not by the browser)
export const midtransNotification: RequestHandler = async (req, res) => {
  const n = parse(midtransNotificationSchema, req.body)
  if (!isValidMidtransSignature(n, env.MIDTRANS_SERVER_KEY)) {
    throw new HttpError(403, 'Signature tidak valid')
  }

  // Only the order's current online payment counts. A notification for an older attempt
  // (e.g. the "expire" sent after switching to cash on delivery) is acknowledged and ignored.
  const order = await prisma.order.findFirst({
    where: { paymentType: 'ONLINE', OR: [{ paymentRef: n.order_id }, { id: n.order_id, paymentRef: null }] },
    select: { id: true },
  })
  if (!order) {
    if (n.transaction_status === 'settlement') console.warn(`Payment for an outdated reference ${n.order_id}`)
    res.json({ success: true, ignored: true })
    return
  }

  await applyPaymentStatus(order.id, n.transaction_status, n.fraud_status)
  res.json({ success: true })
}

// POST /api/order/:id/check-payment: asks Midtrans directly. Covers a missed notification
// and local development, where Midtrans cannot reach localhost.
export const checkPayment: RequestHandler = async (req, res) => {
  const order = await prisma.order.findFirst({ where: { id: String(req.params.id), userId: currentUserId(req) } })
  if (!order) throw new HttpError(404, 'Order tidak ditemukan')

  if (order.paymentType === 'ONLINE' && !order.isPaid && order.status !== 'CANCELLED') {
    try {
      const t = await snap.transaction.status(midtransRef(order))
      await applyPaymentStatus(order.id, t.transaction_status, t.fraud_status)
    } catch {
      // 404 from Midtrans: no payment method chosen yet, so still waiting.
    }
  }
  const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: withDetails })
  res.json({ success: true, order: updated })
}

const paymentMethodSchema = z.object({ paymentType: z.enum(['COD', 'ONLINE']) })

// POST /api/order/:id/payment-method: switch between cash on delivery and online after ordering.
export const changePayment: RequestHandler = async (req, res) => {
  const { paymentType } = parse(paymentMethodSchema, req.body)
  await expireUnpaidOrders() // an online order past its window is cancelled, not switched
  const changed = await changePaymentMethod(String(req.params.id), currentUserId(req), paymentType)
  const order = await prisma.order.findUniqueOrThrow({ where: { id: changed.id }, include: withDetails })
  res.json({ success: true, order, token: order.snapToken ?? undefined })
}

// GET /api/order/mine
export const mine: RequestHandler = async (req, res) => {
  await expireUnpaidOrders()
  const orders = await prisma.order.findMany({
    where: { userId: currentUserId(req) },
    include: withDetails,
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, orders })
}

// GET /api/order/seller: hides online orders that were never paid.
export const all: RequestHandler = async (_req, res) => {
  const orders = await prisma.order.findMany({
    where: { OR: [{ paymentType: 'COD' }, { isPaid: true }] },
    include: withDetails,
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, orders })
}

const FLOW = ['PROCESSING', 'PACKING', 'SHIPPING', 'DONE'] as const
const statusSchema = z.object({ status: z.enum([...FLOW, 'CANCELLED']) })

// PATCH /api/order/:id/status
export const updateStatus: RequestHandler = async (req, res) => {
  const { status } = parse(statusSchema, req.body)
  const id = String(req.params.id)

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) throw new HttpError(404, 'Order tidak ditemukan')
  if (order.status === 'DONE' || order.status === 'CANCELLED') {
    throw new HttpError(409, 'Pesanan sudah selesai atau dibatalkan')
  }

  if (status === 'CANCELLED') {
    if (!(await cancelOrder(id))) throw new HttpError(409, 'Pesanan yang sudah dibayar tidak bisa dibatalkan')
  } else {
    if (FLOW.indexOf(status) <= FLOW.indexOf(order.status as (typeof FLOW)[number])) {
      throw new HttpError(409, 'Status hanya bisa maju')
    }
    if (order.paymentType === 'ONLINE' && !order.isPaid) throw new HttpError(409, 'Pesanan belum dibayar')
    // COD is paid in cash on delivery.
    const isPaid = order.isPaid || (status === 'DONE' && order.paymentType === 'COD')
    await prisma.order.update({ where: { id }, data: { status, isPaid } })
  }

  const updated = await prisma.order.findUniqueOrThrow({ where: { id }, include: withDetails })
  res.json({ success: true, order: updated, message: 'Status pesanan diperbarui' })
}
