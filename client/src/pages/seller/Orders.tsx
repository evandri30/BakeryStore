import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Badge, Button, PageTitle } from '../../components/ui'
import { useShop } from '../../context/ShopContext'
import { api, errorMessage } from '../../lib/api'
import { longDate, orderLabel, rupiah, shortId } from '../../lib/format'
import type { Order, OrderStatus } from '../../lib/types'

const filters: { status: OrderStatus | 'ALL'; label: string }[] = [
  { status: 'ALL', label: 'Semua' },
  { status: 'PROCESSING', label: 'Diproses' },
  { status: 'PACKING', label: 'Dikemas' },
  { status: 'SHIPPING', label: 'Dikirim' },
  { status: 'DONE', label: 'Selesai' },
  { status: 'CANCELLED', label: 'Dibatalkan' },
]

// The one next step for each status, named by what the seller does.
const nextStep: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  PROCESSING: { status: 'PACKING', label: 'Mulai kemas' },
  PACKING: { status: 'SHIPPING', label: 'Kirim' },
  SHIPPING: { status: 'DONE', label: 'Tandai selesai' },
}

export default function SellerOrders() {
  const { refreshProducts } = useShop()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  useEffect(() => {
    api<{ orders: Order[] }>('/order/seller')
      .then((d) => setOrders(d.orders))
      .catch((err) => toast.error(errorMessage(err)))
  }, [])

  async function changeStatus(order: Order, status: OrderStatus) {
    setBusyId(order.id)
    setConfirmCancel(null)
    try {
      const { order: updated } = await api<{ order: Order }>(`/order/${order.id}/status`, { method: 'PATCH', body: { status } })
      setOrders((prev) => prev?.map((o) => (o.id === updated.id ? updated : o)) ?? null)
      if (status === 'CANCELLED') refreshProducts() // stock came back
      toast.success(`Pesanan ${shortId(order.id)}: ${orderLabel(updated).text.toLowerCase()}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const count = (s: OrderStatus | 'ALL') => orders?.filter((o) => s === 'ALL' || o.status === s).length ?? 0
  const shown = orders?.filter((o) => filter === 'ALL' || o.status === filter) ?? []

  return (
    <>
      <PageTitle>Pesanan</PageTitle>
      <div role="tablist" aria-label="Filter status" className="-mx-4 mb-6 flex gap-2 overflow-x-auto [scrollbar-width:none] px-4 pb-1 sm:mx-0 sm:px-0">
        {filters.map((f) => (
          <button
            key={f.status}
            role="tab"
            type="button"
            aria-selected={filter === f.status}
            onClick={() => setFilter(f.status)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap ${filter === f.status ? 'border-cokelat bg-cokelat text-tepung' : 'border-garis'}`}
          >
            {f.label} <span className="tabular-nums opacity-70">{count(f.status)}</span>
          </button>
        ))}
      </div>

      {orders === null ? (
        <p className="py-16 text-center text-cokelat/60">Memuat pesanan...</p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl bg-adonan py-16 text-center">Tidak ada pesanan dengan status ini.</p>
      ) : (
        <ul className="space-y-4">
          {shown.map((o) => {
            const label = orderLabel(o)
            const next = nextStep[o.status]
            const canCancel = !o.isPaid && o.status !== 'DONE' && o.status !== 'CANCELLED'
            return (
              <li key={o.id} className="grid gap-4 rounded-[2rem] border border-garis bg-kertas p-5 sm:p-6 lg:grid-cols-[1fr_1fr_10rem]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="font-serif text-lg font-normal">{shortId(o.id)}</b>
                    <Badge tone={label.tone}>{label.text}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-cokelat/60">{longDate(o.createdAt)}</p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {o.items.map((i) => (
                      <li key={i.id}>
                        <span className="font-semibold tabular-nums">{i.quantity}x</span> {i.product.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">
                    {o.address.firstName} {o.address.lastName}
                  </p>
                  <p>{o.address.phone}</p>
                  <p className="text-cokelat/70">
                    {o.address.street}, {o.address.city}, {o.address.state} {o.address.zipcode}
                  </p>
                  <p className="mt-2">
                    <b className="tabular-nums">{rupiah(o.amount)}</b>, {o.paymentType === 'COD' ? 'bayar di tempat' : 'online'}
                    {o.isPaid ? ' (lunas)' : ' (belum lunas)'}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:flex-col lg:items-stretch">
                  {next && (
                    <Button disabled={busyId === o.id} onClick={() => changeStatus(o, next.status)}>
                      {next.label}
                    </Button>
                  )}
                  {canCancel && (
                    // Two taps to cancel: cancelling gives the stock back and cannot be undone.
                    <Button
                      variant="danger"
                      disabled={busyId === o.id}
                      onClick={() => (confirmCancel === o.id ? changeStatus(o, 'CANCELLED') : setConfirmCancel(o.id))}
                    >
                      {confirmCancel === o.id ? 'Ya, batalkan' : 'Batalkan'}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
