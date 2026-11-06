import { useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useShop } from '../context/ShopContext'
import { api, errorMessage } from '../lib/api'
import type { User } from '../lib/types'
import { Button, Field, Modal } from './ui'

export function LoginDialog() {
  const { loginOpen, setLoginOpen, login } = useShop()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true)
    try {
      const data = await api<{ user: User }>(`/user/${mode}`, { body: form })
      await login(data.user)
      toast.success(mode === 'login' ? `Selamat datang, ${data.user.name}` : 'Akun berhasil dibuat')
      setLoginOpen(false)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={loginOpen} onClose={() => setLoginOpen(false)} title={mode === 'login' ? 'Masuk' : 'Daftar'}>
      <h2 className="font-serif text-3xl text-cokelat">{mode === 'login' ? 'Masuk' : 'Buat akun'}</h2>
      <p className="mt-1 text-sm text-cokelat/70">
        {mode === 'login' ? 'Masuk untuk memesan dan melihat pesananmu.' : 'Cukup nama, email, dan password.'}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === 'register' && <Field label="Nama" name="name" autoComplete="name" required maxLength={80} />}
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          minLength={mode === 'register' ? 8 : undefined}
          hint={mode === 'register' ? 'Minimal 8 karakter' : undefined}
          required
        />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Buat akun'}
        </Button>
      </form>

      {mode === 'login' && (
        <p className="mt-4 rounded-lg bg-adonan px-3 py-2 text-xs">
          Akun demo: <b>demo@rizquna.test</b> / <b>demo12345</b>
        </p>
      )}

      <p className="mt-4 text-center text-sm">
        {mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
        <button type="button" className="font-semibold text-cokelat underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Daftar' : 'Masuk'}
        </button>
      </p>
    </Modal>
  )
}
