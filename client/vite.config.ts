import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin /api, like the Vercel rewrite in production, so auth cookies stay first-party.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
