// All products, one category, or search results. Filters and sort live in the URL so they can be shared.
import { Link, NavLink, useParams, useSearchParams } from 'react-router'
import { Shelf } from '../components/Shelf'
import { EmptyState, PageTitle } from '../components/ui'
import { useShop } from '../context/ShopContext'
import { categories, categoryBySlug } from '../lib/categories'
import type { Product } from '../lib/types'

const chip = ({ isActive }: { isActive: boolean }) =>
  `rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap ${isActive ? 'border-cokelat bg-cokelat text-tepung' : 'border-garis hover:border-cokelat'}`

// The product list arrives newest first, so "terbaru" keeps that order.
const sorts = {
  terbaru: { label: 'Terbaru', compare: () => 0 },
  termurah: { label: 'Harga termurah', compare: (a: Product, b: Product) => a.offerPrice - b.offerPrice },
  termahal: { label: 'Harga termahal', compare: (a: Product, b: Product) => b.offerPrice - a.offerPrice },
}
type SortKey = keyof typeof sorts
const isSortKey = (v: string | null): v is SortKey => v !== null && v in sorts

export default function Products() {
  const { products, productsLoading } = useShop()
  const { category: slug } = useParams()
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim().toLowerCase() ?? ''
  const sortParam = params.get('sort')
  const sort: SortKey = isSortKey(sortParam) ? sortParam : 'terbaru'
  const category = categoryBySlug(slug)

  const shown = products
    .filter((p) => !category || p.category === category.name)
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    .sort(sorts[sort].compare)
    // Available first, sold-out last (sort is stable, so the chosen order holds within each group).
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0))

  const title = q ? `Hasil untuk "${params.get('q')}"` : (category?.name ?? 'Etalase')

  function setSort(value: string) {
    const next = new URLSearchParams(params)
    if (value === 'terbaru') next.delete('sort')
    else next.set('sort', value)
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageTitle>{title}</PageTitle>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Kategori" className="-mx-4 flex gap-2 overflow-x-auto [scrollbar-width:none] px-4 pb-1 sm:mx-0 sm:px-0">
          <NavLink to={{ pathname: '/products', search: params.toString() && `?${params}` }} end className={chip}>
            Semua
          </NavLink>
          {categories.map((c) => (
            <NavLink key={c.slug} to={{ pathname: `/products/${c.slug}`, search: params.toString() && `?${params}` }} className={chip}>
              {c.name}
            </NavLink>
          ))}
        </nav>
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <span className="text-cokelat/70">Urutkan</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-full border border-garis bg-kertas py-1.5 pr-8 pl-3 font-semibold outline-none focus:border-cokelat"
          >
            {Object.entries(sorts).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {productsLoading ? (
        <p className="py-16 text-center text-cokelat/60">Menata etalase...</p>
      ) : shown.length > 0 ? (
        <Shelf products={shown} label={title} />
      ) : (
        <EmptyState
          title="Belum ada"
          action={
            <Link to="/products" className="font-semibold text-cokelat underline">
              Lihat semua produk
            </Link>
          }
        >
          {q ? 'Tidak ada produk dengan nama itu. Coba kata lain, misalnya "roti" atau "bolu".' : 'Kategori ini sedang kosong.'}
        </EmptyState>
      )}
    </>
  )
}
