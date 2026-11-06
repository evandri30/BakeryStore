import bcrypt from 'bcryptjs'
import type { RequestHandler } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { HttpError, parse } from '../http.js'
import { clearAuthCookie, setAuthCookie, USER_COOKIE } from '../middlewares/auth.js'

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(80),
  email: z.email('Email tidak valid').toLowerCase(),
  password: z.string().min(8, 'Password minimal 8 karakter').max(72),
})

const loginSchema = z.object({
  email: z.email('Email tidak valid').toLowerCase(),
  password: z.string().min(1, 'Password wajib diisi'),
})

const publicUser = { id: true, name: true, email: true } as const

// POST /api/user/register
export const register: RequestHandler = async (req, res) => {
  const { name, email, password } = parse(registerSchema, req.body)

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (exists) throw new HttpError(409, 'Email sudah terdaftar')

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10) },
    select: publicUser,
  })
  setAuthCookie(res, USER_COOKIE, { sub: user.id })
  res.status(201).json({ success: true, user, message: 'Register berhasil' })
}

// POST /api/user/login
export const login: RequestHandler = async (req, res) => {
  const { email, password } = parse(loginSchema, req.body)

  const user = await prisma.user.findUnique({ where: { email } })
  // Same message for unknown email and wrong password, so emails can't be probed.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Email atau password salah')
  }
  setAuthCookie(res, USER_COOKIE, { sub: user.id })
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email }, message: 'Login berhasil' })
}

// GET /api/user/is-auth: 200 with user null for guests, so visitors see no failed request.
export const isAuth: RequestHandler = async (req, res) => {
  const user = req.userId ? await prisma.user.findUnique({ where: { id: req.userId }, select: publicUser }) : null
  res.json({ success: true, user })
}

// GET /api/user/logout: no auth needed, so an expired cookie can still be cleared.
export const logout: RequestHandler = (_req, res) => {
  clearAuthCookie(res, USER_COOKIE)
  res.json({ success: true, message: 'Logout berhasil' })
}
