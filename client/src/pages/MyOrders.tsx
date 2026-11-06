import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router'
import { Badge, Button, EmptyState, PageTitle } from '../components/ui'
import { useShop } from '../context/ShopContext'
import { api, errorMessage } from '../lib/api'
import { longDate, orderLabel, rupiah, shortId } from '../lib/format'
import { payWithSnap } from '../lib/midtrans'
import type { Order, OrderStatus } from '../lib/types'

const timeline: { status: OrderStatus; label: string }[] = [
  { status: 'PROCESSING', label: 'Dipesan' },
  { status: 'PACKING', label: 'Dikemas' },
  { status: 'SHIPPING', label: 'Dikirim' },
  { status: 'DONE', label: 'Selesai' },
]

/** Where the order is on its way from our oven to the customer's door. */
function StatusTimeline({ status }: { status: OrderStatus }) {
  const current = timeline.findIndex((t) => t.status === status)
  return (
    <ol className="mt-5 grid grid-cols-4" aria-label="Perjalanan pesanan">
      {timeline.map((t, i) => {
        const reached = i <= current
        return (
          <li key={t.status} className="relative flex flex-col items-center text-center text-xs" aria-current={i === current ? 'step' : undefined}>
            {/* the line to the previous step */}
            {i > 0 && <span aria-hidden className={`absolute top-2 right-1/2 h-0.5 w-full ${reached ? 'bg-cokelat' : 'bg-garis'}`} />}
            <span aria-hidden className={`relative size-4 rounded-full border-2 ${reached ? 'border-cokelat bg-cokelat' : 'border-garis bg-tepung'}`} />
            <span className={`mt-1.5 ${i === current ? 'font-bold' : reached ? '' : 'text-cokelat/50'}`}>{t.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

const awaitingPayment = (o: Order) => o.paymentType === 'ONLINE' && !o.isPaid && o.status !== 'CANCELLED'

function OrderCard({ order, onChange }: { order: Order; onChange: (o: Order) => void }) {
  const label = orderLabel(order)
  const [busy, setBusy] = useState(false)
  const [confirmSwitch, setConfirmSwitch] = useState(false)
  // The kitchen has not started on it and nothing was paid: the method can still change.
  const canSwitch = !order.isPaid && order.status === 'PROCESSING'
  const switchTo = order.paymentType === 'COD' ? 'ONLINE' : 'COD'

  async function payWith(token: string) {
    await payWithSnap(token)
    const { order: updated } = await api<{ order: Order }>(`/order/${order.id}/check-payment`, { method: 'POST' })
    onChange(updated)
    if (updated.isPaid) toast.success('Pembayaran diterima')
  }

  async function pay() {
    if (!order.snapToken) return
    setBusy(true)
    try {
      await payWith(order.snapToken)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function switchPayment() {
    setBusy(true)
    setConfirmSwitch(false)
    try {
      const { order: updated } = await api<{ order: Order }>(`/order/${order.id}/payment-method`, { body: { paymentType: switchTo } })
      onChange(updated)
      if (updated.paymentType === 'COD') {
        toast.success('Diganti ke bayar di tempat. Siapkan uang tunai saat roti sampai.')
      } else if (updated.snapToken) {
        toast('Diganti ke bayar online. Selesaikan dalam 60 menit.')
        await payWith(updated.snapToken)
      }
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-[2rem] border border-garis bg-kertas p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-serif text-xl">Pesanan {shortId(order.id)}</p>
          <p className="text-sm text-cokelat/60">
            {longDate(order.createdAt)}, {order.paymentType === 'COD' ? 'bayar di tempat' : 'bayar online'}
          </p>
        </div>
        <Badge tone={label.tone}>{label.text}</Badge>
      </div>

      {order.status !== 'CANCELLED' && !awaitingPayment(order) && <StatusTimeline status={order.status} />}

      <ul className="mt-4 space-y-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <img src={item.product.images[0]} alt="" className="size-14 shrink-0 rounded-xl bg-adonan object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{item.product.name}</span>
              <span className="text-sm text-cokelat/60 tabular-nums">
                {item.quantity} x {rupiah(item.unitPrice)}
              </span>
            </span>
            <span className="font-semibold tabular-nums">{rupiah(item.quantity * item.unitPrice)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-garis pt-4">
        <p className="text-sm text-cokelat/70">
          Dikirim ke {order.address.street}, {order.address.city}
        </p>
        <p className="text-lg font-bold tabular-nums">{rupiah(order.amount)}</p>
      </div>

      {awaitingPayment(order) && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-mentega/20 p-3 text-sm">
          <span className="flex-1">Selesaikan pembayaran dalam 60 menit, setelah itu pesanan batal otomatis.</span>
          {order.snapToken && (
            <Button onClick={pay} disabled={busy}>
              {busy ? 'Membuka...' : 'Bayar sekarang'}
            </Button>
          )}
        </div>
      )}

      {canSwitch && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {confirmSwitch ? (
            <>
              <span className="text-cokelat/80">
                {switchTo === 'COD'
                  ? 'Pembayaran online yang sedang terbuka akan ditutup. Lanjut?'
                  : 'Kamu akan bayar online sekarang, dalam 60 menit. Lanjut?'}
              </span>
              <Button variant="secondary" onClick={switchPayment} disabled={busy}>
                {switchTo === 'COD' ? 'Ya, bayar di tempat' : 'Ya, bayar online'}
              </Button>
              <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setConfirmSwitch(false)}>
                Batal
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} className="font-semibold underline underline-offset-4 disabled:opacity-50" onClick={() => setConfirmSwitch(true)}>
              {switchTo === 'COD' ? 'Ganti ke bayar di tempat' : 'Ganti ke bayar online'}
            </button>
          )}
        </div>
      )}
    </li>
  )
}

export default function MyOrders() {
  const { user, authReady, setLoginOpen } = useShop()
  const [orders, setOrders] = useState<Order[] | null>(null)

  const load = useCallback(async () => {
    try {
      const { orders } = await api<{ orders: Order[] }>('/order/mine')
      setOrders(orders)
      // Ask Midtrans about orders still waiting, in case its notification never reached us.
      const waiting = orders.filter(awaitingPayment)
      if (waiting.length === 0) return
      const updated = await Promise.all(
        waiting.map((o) => api<{ order: Order }>(`/order/${o.id}/check-payment`, { method: 'POST' }).then((d) => d.order)),
      )
      setOrders((prev) => prev?.map((o) => updated.find((u) => u.id === o.id) ?? o) ?? null)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is set after the request resolves
    if (user) load()
  }, [user, load])

  if (!authReady) return null
  if (!user) {
    return (
      <EmptyState title="Masuk dulu" action={<Button onClick={() => setLoginOpen(true)}>Masuk</Button>}>
        Pesananmu tersimpan di akun.
      </EmptyState>
    )
  }

  return (
    <div className="max-w-3xl">
      <PageTitle>Pesanan saya</PageTitle>
      {orders === null ? (
        <p className="py-16 text-center text-cokelat/60">Memuat pesanan...</p>
      ) : orders.length === 0 ? (
        <EmptyState title="Belum ada pesanan" action={<Link to="/products" className="rounded-full bg-cokelat px-6 py-3 font-semibold text-tepung">Lihat etalase</Link>}>
          Pesanan yang kamu buat akan muncul di sini.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} onChange={(u) => setOrders((prev) => prev?.map((x) => (x.id === u.id ? u : x)) ?? null)} />
          ))}
        </ul>
      )}
    </div>
  )
}
