import { useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { LuImagePlus, LuX } from 'react-icons/lu'
import { useNavigate } from 'react-router'
import { Button, PageTitle } from '../../components/ui'
import { useShop } from '../../context/ShopContext'
import { api, errorMessage } from '../../lib/api'
import { readProductForm } from '../../lib/productForm'
import { ProductFields } from './ProductForm'

const MAX_IMAGES = 4
const MAX_BYTES = 5 * 1024 * 1024

export default function AddProduct() {
  const { refreshProducts } = useShop()
  const navigate = useNavigate()
  // Preview URLs are made when a file is picked and released when it is removed.
  const [files, setFiles] = useState<{ file: File; url: string }[]>([])
  const [busy, setBusy] = useState(false)

  function addFiles(list: FileList | null) {
    const picked = [...(list ?? [])]
    const tooBig = picked.find((f) => f.size > MAX_BYTES)
    if (tooBig) toast.error(`${tooBig.name} lebih dari 5 MB`)
    const room = MAX_IMAGES - files.length
    const added = picked.filter((f) => f.size <= MAX_BYTES).slice(0, room)
    setFiles([...files, ...added.map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(files[index]?.url ?? '')
    setFiles(files.filter((_, i) => i !== index))
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (files.length === 0) return toast.error('Tambahkan minimal satu foto produk')
    const data = readProductForm(e.currentTarget)
    if (data.offerPrice > data.price) return toast.error('Harga jual tidak boleh lebih dari harga normal')

    const body = new FormData()
    body.append('productData', JSON.stringify(data))
    files.forEach((f) => body.append('images', f.file))

    setBusy(true)
    try {
      await api('/product/add', { form: body })
      await refreshProducts()
      toast.success(`${data.name} ditambahkan`)
      navigate('/seller/products')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageTitle>Tambah produk</PageTitle>
      <form onSubmit={submit} className="space-y-6 rounded-[2rem] border border-garis bg-kertas p-6 sm:p-8">
        <fieldset>
          <legend className="text-sm font-medium">Foto produk (maksimal {MAX_IMAGES}, masing-masing 5 MB)</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {files.map(({ url: src }, i) => (
              <div key={src} className="relative size-24 overflow-hidden rounded-xl bg-adonan">
                <img src={src} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  aria-label={`Hapus foto ${i + 1}`}
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-kertas/90"
                >
                  <LuX />
                </button>
              </div>
            ))}
            {files.length < MAX_IMAGES && (
              <label className="grid size-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-garis text-cokelat hover:border-cokelat">
                <LuImagePlus className="size-7" />
                <span className="sr-only">Pilih foto</span>
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
              </label>
            )}
          </div>
        </fieldset>

        <ProductFields />

        <Button type="submit" disabled={busy}>
          {busy ? 'Mengunggah...' : 'Simpan produk'}
        </Button>
      </form>
    </div>
  )
}
