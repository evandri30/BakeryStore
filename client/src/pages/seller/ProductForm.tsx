// Fields shared by "Tambah produk" and the edit dialog.
import { Field } from '../../components/ui'
import { categories } from '../../lib/categories'
import type { Product } from '../../lib/types'

export function ProductFields({ product }: { product?: Product }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nama produk" name="name" defaultValue={product?.name} required maxLength={120} className="sm:col-span-2" />
      <label className="block text-sm sm:col-span-2">
        <span className="font-medium">Deskripsi</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={product?.description.join('\n')}
          className="mt-1 block w-full rounded-lg border border-garis px-3 py-2.5 text-base outline-none focus:border-cokelat sm:text-sm"
        />
        <span className="mt-1 block text-xs text-cokelat/60">Satu poin per baris</span>
      </label>
      <label className="block text-sm">
        <span className="font-medium">Kategori</span>
        <select name="category" defaultValue={product?.category ?? categories[0].name} className="mt-1 block w-full rounded-lg border border-garis bg-kertas px-3 py-2.5 text-base outline-none focus:border-cokelat sm:text-sm">
          {categories.map((c) => (
            <option key={c.slug}>{c.name}</option>
          ))}
        </select>
      </label>
      <Field label="Berat (gram)" name="massGrams" type="number" min={1} step={1} defaultValue={product?.massGrams} required />
      <Field label="Harga normal (Rp)" name="price" type="number" min={0} step={1} defaultValue={product?.price} required />
      <Field label="Harga jual (Rp)" name="offerPrice" type="number" min={0} step={1} defaultValue={product?.offerPrice} hint="Sama dengan harga normal kalau tidak ada diskon" required />
      <Field label="Stok" name="stock" type="number" min={0} step={1} defaultValue={product?.stock ?? 0} required />
      <Field label="Baik dikonsumsi sebelum" name="expiredAt" type="date" defaultValue={product?.expiredAt?.slice(0, 10)} hint="Boleh dikosongkan" />
    </div>
  )
}
