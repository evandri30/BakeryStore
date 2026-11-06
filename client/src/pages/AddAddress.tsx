import { useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router'
import { Button, EmptyState, Field, PageTitle } from '../components/ui'
import { useShop } from '../context/ShopContext'
import { api, errorMessage } from '../lib/api'

export default function AddAddress() {
  const { user, setLoginOpen } = useShop()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  if (!user) {
    return (
      <EmptyState title="Masuk dulu" action={<Button onClick={() => setLoginOpen(true)}>Masuk atau daftar</Button>}>
        Alamat disimpan di akunmu, jadi kamu perlu masuk dulu.
      </EmptyState>
    )
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/address', { body: Object.fromEntries(new FormData(e.currentTarget)) })
      toast.success('Alamat tersimpan')
      navigate('/cart')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageTitle>Alamat pengiriman</PageTitle>
      <p className="-mt-3 mb-6 text-cokelat/70">Disimpan di akunmu, jadi pesanan berikutnya tinggal pilih.</p>
      <form onSubmit={submit} className="grid gap-4 rounded-[2rem] border border-garis bg-kertas p-6 sm:grid-cols-2 sm:p-8">
        <Field label="Nama depan" name="firstName" autoComplete="given-name" required />
        <Field label="Nama belakang" name="lastName" autoComplete="family-name" required />
        <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={user.email} required className="sm:col-span-2" />
        <Field label="Nomor HP" name="phone" type="tel" autoComplete="tel" placeholder="081234567890" pattern="\+?\d{8,15}" hint="8 sampai 15 angka, tanpa spasi" required className="sm:col-span-2" />
        <Field label="Alamat" name="street" autoComplete="street-address" placeholder="Nama jalan, nomor rumah, RT/RW" required className="sm:col-span-2" />
        <Field label="Kota" name="city" autoComplete="address-level2" required />
        <Field label="Provinsi" name="state" autoComplete="address-level1" required />
        <Field label="Kode pos" name="zipcode" inputMode="numeric" autoComplete="postal-code" pattern="\d{5}" hint="5 angka" required />
        <Field label="Negara" name="country" autoComplete="country-name" defaultValue="Indonesia" required />
        <div className="flex gap-3 pt-2 sm:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy ? 'Menyimpan...' : 'Simpan alamat'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/cart')}>
            Batal
          </Button>
        </div>
      </form>
    </div>
  )
}
