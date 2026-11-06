// Cart and checkout on one page, in three steps: items, delivery address, payment.
import { useEffect, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { LuTrash2 } from 'react-icons/lu'
import { Link, useNavigate } from 'react-router'
import { Button, EmptyState, PageTitle, QuantityStepper } from '../components/ui'
import { useShop } from '../context/ShopContext'
import { api, errorMessage } from '../lib/api'
import { slugOf } from '../lib/categories'
import { rupiah } from '../lib/format'
import { payWithSnap } from '../lib/midtrans'
import type { Address, PaymentType } from '../lib/types'

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-garis pt-6">
      <h2 className="flex items-baseline gap-3 font-serif text-2xl">
        <span className="font-hand text-3xl text-kraft-tua">{n}.</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function Cart() {
  const { cart, cartTotal, findProduct, productsLoading, setQuantity, user, authReady, setLoginOpen, reloadCart, refreshProducts } = useShop()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [addressId, setAddressId] = useState<string | null>(null)
  const [payment, setPayment] = useState<PaymentType>('COD')
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (!user) return
    api<{ addresses: Address[] }>('/address')
      .then((d) => {
        setAddresses(d.addresses)
        setAddressId((current) => current ?? d.addresses[0]?.id ?? null)
      })
      .catch((err) => toast.error(errorMessage(err)))
  }, [user])

  const lines = Object.entries(cart).flatMap(([id, quantity]) => {
    const product = findProduct(id)
    return product ? [{ product, quantity }] : []
  })
  const overStock = lines.find((l) => l.quantity > l.product.stock)

  if (productsLoading) return <p className="py-24 text-center text-cokelat/60">Memuat keranjang...</p>
  if (lines.length === 0) {
    return (
      <EmptyState title="Keranjang kosong" action={<Link to="/products" className="rounded-full bg-cokelat px-6 py-3 font-semibold text-tepung">Lihat etalase</Link>}>
        Pilih roti atau kue dari etalase, nanti muncul di sini.
      </EmptyState>
    )
  }

  async function placeOrder() {
    if (!addressId) return
    setPlacing(true)
    try {
      const data = await api<{ orderId: string; token?: string }>('/order', {
        body: { addressId, paymentType: payment, items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })) },
      })
      // The server already removed the ordered items from the cart and took the stock.
      await Promise.all([reloadCart(), refreshProducts()])

      if (data.token) {
        const result = await payWithSnap(data.token)
        if (result === 'success') toast.success('Pembayaran berhasil')
        else if (result === 'pending') toast('Pesanan dibuat. Selesaikan pembayaran sesuai instruksi Midtrans.')
        else toast('Pesanan dibuat tapi belum dibayar. Kamu bisa bayar dari halaman Pesanan saya.')
      } else {
        toast.success('Pesanan dibuat. Bayar tunai saat roti sampai.')
      }
      navigate('/my-orders')
    } catch (err) {
      toast.error(errorMessage(err))
      refreshProducts()
    } finally {
      setPlacing(false)
    }
  }

  return (
    <>
      <PageTitle>Keranjang</PageTitle>
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-8">
          <Step n={1} title="Pesanan">
            <ul className="divide-y divide-garis">
              {lines.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-4 py-4">
                  <Link to={`/products/${slugOf(product.category)}/${product.id}`} className="size-20 shrink-0 overflow-hidden rounded-xl bg-adonan">
                    <img src={product.images[0]} alt="" className="size-full object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${slugOf(product.category)}/${product.id}`} className="font-serif text-lg leading-snug hover:underline">
                      {product.name}
                    </Link>
                    <p className="text-sm text-cokelat/60 tabular-nums">{rupiah(product.offerPrice)} / pcs</p>
                    {quantity > product.stock && <p className="text-sm font-semibold text-gosong">Stok tinggal {product.stock}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <QuantityStepper value={quantity} max={product.stock} label={product.name} onChange={(q) => setQuantity(product.id, q)} />
                      <button type="button" onClick={() => setQuantity(product.id, 0)} aria-label={`Hapus ${product.name}`} className="grid size-9 place-items-center rounded-full text-cokelat/50 hover:bg-gosong/10 hover:text-gosong">
                        <LuTrash2 />
                      </button>
                    </div>
                  </div>
                  <p className="font-bold tabular-nums">{rupiah(product.offerPrice * quantity)}</p>
                </li>
              ))}
            </ul>
          </Step>

          <Step n={2} title="Alamat pengiriman">
            {!authReady ? null : !user ? (
              <div className="rounded-xl bg-adonan p-4">
                <p>Masuk dulu supaya kami tahu ke mana roti dikirim.</p>
                <Button className="mt-3" onClick={() => setLoginOpen(true)}>
                  Masuk atau daftar
                </Button>
              </div>
            ) : addresses === null ? (
              <p className="text-cokelat/60">Memuat alamat...</p>
            ) : (
              <fieldset className="space-y-2">
                <legend className="sr-only">Pilih alamat</legend>
                {addresses.map((a) => (
                  <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${a.id === addressId ? 'border-cokelat bg-adonan/50' : 'border-garis'}`}>
                    <input type="radio" name="address" className="mt-1 accent-cokelat" checked={a.id === addressId} onChange={() => setAddressId(a.id)} />
                    <span>
                      <b>
                        {a.firstName} {a.lastName}
                      </b>{' '}
                      <span className="text-cokelat/60">{a.phone}</span>
                      <span className="block text-sm">
                        {a.street}, {a.city}, {a.state} {a.zipcode}
                      </span>
                    </span>
                  </label>
                ))}
                <Link to="/add-address" className="inline-block pt-1 font-semibold text-cokelat underline">
                  {addresses.length === 0 ? 'Tambah alamat pengiriman' : 'Tambah alamat lain'}
                </Link>
              </fieldset>
            )}
          </Step>

          <Step n={3} title="Pembayaran">
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">Metode pembayaran</legend>
              {(
                [
                  ['COD', 'Bayar di tempat', 'Bayar tunai ke kurir saat roti sampai.'],
                  ['ONLINE', 'Bayar online', 'Kartu, e-wallet, atau transfer lewat Midtrans (sandbox).'],
                ] as const
              ).map(([value, title, desc]) => (
                <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${payment === value ? 'border-cokelat bg-adonan/50' : 'border-garis'}`}>
                  <input type="radio" name="payment" className="mt-1 accent-cokelat" checked={payment === value} onChange={() => setPayment(value)} />
                  <span>
                    <b>{title}</b>
                    <span className="block text-sm text-cokelat/70">{desc}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </Step>
        </div>

        <aside className="h-fit rounded-[2rem] bg-adonan p-6 sm:p-8 lg:sticky lg:top-24">
          <h2 className="font-serif text-2xl">Ringkasan</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Harga barang</dt>
              <dd className="tabular-nums">{rupiah(cartTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Ongkir</dt>
              <dd>Gratis</dd>
            </div>
            <div className="flex justify-between border-t border-cokelat/20 pt-3 text-lg font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{rupiah(cartTotal)}</dd>
            </div>
          </dl>
          <Button className="mt-6 w-full py-3" disabled={placing || !user || !addressId || !!overStock} onClick={placeOrder}>
            {placing ? 'Memproses...' : payment === 'COD' ? 'Pesan sekarang' : 'Pesan dan bayar'}
          </Button>
          {/* Say why the button is disabled instead of leaving it silently grey. */}
          <p className="mt-3 text-center text-xs text-cokelat/70">
            {!user
              ? 'Masuk dulu untuk memesan.'
              : !addressId
                ? 'Tambahkan alamat pengiriman dulu.'
                : overStock
                  ? `Kurangi jumlah ${overStock.product.name} sesuai stok.`
                  : 'Stok dicek ulang saat kamu menekan tombol ini.'}
          </p>
        </aside>
      </div>
    </>
  )
}
