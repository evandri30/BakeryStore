import type { CookieOptions, RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { env, isProd } from '../env.js'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export const USER_COOKIE = 'token'
export const SELLER_COOKIE = 'sellerToken'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Client and API share one domain (client/vercel.json rewrites /api), so "lax" is enough.
const baseCookie: CookieOptions = { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' }

export function setAuthCookie(res: Parameters<RequestHandler>[1], name: string, payload: object) {
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' })
  res.cookie(name, token, { ...baseCookie, maxAge: MAX_AGE_MS })
}

export function clearAuthCookie(res: Parameters<RequestHandler>[1], name: string) {
  res.clearCookie(name, baseCookie)
}

function verify(token: unknown): jwt.JwtPayload | null {
  if (typeof token !== 'string') return null
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET)
    return typeof decoded === 'object' ? decoded : null
  } catch {
    return null
  }
}

/** Sets req.userId when a valid user cookie is present, but never rejects. */
export const optionalUser: RequestHandler = (req, _res, next) => {
  const sub = verify(req.cookies?.[USER_COOKIE])?.sub
  if (sub) req.userId = sub
  next()
}

export const authUser: RequestHandler = (req, res, next) => {
  const payload = verify(req.cookies?.[USER_COOKIE])
  if (!payload?.sub) {
    res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu' })
    return
  }
  req.userId = payload.sub
  next()
}

export const isSellerRequest = (req: Parameters<RequestHandler>[0]) => verify(req.cookies?.[SELLER_COOKIE])?.role === 'seller'

export const authSeller: RequestHandler = (req, res, next) => {
  const payload = verify(req.cookies?.[SELLER_COOKIE])
  if (payload?.role !== 'seller') {
    res.status(401).json({ success: false, message: 'Anda tidak memiliki akses' })
    return
  }
  next()
}

/** userId set by authUser. Only call in routes behind authUser. */
export function currentUserId(req: Parameters<RequestHandler>[0]): string {
  if (!req.userId) throw new Error('currentUserId used without authUser')
  return req.userId
}
