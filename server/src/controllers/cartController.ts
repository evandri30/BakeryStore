import type { RequestHandler } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { HttpError, parse } from '../http.js'
import { currentUserId } from '../middlewares/auth.js'

const cartSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: z.int().min(1).max(99) }))
    .max(50),
})

const toResponse = (rows: { productId: string; quantity: number }[]) =>
  rows.map(({ productId, quantity }) => ({ productId, quantity }))

// GET /api/cart
export const get: RequestHandler = async (req, res) => {
  const rows = await prisma.cartItem.findMany({ where: { userId: currentUserId(req) } })
  res.json({ success: true, items: toResponse(rows) })
}

// PUT /api/cart: replaces the whole cart with the given items.
export const replace: RequestHandler = async (req, res) => {
  const userId = currentUserId(req)
  const { items } = parse(cartSchema, req.body)

  const ids = [...new Set(items.map((i) => i.productId))]
  if (ids.length !== items.length) throw new HttpError(400, 'Produk dobel di keranjang')

  const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, stock: true } })
  if (products.length !== ids.length) throw new HttpError(404, 'Ada produk yang tidak ditemukan')
  for (const p of products) {
    const qty = items.find((i) => i.productId === p.id)?.quantity ?? 0
    if (qty > p.stock) throw new HttpError(409, `Stok "${p.name}" tidak cukup. Sisa stok: ${p.stock}`)
  }

  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { userId } }),
    prisma.cartItem.createMany({ data: items.map((i) => ({ userId, ...i })) }),
  ])
  res.json({ success: true, items: toResponse(items), message: 'Keranjang diperbarui' })
}
