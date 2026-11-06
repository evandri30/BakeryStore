import type { RequestHandler } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { HttpError, parse } from '../http.js'
import { uploadImage } from '../integrations.js'

const productFields = {
  name: z.string().trim().min(1, 'Nama wajib diisi').max(120),
  description: z.array(z.string().trim()).max(20).transform((lines) => lines.filter(Boolean)),
  category: z.string().trim().min(1, 'Kategori wajib diisi'),
  price: z.int().min(0),
  offerPrice: z.int().min(0),
  stock: z.int().min(0, 'Stok tidak boleh negatif'),
  massGrams: z.int().min(1, 'Berat minimal 1 gram'),
  expiredAt: z.iso.date().nullable().optional(),
}

const createSchema = z
  .object(productFields)
  .refine((p) => p.offerPrice <= p.price, { message: 'Harga promo tidak boleh lebih dari harga normal', path: ['offerPrice'] })

const updateSchema = z.object(productFields).partial()

const toDate = (d: string | null | undefined) => (d === undefined ? undefined : d === null ? null : new Date(d))

// GET /api/product/list
export const list: RequestHandler = async (_req, res) => {
  const products = await prisma.product.findMany({ orderBy: [{ createdAt: 'desc' }, { name: 'asc' }] })
  res.json({ success: true, products })
}

// POST /api/product/add (multipart: "productData" JSON + "images" files)
export const add: RequestHandler = async (req, res) => {
  let raw: unknown
  try {
    raw = JSON.parse(String(req.body?.productData ?? ''))
  } catch {
    throw new HttpError(400, 'productData harus berupa JSON')
  }
  const data = parse(createSchema, raw)

  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  if (files.length === 0) throw new HttpError(400, 'Minimal satu gambar produk')
  const images = await Promise.all(files.map((f) => uploadImage(f.buffer)))

  const product = await prisma.product.create({
    data: { ...data, images, expiredAt: toDate(data.expiredAt) ?? null },
  })
  res.status(201).json({ success: true, product, message: 'Produk berhasil ditambahkan' })
}

// PUT /api/product/:id
export const update: RequestHandler = async (req, res) => {
  const data = parse(updateSchema, req.body)
  const id = String(req.params.id)

  const current = await prisma.product.findUnique({ where: { id }, select: { price: true, offerPrice: true } })
  if (!current) throw new HttpError(404, 'Produk tidak ditemukan')
  if ((data.offerPrice ?? current.offerPrice) > (data.price ?? current.price)) {
    throw new HttpError(400, 'Harga promo tidak boleh lebih dari harga normal')
  }

  const product = await prisma.product.update({
    where: { id },
    data: { ...data, expiredAt: toDate(data.expiredAt) },
  })
  res.json({ success: true, product, message: 'Produk berhasil diperbarui' })
}
