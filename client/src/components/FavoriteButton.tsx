import { LuHeart } from 'react-icons/lu'
import { useShop } from '../context/ShopContext'
import type { Product } from '../lib/types'

/** Heart to save a product. Round and filled on a photo, outlined next to the buy buttons. */
export function FavoriteButton({ product, onPhoto = false }: { product: Product; onPhoto?: boolean }) {
  const { favorites, toggleFavorite } = useShop()
  const saved = favorites.includes(product.id)
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(product.id)}
      aria-pressed={saved}
      aria-label={saved ? `Hapus ${product.name} dari favorit` : `Simpan ${product.name} ke favorit`}
      title={saved ? 'Hapus dari favorit' : 'Simpan ke favorit'}
      className={`grid shrink-0 place-items-center rounded-full transition-colors ${
        onPhoto ? 'size-9 bg-white/85 text-[#4a2c1d] shadow-sm backdrop-blur hover:bg-white' : 'size-11 border border-garis hover:border-cokelat'
      }`}
    >
      <LuHeart className={`size-5 ${saved ? 'fill-gosong text-gosong' : ''}`} />
    </button>
  )
}
