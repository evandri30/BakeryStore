import { createHash } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from './db.js'
import { addFavorite, listFavorites, removeFavorite } from './favorites.js'
import { snap } from './integrations.js'
import {
  cancelOrder,
  changePaymentMethod,
  createOrder,
  expireUnpaidOrders,
  getSalesSummary,
  isValidMidtransSignature,
  orderItemsSchema,
} from './orders.js'

// Midtrans is never called from tests.
vi.mock('./integrations.js', () => ({
  snap: {
    createTransaction: vi.fn(async () => ({ token: 'snap-token', redirect_url: '' })),
    transaction: { status: vi.fn(async () => ({ transaction_status: 'expire' })), expire: vi.fn(async () => ({})) },
  },
}))

let userId: string
let addressId: string

async function product(stock: number, offerPrice = 10_000) {
  return prisma.product.create({
    data: { name: `P${stock}`, category: 'Roti', price: offerPrice, offerPrice, stock, massGrams: 100, images: [], description: [] },
  })
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Favorite", "OrderItem", "Order", "CartItem", "Address", "Product", "User" CASCADE',
  )
  const user = await prisma.user.create({ data: { name: 'T', email: 't@test', passwordHash: 'x' } })
  const address = await prisma.address.create({
    data: { userId: user.id, firstName: 'A', lastName: 'B', email: 'a@b.c', street: 's', city: 'c', state: 's', zipcode: '12345', country: 'ID', phone: '0812345678' },
  })
  userId = user.id
  addressId = address.id
  vi.clearAllMocks()
})

afterAll(() => prisma.$disconnect())

describe('createOrder', () => {
  it('computes the total from database prices and takes the stock', async () => {
    const a = await product(10, 15_000)
    const b = await product(5, 7_500)

    const order = await createOrder({
      userId,
      addressId,
      paymentType: 'COD',
      items: [
        { productId: a.id, quantity: 2 },
        { productId: b.id, quantity: 3 },
      ],
    })

    expect(order.amount).toBe(2 * 15_000 + 3 * 7_500)
    expect(order.isPaid).toBe(false)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: a.id } })).stock).toBe(8)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: b.id } })).stock).toBe(2)
  })

  it('rejects zero, negative and fractional quantities', () => {
    for (const quantity of [0, -5, 1.5]) {
      expect(orderItemsSchema.safeParse([{ productId: 'x', quantity }]).success).toBe(false)
    }
  })

  it('rejects an address that belongs to another user', async () => {
    const p = await product(5)
    const other = await prisma.user.create({ data: { name: 'O', email: 'o@test', passwordHash: 'x' } })
    await expect(
      createOrder({ userId: other.id, addressId, paymentType: 'COD', items: [{ productId: p.id, quantity: 1 }] }),
    ).rejects.toThrow('Alamat tidak ditemukan')
  })

  it('lets only one of two buyers take the last item', async () => {
    const p = await product(1)
    const buy = () => createOrder({ userId, addressId, paymentType: 'COD', items: [{ productId: p.id, quantity: 1 }] })

    const results = await Promise.allSettled([buy(), buy()])

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(0)
    expect(await prisma.order.count()).toBe(1)
  })
})

describe('cancelOrder', () => {
  it('gives the stock back once, even when called twice', async () => {
    const p = await product(4)
    const order = await createOrder({ userId, addressId, paymentType: 'ONLINE', items: [{ productId: p.id, quantity: 3 }] })

    expect(await cancelOrder(order.id)).toBe(true)
    expect(await cancelOrder(order.id)).toBe(false)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(4)
  })

  it('does not cancel a paid order', async () => {
    const p = await product(4)
    const order = await createOrder({ userId, addressId, paymentType: 'ONLINE', items: [{ productId: p.id, quantity: 1 }] })
    await prisma.order.update({ where: { id: order.id }, data: { isPaid: true } })

    expect(await cancelOrder(order.id)).toBe(false)
  })
})

