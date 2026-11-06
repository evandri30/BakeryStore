import { defineConfig } from 'vitest/config'

// Tests run against a separate database in the local Docker Postgres.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://rizquna:rizquna@localhost:5432/rizquna_test'

export default defineConfig({
  test: {
    globalSetup: './src/test/global-setup.ts',
    // Placeholders so env.ts validates. Cloudinary and Midtrans are mocked in tests and never called.
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test-secret-that-is-at-least-32-characters',
      SELLER_EMAIL: 'admin@test.local',
      SELLER_PASSWORD: 'test',
      CLIENT_URL: 'http://localhost:5173',
      CLOUDINARY_CLOUD_NAME: 'test',
      CLOUDINARY_API_KEY: 'test',
      CLOUDINARY_API_SECRET: 'test',
      MIDTRANS_SERVER_KEY: 'test',
    },
    fileParallelism: false,
  },
})
