// Local development entry. On Vercel, api/index.ts exports the same app.
import { app } from './app.js'

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => console.log(`API running on http://localhost:${port}`))
