// Third-party services: Cloudinary (product images) and Midtrans (sandbox payments).
import { v2 as cloudinary } from 'cloudinary'
import midtransClient from 'midtrans-client'
import multer from 'multer'
import { env } from './env.js'
import { HttpError } from './http.js'

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
})

// Images stay in memory and go straight to Cloudinary: nothing is written to disk.
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new HttpError(400, 'File harus berupa gambar'))
  },
})

export function uploadImage(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ resource_type: 'image', folder: 'rizquna-bakery' }, (err, result) => {
        if (err || !result) reject(err ?? new Error('Cloudinary upload failed'))
        else resolve(result.secure_url)
      })
      .end(buffer)
  })
}

// Portfolio project: always sandbox, never real money.
export const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: env.MIDTRANS_SERVER_KEY,
})
