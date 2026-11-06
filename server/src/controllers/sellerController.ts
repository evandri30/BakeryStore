import { createHash, timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { z } from 'zod'
import { env } from '../env.js'
import { HttpError, parse } from '../http.js'
import { getSalesSummary } from '../orders.js'
import { clearAuthCookie, isSellerRequest, SELLER_COOKIE, setAuthCookie } from '../middlewares/auth.js'

const loginSchema = z.object({ email: z.string(), password: z.string() })

// Hash both sides so the comparison takes the same time whatever the input length.
const sameSecret = (a: string, b: string) =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())

// POST /api/seller/login
export const login: RequestHandler = (req, res) => {
  const { email, password } = parse(loginSchema, req.body)
  const ok = sameSecret(email.toLowerCase(), env.SELLER_EMAIL.toLowerCase()) && sameSecret(password, env.SELLER_PASSWORD)
  if (!ok) throw new HttpError(401, 'Email atau password salah')

  setAuthCookie(res, SELLER_COOKIE, { role: 'seller' })
  res.json({ success: true, message: 'Login berhasil' })
}

// GET /api/seller/is-auth
export const isAuth: RequestHandler = (req, res) => {
  res.json({ success: true, isSeller: isSellerRequest(req) })
}

// GET /api/seller/logout
export const logout: RequestHandler = (_req, res) => {
  clearAuthCookie(res, SELLER_COOKIE)
  res.json({ success: true, message: 'Logout berhasil' })
}

// GET /api/seller/summary: numbers for the dashboard
export const summary: RequestHandler = async (_req, res) => {
  res.json({ success: true, summary: await getSalesSummary() })
}
