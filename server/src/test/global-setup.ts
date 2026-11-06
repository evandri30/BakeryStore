// Creates the test database if needed and applies migrations to it.
import { execSync } from 'node:child_process'
import pg from 'pg'

export default async function setup() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? 'postgresql://rizquna:rizquna@localhost:5432/rizquna_test')
  const dbName = url.pathname.slice(1)

  const admin = new pg.Client({ connectionString: Object.assign(new URL(url), { pathname: '/postgres' }).toString() })
  await admin.connect()
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
  if (!rowCount) await admin.query(`CREATE DATABASE "${dbName}"`)
  await admin.end()

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString() },
  })
}
