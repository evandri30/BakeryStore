import cookieParser from 'cookie-parser'
import express from 'express'
import { errorHandler } from './http.js'
import { api } from './routes.js'

export const app = express()

// Behind Vercel's proxy: needed for secure cookies and the rate limiter's client IP.
app.set('trust proxy', 1)
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Rizquna Bakery API' })
})
app.use('/api', api)
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' })
})
app.use(errorHandler)
