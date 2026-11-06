import type { RequestHandler } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { parse } from '../http.js'
import { currentUserId } from '../middlewares/auth.js'

const required = (label: string) => z.string().trim().min(1, `${label} wajib diisi`).max(200)

const addressSchema = z.object({
  firstName: required('Nama depan'),
  lastName: required('Nama belakang'),
  email: z.email('Email tidak valid'),
  street: required('Alamat'),
  city: required('Kota'),
  state: required('Provinsi'),
  zipcode: z.string().trim().regex(/^\d{5}$/, 'Kode pos harus 5 angka'),
  country: required('Negara'),
  phone: z.string().trim().regex(/^\+?\d{8,15}$/, 'Nomor HP tidak valid'),
})

// POST /api/address
export const add: RequestHandler = async (req, res) => {
  const data = parse(addressSchema, req.body)
  const address = await prisma.address.create({ data: { ...data, userId: currentUserId(req) } })
  res.status(201).json({ success: true, address, message: 'Alamat berhasil ditambahkan' })
}

// GET /api/address
export const list: RequestHandler = async (req, res) => {
  const addresses = await prisma.address.findMany({ where: { userId: currentUserId(req) } })
  res.json({ success: true, addresses })
}
