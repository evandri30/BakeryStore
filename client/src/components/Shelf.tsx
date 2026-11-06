// Products as photos with a handwritten kraft-paper price label taped to the corner.
import { LuPlus } from 'react-icons/lu'
import { Link } from 'react-router'
import { useShop } from '../context/ShopContext'
import { slugOf } from '../lib/categories'
import { rupiah } from '../lib/format'
import type { Product } from '../lib/types'
import { FavoriteButton } from './FavoriteButton'
import { QuantityStepper } from './ui'

/** Price written by hand on a scrap of kraft paper, held by a strip of tape. */
export function PriceTag({ product, size = 'sm' }: { product: Product; size?: 'sm' | 'lg' }) {
  const discounted = product.offerPrice < product.price
  return (
    <span
      className={`relative inline-flex -rotate-2 flex-col items-start bg-kraft font-hand leading-none text-tinta shadow-[2px_3px_0_rgb(46_26_16/0.18)] ${
        size === 'lg' ? 'px-4 pt-3 pb-2 text-3xl' : 'px-2.5 pt-2 pb-1.5 text-lg'
      }`}
    >
      {/* the tape */}
      <span aria-hidden className="absolute -top-2 left-1/2 h-3.5 w-10 -translate-x-1/2 rotate-3 bg-white/60" />
      <span className="tabular-nums">{rupiah(product.offerPrice)}</span>
      {discounted && (
        <s className={`mt-0.5 font-sans font-semibold tabular-nums opacity-70 ${size === 'lg' ? 'text-sm' : 'text-[11px]'}`}>
          <span className="sr-only">Harga normal </span>
          {rupiah(product.price)}
        </s>
      )}
    </span>
  )
}

export function ProductCard({ product }: { product: Product }) {
  const { cart, setQuantity } = useShop()
  const inCart = cart[product.id] ?? 0
  const soldOut = product.stock <= 0
  const href = `/products/${slugOf(product.category)}/${product.id}`

  return (
    <li className="relative flex flex-col">
      <Link to={href} className="group relative block">
        <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-adonan">
          <img
            src={product.images[0]}
            alt=""
            loading="lazy"
            className={`size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${soldOut ? 'opacity-50 grayscale' : ''}`}
          />
        </div>
        <span className="absolute top-4 left-3">
          <PriceTag product={product} />
        </span>
        {soldOut && (
          <span className="absolute right-3 bottom-3 rounded-full bg-gosong px-3 py-1 text-xs font-bold text-white">Habis hari ini</span>
        )}
        <h3 className="mt-3 font-serif text-lg leading-snug group-hover:underline">{product.name}</h3>
      </Link>
      {/* Outside the link, so saving a product does not open it. */}
      <span className="absolute top-3 right-3">
        <FavoriteButton product={product} onPhoto />
      </span>
      <p className="text-sm text-cokelat/60">
        {product.category}
        {!soldOut && product.stock <= 5 && <span className="font-semibold text-gosong">, tinggal {product.stock}</span>}
      </p>

      <div className="mt-auto pt-3">
        {soldOut ? null : inCart > 0 ? (
          <QuantityStepper value={inCart} max={product.stock} label={product.name} onChange={(q) => setQuantity(product.id, q)} />
        ) : (
          <button
            type="button"
            onClick={() => setQuantity(product.id, 1)}
            aria-label={`Tambah ${product.name} ke keranjang`}
            className="inline-flex items-center gap-1.5 rounded-full bg-cokelat py-2 pr-4 pl-3 text-sm font-semibold text-tepung transition-colors hover:bg-cokelat-tua"
          >
            <LuPlus aria-hidden /> Tambah
          </button>
        )}
      </div>
    </li>
  )
}

export function Shelf({ products, label }: { products: Product[]; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  )
}
