import { useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router'
import { Button, Modal, PageTitle } from '../../components/ui'
import { useShop } from '../../context/ShopContext'
import { api, errorMessage } from '../../lib/api'
import { rupiah } from '../../lib/format'
import type { Product } from '../../lib/types'
import { readProductForm } from '../../lib/productForm'
import { ProductFields } from './ProductForm'

const LOW_STOCK = 5

function EditProduct({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { refreshProducts } = useShop()
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!product) return
    const data = readProductForm(e.currentTarget)
    if (data.offerPrice > data.price) return toast.error('Harga jual tidak boleh lebih dari harga normal')
    setBusy(true)
    try {
      await api(`/product/${product.id}`, { method: 'PUT', body: data })
      await refreshProducts()
      toast.success('Perubahan disimpan')
      onClose()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={!!product} onClose={onClose} title="Ubah produk">
      <h2 className="font-serif text-2xl">Ubah produk</h2>
      {product && (
        <form onSubmit={submit} className="mt-6 space-y-6">
          <ProductFields product={product} />
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? 'Menyimpan...' : 'Simpan perubahan'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Batal
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default function ProductList() {
  const { products, productsLoading } = useShop()
  const [editing, setEditing] = useState<Product | null>(null)
  const lowStock = products.filter((p) => p.stock <= LOW_STOCK)

  return (
    <>
      <PageTitle aside={<Link to="/seller/products/new" className="rounded-full bg-cokelat px-5 py-2.5 text-sm font-semibold text-tepung">Tambah produk</Link>}>
        Produk
      </PageTitle>

      {lowStock.length > 0 && (
        <p className="mb-6 rounded-xl bg-mentega/20 px-4 py-3 text-sm">
          <b>{lowStock.length} produk</b> stoknya {LOW_STOCK} atau kurang: {lowStock.map((p) => p.name).join(', ')}.
        </p>
      )}

      {productsLoading ? (
        <p className="py-16 text-center text-cokelat/60">Memuat produk...</p>
      ) : (
        <ul className="divide-y divide-garis rounded-2xl border border-garis">
          {products.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-4 p-4">
              <img src={p.images[0]} alt="" className="size-14 shrink-0 rounded-xl bg-adonan object-cover" />
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-bold">{p.name}</p>
                <p className="text-sm text-cokelat/60">{p.category}</p>
              </div>
              <p className="w-28 text-sm tabular-nums">
                {rupiah(p.offerPrice)}
                {p.offerPrice < p.price && <s className="block text-xs text-cokelat/50">{rupiah(p.price)}</s>}
              </p>
              <p className={`w-20 text-sm tabular-nums ${p.stock === 0 ? 'font-bold text-gosong' : p.stock <= LOW_STOCK ? 'font-semibold text-gosong' : ''}`}>
                {p.stock === 0 ? 'Habis' : `Stok ${p.stock}`}
              </p>
              <Button variant="secondary" onClick={() => setEditing(p)}>
                Ubah
              </Button>
            </li>
          ))}
        </ul>
      )}

      <EditProduct product={editing} onClose={() => setEditing(null)} />
    </>
  )
}
