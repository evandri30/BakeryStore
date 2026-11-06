// Demo data so recruiters can try the shop right away. Safe to run more than once.
import bcrypt from 'bcryptjs'
import { prisma } from '../src/db.js'

// Images live in client/public/products, served by the frontend (no Cloudinary needed for demo data).
const img = (file: string) => `/products/${file}`

const products = [
  { name: 'Roti Tawar Klasik', category: 'Roti', price: 22000, offerPrice: 19000, massGrams: 400, stock: 30, images: [img('roti-tawar.webp')], description: ['Lembut dan empuk', 'Tanpa pengawet', 'Cocok untuk sarapan'] },
  { name: 'Roti Gandum', category: 'Roti', price: 28000, offerPrice: 25000, massGrams: 400, stock: 20, images: [img('roti-gandum.webp')], description: ['Gandum utuh', 'Tinggi serat'] },
  { name: 'Croissant Mentega', category: 'Roti', price: 18000, offerPrice: 15000, massGrams: 80, stock: 25, images: [img('croissant.webp')], description: ['Mentega asli', 'Berlapis dan renyah'] },
  { name: 'Brownies Panggang', category: 'Brownies', price: 65000, offerPrice: 58000, massGrams: 500, stock: 15, images: [img('brownies-panggang.webp')], description: ['Cokelat pekat', 'Bagian atas renyah, dalam lembut'] },
  { name: 'Brownies Kukus', category: 'Brownies', price: 55000, offerPrice: 50000, massGrams: 500, stock: 12, images: [img('brownies-kukus.webp')], description: ['Lembut dan moist', 'Taburan kacang panggang'] },
  { name: 'Donat Gula', category: 'Donat', price: 30000, offerPrice: 27000, massGrams: 360, stock: 40, images: [img('donat-gula.webp')], description: ['Isi 6', 'Taburan gula halus'] },
  { name: 'Donat Aneka Topping', category: 'Donat', price: 42000, offerPrice: 38000, massGrams: 400, stock: 30, images: [img('donat-topping.webp')], description: ['Isi 6', 'Glasir stroberi dan meses warna-warni'] },
  { name: 'Puding Cokelat', category: 'Puding', price: 35000, offerPrice: 32000, massGrams: 600, stock: 18, images: [img('puding-cokelat.webp')], description: ['Dengan krim dan stroberi', 'Disajikan dingin'] },
  { name: 'Bolu Pandan', category: 'Aneka Bolu', price: 60000, offerPrice: 55000, massGrams: 700, stock: 10, images: [img('bolu-pandan.webp')], description: ['Pandan asli', 'Lembut dan harum'] },
  { name: 'Bolu Marmer', category: 'Aneka Bolu', price: 70000, offerPrice: 65000, massGrams: 750, stock: 3, images: [img('bolu-marmer.webp')], description: ['Perpaduan cokelat dan vanila', 'Stok terbatas'] },
]

export const DEMO_USER = { email: 'demo@rizquna.test', password: 'demo12345', name: 'Pembeli Demo' }

async function main() {
  await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {},
    create: { email: DEMO_USER.email, name: DEMO_USER.name, passwordHash: await bcrypt.hash(DEMO_USER.password, 10) },
  })

  if ((await prisma.product.count()) === 0) {
    await prisma.product.createMany({ data: products })
    console.log(`Seeded ${products.length} products`)
  } else {
    // Products exist: refresh photos and descriptions only, keep stock and orders as they are.
    for (const p of products) {
      await prisma.product.updateMany({ where: { name: p.name }, data: { images: p.images, description: p.description } })
    }
    console.log('Products already exist, photos and descriptions refreshed')
  }
  console.log(`Demo user: ${DEMO_USER.email} / ${DEMO_USER.password}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
