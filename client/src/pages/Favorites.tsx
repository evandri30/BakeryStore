import { Link } from 'react-router'
import { Shelf } from '../components/Shelf'
import { Button, EmptyState, PageTitle } from '../components/ui'
import { useShop } from '../context/ShopContext'

export default function Favorites() {
  const { user, authReady, setLoginOpen, favorites, findProduct, productsLoading } = useShop()

  if (!authReady || productsLoading) return <p className="py-24 text-center text-cokelat/60">Memuat favorit...</p>
  if (!user) {
    return (
      <EmptyState title="Masuk dulu" action={<Button onClick={() => setLoginOpen(true)}>Masuk atau daftar</Button>}>
        Favorit disimpan di akunmu, jadi bisa dibuka lagi dari HP atau laptop mana saja.
      </EmptyState>
    )
  }

  const saved = favorites.flatMap((id) => findProduct(id) ?? [])
  return (
    <>
      <PageTitle>Favorit saya</PageTitle>
      {saved.length > 0 ? (
        <Shelf products={saved} label="Favorit saya" />
      ) : (
        <EmptyState
          title="Belum ada favorit"
          action={<Link to="/products" className="rounded-full bg-cokelat px-6 py-3 font-semibold text-tepung">Lihat etalase</Link>}
        >
          Tekan tanda hati di foto produk untuk menyimpannya di sini.
        </EmptyState>
      )}
    </>
  )
}
