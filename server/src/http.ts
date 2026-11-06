import type { ErrorRequestHandler } from 'express'
import multer from 'multer'
import { z } from 'zod'

/** An error whose message is safe to show to the user. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Validate input; on failure throw a 400 with the first problem. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    const issue = result.error.issues[0]
    const field = issue?.path.join('.')
    throw new HttpError(400, field ? `${field}: ${issue?.message}` : (issue?.message ?? 'Input tidak valid'))
  }
  return result.data
}

// Express 5 forwards errors thrown in async handlers here.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, message: err.message })
    return
  }
  if (err instanceof multer.MulterError) {
    res.status(400).json({ success: false, message: `Upload gagal: ${err.message}` })
    return
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, message: 'Body JSON tidak valid' })
    return
  }
  console.error(err)
  res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' })
}
