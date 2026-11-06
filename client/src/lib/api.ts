// Thin fetch wrapper. The API lives on the same origin under /api (see vite.config.ts and vercel.json).

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

type Options = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; form?: FormData }

export async function api<T = { success: true; message?: string }>(path: string, options: Options = {}): Promise<T> {
  const { method = options.body !== undefined || options.form ? 'POST' : 'GET', body, form } = options

  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    })
  } catch {
    throw new ApiError(0, 'Tidak bisa terhubung ke server. Periksa koneksi internet.')
  }

  const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null
  if (!res.ok || data?.success === false) {
    throw new ApiError(res.status, data?.message ?? `Server bermasalah (${res.status}). Coba lagi sebentar.`)
  }
  return data as T
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Terjadi kesalahan')