describe('expireUnpaidOrders', () => {
  it('cancels only unpaid online orders past the payment window', async () => {
    const p = await product(10)
    const online = await createOrder({ userId, addressId, paymentType: 'ONLINE', items: [{ productId: p.id, quantity: 2 }] })
    const cod = await createOrder({ userId, addressId, paymentType: 'COD', items: [{ productId: p.id, quantity: 3 }] })

    await expireUnpaidOrders(new Date(Date.now() + 30 * 60_000)) // still inside the window
    expect((await prisma.order.findUniqueOrThrow({ where: { id: online.id } })).status).toBe('PROCESSING')

    await expireUnpaidOrders(new Date(Date.now() + 61 * 60_000))
    expect((await prisma.order.findUniqueOrThrow({ where: { id: online.id } })).status).toBe('CANCELLED')
    expect((await prisma.order.findUniqueOrThrow({ where: { id: cod.id } })).status).toBe('PROCESSING')
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(7)
  })
})

describe('isValidMidtransSignature', () => {
  const key = 'server-key'
  const base = { order_id: 'o1', status_code: '200', gross_amount: '10000.00', transaction_status: 'settlement' }
  const sign = (s: string) => createHash('sha512').update(s).digest('hex')

  it('accepts the signature Midtrans would send', () => {
    const signature_key = sign(base.order_id + base.status_code + base.gross_amount + key)
    expect(isValidMidtransSignature({ ...base, signature_key }, key)).toBe(true)
  })

  it('rejects a forged or changed notification', () => {
    const signature_key = sign(base.order_id + base.status_code + base.gross_amount + key)
    expect(isValidMidtransSignature({ ...base, gross_amount: '1.00', signature_key }, key)).toBe(false)
    expect(isValidMidtransSignature({ ...base, signature_key: 'abc' }, key)).toBe(false)
  })
})

describe('changePaymentMethod', () => {
  const order = async (paymentType: 'COD' | 'ONLINE') =>
    createOrder({ userId, addressId, paymentType, items: [{ productId: (await product(10)).id, quantity: 1 }] })

  it('refuses paid, cancelled and already packed orders', async () => {
    const paid = await order('ONLINE')
    await prisma.order.update({ where: { id: paid.id }, data: { isPaid: true } })
    const cancelled = await order('ONLINE')
    await cancelOrder(cancelled.id)
    const packed = await order('COD')
    await prisma.order.update({ where: { id: packed.id }, data: { status: 'PACKING' } })

    await expect(changePaymentMethod(paid.id, userId, 'COD')).rejects.toThrow('belum dibayar dan belum dikemas')
    await expect(changePaymentMethod(cancelled.id, userId, 'COD')).rejects.toThrow('belum dibayar dan belum dikemas')
    await expect(changePaymentMethod(packed.id, userId, 'ONLINE')).rejects.toThrow('belum dibayar dan belum dikemas')
  })

  it("refuses someone else's order", async () => {
    const o = await order('COD')
    const other = await prisma.user.create({ data: { name: 'O', email: 'o@test', passwordHash: 'x' } })
    await expect(changePaymentMethod(o.id, other.id, 'ONLINE')).rejects.toThrow('Order tidak ditemukan')
  })

  it('COD to online starts a new payment with its own reference and window', async () => {
    const o = await order('COD')
    const now = new Date(Date.now() + 50 * 60_000)

    const changed = await changePaymentMethod(o.id, userId, 'ONLINE', now)

    expect(changed.paymentType).toBe('ONLINE')
    expect(changed.snapToken).toBe('snap-token')
    expect(changed.paymentRef).toMatch(new RegExp(`^${o.id}-`))
    expect(changed.paymentStartedAt).toEqual(now)
    // The 60 minutes count from the switch, not from ordering.
    await expireUnpaidOrders(new Date(o.createdAt.getTime() + 61 * 60_000))
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('PROCESSING')
    await expireUnpaidOrders(new Date(now.getTime() + 61 * 60_000))
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('CANCELLED')
  })

  it('online to COD closes the Midtrans payment and is no longer timed', async () => {
    const o = await order('ONLINE')
    await prisma.order.update({ where: { id: o.id }, data: { paymentRef: `${o.id}-a`, snapToken: 't', paymentStartedAt: o.createdAt } })

    const changed = await changePaymentMethod(o.id, userId, 'COD')

    expect(vi.mocked(snap.transaction.expire)).toHaveBeenCalledWith(`${o.id}-a`)
    expect(changed).toMatchObject({ paymentType: 'COD', snapToken: null, paymentRef: null })
    await expireUnpaidOrders(new Date(Date.now() + 120 * 60_000))
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('PROCESSING')
  })

  it('does not switch to COD when Midtrans says it was already paid', async () => {
    const o = await order('ONLINE')
    vi.mocked(snap.transaction.status).mockResolvedValueOnce({ transaction_status: 'settlement' })

    await expect(changePaymentMethod(o.id, userId, 'COD')).rejects.toThrow('sudah dibayar')
    expect(await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).toMatchObject({ paymentType: 'ONLINE', isPaid: true })
  })
})

