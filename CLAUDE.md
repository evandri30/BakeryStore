# Rizquna Bakery

Portfolio project (toko roti online). Bukan toko sungguhan: recruiter mencoba demo live dan membaca kode.
Fitur, stack, keputusan teknis, dan cara menjalankan ada di @readme.md. Jangan diulang di sini.

## Aturan proyek
- Semua layanan harus gratis tanpa kartu kredit: Vercel Hobby, Neon free, Cloudinary free, Midtrans **sandbox**. Jangan usulkan layanan berbayar.
- Jangan tambah fitur baru. Perbaiki dan poles yang sudah ada.
- Selesaikan dan cek semuanya di lokal dulu. Deploy (Vercel + Neon) adalah langkah terakhir.
- User menulis bahasa Indonesia santai ("gw/lo"). Balas dengan gaya yang sama. Teks UI dan readme memakai bahasa Indonesia baku.

## Perintah
Monorepo tanpa root package.json. Jalankan perintah di `server/` atau `client/`.

```bash
docker compose up -d                 # Postgres lokal (wajib sebelum dev/test server)
cd server && npm run dev             # API :3000
cd server && npm test                # Vitest ke DB rizquna_test (dibuat otomatis)
cd server && npm run typecheck
cd server && npm run db:migrate      # setelah ubah prisma/schema.prisma
cd client && npm run dev             # :5173, proxy /api ke :3000
cd client && npm run typecheck && npm run lint
```

Sebelum bilang selesai: jalankan `typecheck` di kedua folder, `lint` di client, dan `npm test` di server kalau menyentuh server.

## Konvensi kode
- Uang selalu rupiah bulat (`Int`), tidak pernah float. Harga dihitung di server, bukan dari body request.
- `userId` selalu dari cookie JWT (`req.userId`, diisi middleware `auth.ts`), tidak pernah dari body.
- Validasi setiap body request dengan Zod di controller. Pesan error ke browser umum, detail ke log.
- Aturan pesanan, stok, dan pembayaran ada di `server/src/orders.ts`. Perubahan di sana wajib disertai test di `orders.test.ts`.
- Endpoint baru didaftarkan di `server/src/routes.ts` (satu-satunya tempat routing).
- Import di server memakai ekstensi `.js` (ESM), walaupun file-nya `.ts`.
- `server/src/generated/` dibuat oleh `prisma generate`. Jangan diedit manual.
- Jalan pintas yang disengaja diberi komentar `// shortcut: <batasnya>, <kapan diganti>`.

## Catatan
- Midtrans tidak bisa mengirim notifikasi ke localhost. Di lokal status bayar dicek saat halaman "Pesanan saya" dibuka.
- Belum deploy. Saat deploy, cek `client/vercel.json`: readme bilang `/api` di-rewrite ke deployment server, tapi saat ini file itu baru me-rewrite semua ke `/` (SPA).
- Branch `main` = v2. `main-lama` dan remote `lama` = versi lama (MongoDB/JS), hanya untuk referensi.
