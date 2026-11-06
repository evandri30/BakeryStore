// Products a customer saved for later. Adding or removing twice is harmless.
import { prisma } from './db.js'
import { HttpError } from './http.js'

export async function listFavorites(userId: string) {
  const rows = await prisma.favorite.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { productId: true } })
  return rows.map((r) => r.productId)
}

export async function addFavorite(userId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) throw new HttpError(404, 'Produk tidak ditemukan')
  await prisma.favorite.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
  })
}

export async function removeFavorite(userId: string, productId: string) {
  await prisma.favorite.deleteMany({ where: { userId, productId } })
}
