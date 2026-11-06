import { Link } from 'react-router'
import { EmptyState } from '../components/ui'

export default function NotFound() {
  return (
    <EmptyState title="Halaman tidak ada" action={<Link to="/" className="rounded-full bg-cokelat px-6 py-3 font-semibold text-tepung">Ke beranda</Link>}>
      Alamat ini tidak ditemukan. Mungkin salah ketik, atau halamannya sudah dipindah.
    </EmptyState>
  )
}
