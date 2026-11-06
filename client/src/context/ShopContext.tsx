import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { api, errorMessage } from '../lib/api'
import type { Cart, Product, User } from '../lib/types'

type Shop = {
  user: User | null
  authReady: boolean
  isSeller: boolean
  setIsSeller: (v: boolean) => void
  login: (user: User) => Promise<void>
  logout: () => Promise<void>
  loginOpen: boolean
  setLoginOpen: (v: boolean) => void

  products: Product[]
  productsLoading: boolean
  refreshProducts: () => Promise<void>
  findProduct: (id: string) => Product | undefined

  cart: Cart
  cartCount: number
  cartTotal: number
  setQuantity: (productId: string, quantity: number) => void
  reloadCart: () => Promise<void>

  /** Product ids the user saved, newest first. Empty for guests. */
  favorites: string[]
  toggleFavorite: (productId: string) => void
}

const ShopContext = createContext<Shop | null>(null)

const GUEST_CART_KEY = 'rizquna-cart'
const readGuestCart = (): Cart => {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? '{}') as Cart
  } catch {
    return {}
  }
}
const writeGuestCart = (cart: Cart) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart))
  } catch {
    // Storage blocked (private mode): the cart just won't survive a reload.
  }
}

const toLines = (cart: Cart) => Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }))
const fromLines = (lines: { productId: string; quantity: number }[]): Cart =>
  Object.fromEntries(lines.map((l) => [l.productId, l.quantity]))

export function ShopProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [isSeller, setIsSeller] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [cart, setCart] = useState<Cart>(readGuestCart)
  const [favorites, setFavorites] = useState<string[]>([])

  // JSON of the cart as the server last saw it. Saving is skipped when nothing changed.
  const savedCart = useRef<string | null>(null)

  const refreshProducts = useCallback(async () => {
    try {
      const data = await api<{ products: Product[] }>('/product/list')
      setProducts(data.products)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setProductsLoading(false)
    }
  }, [])

  /** Load the server cart, adding anything the user put in the cart before logging in. */
  const loadServerCart = useCallback(async (mergeGuest: boolean) => {
    const { items } = await api<{ items: { productId: string; quantity: number }[] }>('/cart')
    const server = fromLines(items)
    savedCart.current = JSON.stringify(server)
    setCart(mergeGuest ? { ...readGuestCart(), ...server } : server)
    writeGuestCart({})
  }, [])

  const reloadCart = useCallback(() => loadServerCart(false), [loadServerCart])

  const login = useCallback(
    async (u: User) => {
      setUser(u)
      await Promise.all([
        loadServerCart(true),
        api<{ productIds: string[] }>('/favorite').then((d) => setFavorites(d.productIds)),
      ]).catch((err) => toast.error(errorMessage(err)))
    },
    [loadServerCart],
  )

  const logout = useCallback(async () => {
    await api('/user/logout').catch(() => undefined)
    setUser(null)
    savedCart.current = null
    setCart({})
    setFavorites([])
  }, [])

  // Start-up: who is logged in, is the seller logged in, and the product list.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is set after the request resolves
    refreshProducts()
    api<{ user: User | null }>('/user/is-auth')
      .then((d) => (d.user ? login(d.user) : undefined))
      .catch(() => undefined)
      .finally(() => setAuthReady(true))
    api<{ isSeller: boolean }>('/seller/is-auth')
      .then((d) => setIsSeller(d.isSeller))
      .catch(() => setIsSeller(false))
  }, [refreshProducts, login])

  // Persist the cart: to the server when logged in (debounced), else to this browser.
  useEffect(() => {
    if (!user) {
      writeGuestCart(cart)
      return
    }
    const json = JSON.stringify(cart)
    if (savedCart.current === null || json === savedCart.current) return
    const timer = setTimeout(() => {
      api('/cart', { method: 'PUT', body: { items: toLines(cart) } })
        .then(() => {
          savedCart.current = json
        })
        .catch((err) => {
          toast.error(errorMessage(err))
          reloadCart().catch(() => undefined)
        })
    }, 500)
    return () => clearTimeout(timer)
  }, [cart, user, reloadCart])

  const findProduct = useCallback((id: string) => products.find((p) => p.id === id), [products])

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      const stock = findProduct(productId)?.stock ?? 0
      const q = Math.min(Math.max(0, Math.floor(quantity)), stock, 99)
      if (quantity > stock) toast.error(`Stok tersisa ${stock}`)
      setCart((prev) => {
        const next = { ...prev }
        if (q <= 0) delete next[productId]
        else next[productId] = q
        return next
      })
    },
    [findProduct],
  )

  // Shows the change at once and puts it back if the server refuses.
  const toggleFavorite = useCallback(
    (productId: string) => {
      if (!user) {
        toast('Masuk dulu untuk menyimpan favorit')
        setLoginOpen(true)
        return
      }
      const saved = favorites.includes(productId)
      const before = favorites
      setFavorites(saved ? favorites.filter((id) => id !== productId) : [productId, ...favorites])
      api(`/favorite/${productId}`, { method: saved ? 'DELETE' : 'PUT' }).catch((err) => {
        setFavorites(before)
        toast.error(errorMessage(err))
      })
    },
    [user, favorites],
  )

  const value = useMemo<Shop>(() => {
    // Ignore cart lines whose product no longer exists.
    const lines = toLines(cart).flatMap((l) => {
      const p = findProduct(l.productId)
      return p ? [{ ...l, price: p.offerPrice }] : []
    })
    return {
      user,
      authReady,
      isSeller,
      setIsSeller,
      login,
      logout,
      loginOpen,
      setLoginOpen,
      products,
      productsLoading,
      refreshProducts,
      findProduct,
      cart,
      cartCount: lines.reduce((n, l) => n + l.quantity, 0),
      cartTotal: lines.reduce((n, l) => n + l.quantity * l.price, 0),
      setQuantity,
      reloadCart,
      favorites,
      toggleFavorite,
    }
  }, [user, authReady, isSeller, login, logout, loginOpen, products, productsLoading, refreshProducts, findProduct, cart, setQuantity, reloadCart, favorites, toggleFavorite])

  return <ShopContext value={value}>{children}</ShopContext>
}

export function useShop() {
  const ctx = use(ShopContext)
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>')
  return ctx
}
