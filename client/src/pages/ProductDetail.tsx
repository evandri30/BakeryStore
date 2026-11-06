import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router'
import { FavoriteButton } from '../components/FavoriteButton'
import { PriceTag, Shelf } from '../components/Shelf'
import { Button, EmptyState, QuantityStepper } from '../components/ui'
import { useShop } from '../context/ShopContext'
import { slugOf } from '../lib/categories'
import { grams, longDate } from '../lib/format'

function ProductDetail() {
  const { id } = useParams() as { id: string }
  const { findProduct, products, productsLoading, cart, setQuantity } = useShop()
  const navigate = useNavigate()
  const product = findProduct(id)
  const [imageIndex, setImageIndex] = useState(0)
  const [qty, setQty] = useState(1)

  if (productsLoading) return <p className="py-24 text-center text-cokelat/60">Memuat produk...</p>
  if (!product) {
    return (
      <EmptyState title="Produk tidak ada" action={<Link to="/products" className="font-semibold text-cokelat underline">Kembali ke etalase</Link>}>
        Produk ini mungkin sudah tidak dijual.
      </EmptyState>
    )
  }

  const inCart = cart[product.id] ?? 0
  const canAdd = Math.max(0, product.stock - inCart)
  const soldOut = product.stock <= 0
  const related = products.filter((p) => p.category === product.category && p.id !== product.id && p.stock > 0).slice(0, 4)

  function addToCart(goToCart: boolean) {
    if (!product) return
    setQuantity(product.id, inCart + Math.min(qty, canAdd))
    if (goToCart) navigate('/cart')
    else toast.success(`${product.name} masuk keranjang`)
    setQty(1)
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="pt-6 text-sm text-cokelat/60">
        <Link to="/products" className="hover:text-cokelat">
          Etalase
        </Link>
        {' / '}
        <Link to={`/products/${slugOf(product.category)}`} className="hover:text-cokelat">
          {product.category}
        </Link>
      </nav>

      <div className="mt-4 grid gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-adonan sm:aspect-square">
            <img src={product.images[imageIndex] ?? product.images[0]} alt={product.name} className={`size-full object-cover ${soldOut ? 'opacity-50 grayscale' : ''}`} />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {product.images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`Gambar ${i + 1}`}
                  aria-pressed={i === imageIndex}
                  className={`size-20 overflow-hidden rounded-xl bg-adonan ${i === imageIndex ? 'ring-2 ring-cokelat ring-offset-2 ring-offset-tepung' : 'opacity-70 hover:opacity-100'}`}
                >
                  <img src={src} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-kraft-tua">{product.category}</p>
          <h1 className="mt-1 font-serif text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          <div className="mt-5">
            <PriceTag product={product} size="lg" />
          </div>

          <ul className="mt-8 space-y-2 text-lg">
            {product.description.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-kraft" />
                {line}
              </li>
            ))}
          </ul>

          <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-2xl bg-adonan px-5 py-4 text-sm">
            <dt className="text-cokelat/60">Berat</dt>
            <dd>{grams(product.massGrams)}</dd>
            {product.expiredAt && (
              <>
                <dt className="text-cokelat/60">Baik dikonsumsi sebelum</dt>
                <dd>{longDate(product.expiredAt)}</dd>
              </>
            )}
            <dt className="text-cokelat/60">Stok</dt>
            <dd className={product.stock <= 5 ? 'font-semibold text-gosong' : ''}>{soldOut ? 'Habis' : product.stock}</dd>
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {soldOut ? (
              <p className="flex-1 rounded-xl bg-gosong/10 px-4 py-3 font-semibold text-gosong">Stok habis. Simpan dulu, coba lagi besok pagi.</p>
            ) : canAdd === 0 ? (
              <p className="flex-1 rounded-xl bg-adonan px-4 py-3">
                Semua stok sudah ada di <Link to="/cart" className="font-semibold text-cokelat underline">keranjangmu</Link>.
              </p>
            ) : (
              <>
                <QuantityStepper value={qty} max={canAdd} label={product.name} onChange={(v) => setQty(Math.max(1, v))} />
                <Button variant="secondary" onClick={() => addToCart(false)}>
                  Tambah ke keranjang
                </Button>
                <Button onClick={() => addToCart(true)}>Beli sekarang</Button>
              </>
            )}
            <FavoriteButton product={product} />
          </div>
          {inCart > 0 && canAdd > 0 && <p className="mt-3 text-sm text-cokelat/60">{inCart} sudah ada di keranjang.</p>}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 font-serif text-3xl">{product.category} lainnya</h2>
          <Shelf products={related} label={`${product.category} lainnya`} />
        </section>
      )}
    </>
  )
}

// Keyed by id so the image and quantity reset when moving to another product.
export default function ProductDetailPage() {
  const { id = '' } = useParams()
  return <ProductDetail key={id} />
}
