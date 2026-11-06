// Admin shell. Every /seller route goes through here, so all of them require the seller login.
import { useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { LuChartColumn, LuClipboardList, LuPackage, LuPackagePlus } from 'react-icons/lu'
import { Link, NavLink, Outlet } from 'react-router'
import { Wordmark } from '../../components/StoreLayout'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Button, Field } from '../../components/ui'
import { useShop } from '../../context/ShopContext'
import { api, errorMessage } from '../../lib/api'

const links = [
  { to: '/seller', label: 'Dashboard', icon: LuChartColumn, end: true },
  { to: '/seller/orders', label: 'Pesanan', icon: LuClipboardList, end: true },
  { to: '/seller/products', label: 'Produk', icon: LuPackage, end: true },
  { to: '/seller/products/new', label: 'Tambah', icon: LuPackagePlus, end: true },
]

function SellerLogin() {
  const { setIsSeller } = useShop()
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/seller/login', { body: Object.fromEntries(new FormData(e.currentTarget)) })
      setIsSeller(true)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-adonan px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[2rem] bg-kertas p-8">
        <Wordmark className="text-4xl" />
        <h1 className="mt-4 font-serif text-2xl">Masuk sebagai admin</h1>
        <div className="mt-6 space-y-4">
          <Field label="Email" name="email" type="email" autoComplete="username" required />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Button type="submit" disabled={busy} className="mt-6 w-full">
          {busy ? 'Memproses...' : 'Masuk'}
        </Button>
        <Link to="/" className="mt-4 block text-center text-sm text-cokelat underline">
          Kembali ke toko
        </Link>
      </form>
    </main>
  )
}

export default function SellerLayout() {
  const { isSeller, setIsSeller } = useShop()
  if (!isSeller) return <SellerLogin />

  async function logout() {
    await api('/seller/logout').catch(() => undefined)
    setIsSeller(false)
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold ${isActive ? 'bg-cokelat text-tepung' : 'hover:bg-adonan'}`

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-garis p-4 md:block">
        <Link to="/" className="block px-3 py-2">
          <Wordmark className="text-3xl" />
          <span className="mt-1 block text-xs text-cokelat/60">Dapur admin</span>
        </Link>
        <nav className="mt-6 space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon className="size-5" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 flex items-center justify-between pl-3">
          <button type="button" onClick={logout} className="text-sm text-cokelat/60 underline">
            Keluar
          </button>
          <ThemeToggle />
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-garis px-4 py-3 md:hidden">
        <Wordmark className="text-2xl" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button type="button" onClick={logout} className="text-sm underline">
            Keluar
          </button>
        </div>
      </header>

      <main className="min-w-0 px-4 pb-24 sm:px-8 md:pb-12">
        <Outlet />
      </main>

      {/* Phones: tabs at the bottom, within thumb reach. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-garis bg-kertas md:hidden">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-xs font-semibold ${isActive ? 'text-cokelat' : 'text-cokelat/60'}`}>
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
