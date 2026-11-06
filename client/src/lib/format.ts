import type { Order } from './types'

const rupiahFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
export const rupiah = (value: number) => rupiahFormat.format(value)

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
export const longDate = (iso: string) => dateFormat.format(new Date(iso))

export const grams = (g: number) => (g >= 1000 ? `${(g / 1000).toLocaleString('id-ID')} kg` : `${g} gram`)

/** What the customer should read as the order's state. */
export function orderLabel(order: Pick<Order, 'status' | 'isPaid' | 'paymentType'>): { text: string; tone: Tone } {
  if (order.status === 'CANCELLED') return { text: 'Dibatalkan', tone: 'danger' }
  if (order.paymentType === 'ONLINE' && !order.isPaid) return { text: 'Menunggu pembayaran', tone: 'warning' }
  return {
    PROCESSING: { text: 'Diproses', tone: 'neutral' },
    PACKING: { text: 'Dikemas', tone: 'neutral' },
    SHIPPING: { text: 'Dikirim', tone: 'info' },
    DONE: { text: 'Selesai', tone: 'success' },
  }[order.status] as { text: string; tone: Tone }
}

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export const shortId = (id: string) => `#${id.slice(-6).toUpperCase()}`