describe('getSalesSummary', () => {
  // 10 Nov 2026, 12:00 WIB
  const now = new Date('2026-11-10T05:00:00Z')

  async function sale(createdAt: string, opts: { quantity?: number; paid?: boolean; status?: 'CANCELLED' | 'DONE'; productId?: string } = {}) {
    const productId = opts.productId ?? (await product(100, 10_000)).id
    const o = await createOrder({ userId, addressId, paymentType: 'ONLINE', items: [{ productId, quantity: opts.quantity ?? 1 }] })
    await prisma.order.update({
      where: { id: o.id },
      data: { createdAt: new Date(createdAt), isPaid: opts.paid ?? true, status: opts.status ?? 'PROCESSING' },
    })
    return o
  }

  it('counts paid orders only, on the right Jakarta day', async () => {
    await sale('2026-11-09T16:30:00Z') // 23:30 WIB on 9 Nov
    await sale('2026-11-09T17:30:00Z') // 00:30 WIB on 10 Nov
    await sale('2026-11-10T01:00:00Z', { paid: false }) // unpaid: not revenue
    await sale('2026-11-10T02:00:00Z', { status: 'CANCELLED' }) // cancelled: not revenue

    const s = await getSalesSummary(now)

    expect(s.daily.map((d) => d.day)).toEqual(['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10'])
    expect(s.today).toEqual({ day: '2026-11-10', revenue: 10_000, orders: 1 })
    expect(s.daily[5]).toEqual({ day: '2026-11-09', revenue: 10_000, orders: 1 })
    expect(s.week).toEqual({ revenue: 20_000, orders: 2 })
  })

  it('ranks best sellers by quantity and skips cancelled orders', async () => {
    const roti = await product(100)
    const donat = await product(100)
    await sale('2026-11-10T01:00:00Z', { productId: roti.id, quantity: 2 })
    await sale('2026-11-10T01:00:00Z', { productId: donat.id, quantity: 5 })
    await sale('2026-11-10T01:00:00Z', { productId: roti.id, quantity: 9, status: 'CANCELLED' })

    const s = await getSalesSummary(now)

    expect(s.topProducts.map((p) => [p.id, p.sold])).toEqual([
      [donat.id, 5],
      [roti.id, 2],
    ])
    expect(s.waiting.PROCESSING).toBe(2)
  })
})

describe('favorites', () => {
  it('adding twice keeps one row, removing a missing one is fine', async () => {
    const p = await product(5)
    await addFavorite(userId, p.id)
    await addFavorite(userId, p.id)
    expect(await listFavorites(userId)).toEqual([p.id])

    await removeFavorite(userId, p.id)
    await removeFavorite(userId, p.id)
    expect(await listFavorites(userId)).toEqual([])
  })

  it('rejects an unknown product', async () => {
    await expect(addFavorite(userId, 'nope')).rejects.toThrow('Produk tidak ditemukan')
  })
})
