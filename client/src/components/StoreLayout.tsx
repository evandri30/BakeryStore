// Shell for the customer side: header, page, footer, and the mobile cart bar.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { LuMenu, LuSearch, LuShoppingBag, LuX } from 'react-icons/lu'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useShop } from '../context/ShopContext'
import { rupiah } from '../lib/format'
import { LoginDialog } from './LoginDialog'
import { ThemeToggle } from './ThemeToggle'

const container = 'mx-auto w-full max-w-6xl px-4 sm:px-6'

export function Wordmark({ className = '', color = 'text-cokelat', subtle = 'text-kraft-tua' }: { className?: string; color?: string; subtle?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 font-serif leading-none ${color} ${className}`}>
      Rizquna<span className={`font-sans text-[0.45em] font-semibold tracking-wide ${subtle}`}>bakery</span>
    </span>
  )
}

function SearchBox({ onDone }: { onDone?: () => void }) {
  const navigate = useNavigate()
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim()
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
    onDone?.()
  }
  return (
    <form role="search" onSubmit={submit} className="flex items-center rounded-full border border-garis focus-within:border-cokelat">
      <input name="q" type="search" placeholder="Cari roti, donat..." aria-label="Cari produk" className="w-full min-w-0 bg-transparent py-2 pl-4 text-sm outline-none" />
      <button type="submit" aria-label="Cari" className="grid size-9 shrink-0 place-items-center text-cokelat">
        <LuSearch />
      </button>
    </form>
  )
}

function AccountMenu() {
  const { user, logout, setLoginOpen } = useShop()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  if (!user) {
    return (
      <button type="button" onClick={() => setLoginOpen(true)} className="rounded-full bg-cokelat px-5 py-2 text-sm font-semibold text-tepung hover:bg-cokelat-tua">
        Masuk
      </button>
    )
  }
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="grid size-10 place-items-center rounded-full bg-adonan font-bold text-cokelat">
        <span aria-hidden>{user.name.charAt(0).toUpperCase()}</span>
        <span className="sr-only">Menu akun</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-garis bg-kertas py-2 text-sm shadow-lg">
          <p className="truncate px-4 pb-2 text-cokelat/60">{user.name}</p>
          <Link to="/my-orders" onClick={() => setOpen(false)} className="block px-4 py-2 hover:bg-adonan">
            Pesanan saya
          </Link>
          <Link to="/favorites" onClick={() => setOpen(false)} className="block px-4 py-2 hover:bg-adonan">
            Favorit saya
          </Link>
          <button
            type="button"
            className="block w-full px-4 py-2 text-left hover:bg-adonan"
            onClick={async () => {
              setOpen(false)
              await logout()
              toast.success('Kamu sudah keluar')
            }}
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  )
}

function CartLink() {
  const { cartCount } = useShop()
  return (
    <Link to="/cart" className="relative grid size-10 place-items-center rounded-full hover:bg-adonan" aria-label={`Keranjang, ${cartCount} barang`}>
      <LuShoppingBag className="size-5" />
      {cartCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-mentega px-1 text-[11px] font-bold">{cartCount}</span>
      )}
    </Link>
  )
}

const navLink = ({ isActive }: { isActive: boolean }) => `font-semibold hover:text-cokelat ${isActive ? 'text-cokelat' : ''}`

function Header() {
  const { user, setLoginOpen, logout } = useShop()
  const { pathname } = useLocation()
  // Remember which page the menu was opened on, so it closes by itself after navigating.
  const [openedOn, setOpenedOn] = useState<string | null>(null)
  const menuOpen = openedOn === pathname
  const setMenuOpen = (open: boolean) => setOpenedOn(open ? pathname : null)

  return (
    <header className="sticky top-0 z-20 border-b border-garis bg-tepung/95 backdrop-blur">
      <div className={`${container} flex h-16 items-center gap-6`}>
        <Link to="/" aria-label="Rizquna Bakery, beranda">
          <Wordmark className="text-3xl" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <NavLink to="/" end className={navLink}>
            Beranda
          </NavLink>
          <NavLink to="/products" className={navLink}>
            Etalase
          </NavLink>
        </nav>
        <div className="ml-auto hidden w-64 lg:block">
          <SearchBox />
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:ml-0">
          <ThemeToggle />
          <CartLink />
          <div className="hidden md:block">
            <AccountMenu />
          </div>
          <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-adonan md:hidden" aria-expanded={menuOpen} aria-label="Menu" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <LuX className="size-5" /> : <LuMenu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-garis bg-tepung md:hidden">
          <nav className={`${container} flex flex-col gap-1 py-4`}>
            <SearchBox onDone={() => setMenuOpen(false)} />
            <Link to="/" className="py-2 font-semibold">
              Beranda
            </Link>
            <Link to="/products" className="py-2 font-semibold">
              Etalase
            </Link>
            {user ? (
              <>
                <Link to="/my-orders" className="py-2 font-semibold">
                  Pesanan saya
                </Link>
                <Link to="/favorites" className="py-2 font-semibold">
                  Favorit saya
                </Link>
                <button type="button" className="py-2 text-left font-semibold" onClick={() => logout()}>
                  Keluar ({user.name})
                </button>
              </>
            ) : (
              <button type="button" className="py-2 text-left font-semibold text-cokelat" onClick={() => setLoginOpen(true)}>
                Masuk atau daftar
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

/** Sticky bar on phones so the cart is one tap away while browsing. */
function MobileCartBar() {
  const { cartCount, cartTotal } = useShop()
  const { pathname } = useLocation()
  if (cartCount === 0 || pathname === '/cart') return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-garis bg-tepung p-3 md:hidden">
      <Link to="/cart" className="flex items-center justify-between rounded-full bg-cokelat px-5 py-3 text-tepung">
        <span className="text-sm">
          {cartCount} barang, <b className="tabular-nums">{rupiah(cartTotal)}</b>
        </span>
        <span className="font-semibold">Lihat keranjang</span>
      </Link>
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-24 bg-kraft text-tinta">
      <div className={`${container} grid gap-10 py-12 sm:grid-cols-2`}>
        <div>
          <Wordmark className="text-4xl" color="text-tinta" subtle="text-tinta/70" />
          <p className="mt-3 max-w-xs">Roti, brownies, donat, puding, dan bolu dari dapur rumah, dipanggang setiap pagi.</p>
        </div>
        <div className="text-sm sm:justify-self-end">
          <h2 className="font-serif text-lg">Tentang proyek ini</h2>
          <p className="mt-2 max-w-sm">
            Rizquna Bakery adalah toko fiksi untuk portfolio. Pembayaran memakai Midtrans sandbox, jadi tidak ada uang sungguhan yang
            berpindah.
          </p>
          <a href="https://github.com/evandri30/BakeryStore" className="mt-3 inline-block font-semibold underline">
            Lihat kode di GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}

export function StoreLayout() {
  const { cartCount } = useShop()
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-tepung focus:px-3 focus:py-2">
        Langsung ke konten
      </a>
      <Header />
      <main id="main" className={`${container} flex-1 ${cartCount > 0 ? 'pb-24 md:pb-0' : ''}`}>
        <Outlet />
      </main>
      <Footer />
      <MobileCartBar />
      <LoginDialog />
    </div>
  )
}
