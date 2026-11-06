import { z } from 'zod'

// Fail fast on start-up when a variable is missing, instead of failing on the first request.
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
    SELLER_EMAIL: z.email(),
    SELLER_PASSWORD: z.string().min(1),
    CLIENT_URL: z.url(),
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    MIDTRANS_SERVER_KEY: z.string().min(1),
  })
  // A short admin password is fine on a laptop, never on the public site.
  .refine((e) => e.NODE_ENV !== 'production' || e.SELLER_PASSWORD.length >= 12, {
    message: 'SELLER_PASSWORD minimal 12 karakter di production',
    path: ['SELLER_PASSWORD'],
  })

export const env = schema.parse(process.env)
export const isProd = env.NODE_ENV === 'production'
