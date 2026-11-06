import { Link } from 'react-router'
import { Shelf } from '../components/Shelf'
import { useShop } from '../context/ShopContext'
import { categories } from '../lib/categories'

const steps = [
  { title: 'Pilih dari etalase', text: 'Tambahkan roti dan kue ke keranjang. Stok yang tampil adalah stok hari ini.' },
  { title: 'Isi alamat', text: 'Simpan alamat sekali, lalu pilih saat memesan berikutnya.' },
  { title: 'Bayar di tempat atau online', text: 'Bayar tunai ke kurir, atau lewat Midtrans. Metodenya bisa diganti selama pesanan belum dikemas.' },
]

export default function Home() {
  const { products, productsLoading } = useShop()
  const fresh = products.filter((p) => p.stock > 0).slice(0, 8)

  return (
    <>
      <section className="grid items-center gap-8 pt-8 pb-4 md:grid-cols-[1.05fr_1fr] md:gap-12 md:pt-14">
        <div className="relative md:order-2">
          <img
            src="/products/croissant.webp"
            alt="Croissant mentega yang baru keluar dari oven"
            className="aspect-[4/3] w-full rounded-[2rem] object-cover md:aspect-[4/5]"
          />
          {/* A handwritten note stuck on the photo, like a label on the bakery counter. */}
          <p className="absolute -bottom-5 left-5 max-w-56 -rotate-2 bg-kraft px-4 pt-3 pb-2 font-hand text-xl leading-tight text-tinta shadow-[2px_3px_0_rgb(46_26_16/0.18)] sm:left-auto sm:right-6">
            Baru keluar dari oven jam 6 pagi tadi
          </p>
        </div>

        <div className="pt-4 md:order-1 md:pt-0">
          <h1 className="font-serif text-[clamp(2.6rem,6vw,4.5rem)] leading-[1.02]">Roti hangat dari dapur rumah kami.</h1>
          <p className="mt-6 max-w-md text-lg text-cokelat/80">
            Roti tawar, brownies, donat, puding, dan bolu yang dipanggang setiap pagi dalam jumlah kecil. Pesan hari ini, sampai di rumahmu hari ini.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/products" className="rounded-full bg-cokelat px-7 py-3.5 font-semibold text-tepung hover:bg-cokelat-tua">
              Lihat etalase
            </Link>
            <a href="#cara-pesan" className="font-semibold underline underline-offset-4">
              Cara pesan
            </a>
          </div>
        </div>
      </section>

      <nav aria-label="Kategori" className="mt-16">
        <ul className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:justify-between sm:px-0">
          {categories.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link to={`/products/${c.slug}`} className="group flex w-24 flex-col items-center gap-2 text-center sm:w-32">
                <img src={c.image} alt="" className="size-20 rounded-full object-cover ring-2 ring-garis transition group-hover:ring-kraft sm:size-28" />
                <span className="text-sm font-semibold group-hover:underline">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl sm:text-4xl">Baru keluar dari oven</h2>
          <Link to="/products" className="shrink-0 text-sm font-semibold underline underline-offset-4">
            Semua produk
          </Link>
        </div>
        {productsLoading ? <p className="py-16 text-center text-cokelat/60">Menata etalase...</p> : <Shelf products={fresh} label="Produk hari ini" />}
      </section>

      <section id="cara-pesan" className="mt-24 scroll-mt-24 rounded-[2rem] bg-adonan px-6 py-12 sm:px-12">
        <h2 className="font-serif text-3xl sm:text-4xl">Cara pesan</h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="font-hand text-4xl text-kraft-tua">{i + 1}.</span>
              <h3 className="mt-1 font-serif text-xl">{s.title}</h3>
              <p className="mt-2 text-cokelat/75">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-24 grid items-center gap-8 md:grid-cols-2 md:gap-14">
        <img src="/products/dapur.webp" alt="Tukang roti di depan oven kayu dengan roti yang baru dipanggang" loading="lazy" className="aspect-[4/3] w-full rounded-[2rem] object-cover" />
        <div>
          <h2 className="font-serif text-3xl sm:text-4xl">Dari dapur kecil kami</h2>
          <p className="mt-5 text-lg text-cokelat/80">
            Rizquna berawal dari dapur rumah: satu oven, resep keluarga, dan tetangga yang setiap pagi mampir menanyakan roti tawar. Sampai
            sekarang kami tetap memanggang sedikit demi sedikit, supaya yang sampai ke rumahmu masih hangat.
          </p>
          <p className="mt-4 text-sm text-cokelat/60">Rizquna Bakery adalah toko fiksi untuk portfolio. Ceritanya hanya contoh.</p>
        </div>
      </section>
    </>
  )
}
