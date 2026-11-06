// The seller's first screen: what sold, what needs doing, what is running out.
import { useEffect, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router'
import { PageTitle } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import { rupiah } from '../../lib/format'

type Day = { day: string; revenue: number; orders: number }
type Summary = {
  today: Day
  week: { revenue: number; orders: number }
  daily: Day[]
  waiting: { PROCESSING: number; PACKING: number; SHIPPING: number }
  topProducts: { id: string; name: string; image: string | null; sold: number }[]
  lowStock: { id: string; name: string; stock: number; image: string | null }[]
}

// Days arrive as "YYYY-MM-DD" in Jakarta time; read them as plain calendar dates.
const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const asDate = (day: string) => new Date(`${day}T00:00:00Z`)
const compactRupiah = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : n >= 1000 ? `${Math.round(n / 1000)} rb` : String(n))

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[2rem] border border-garis bg-kertas p-5 sm:p-6">
      <p className="text-sm text-cokelat/70">{label}</p>
      <p className="mt-1 font-serif text-3xl tabular-nums sm:text-4xl">{value}</p>
      <p className="mt-1 text-sm text-cokelat/60">{note}</p>
    </div>
  )
}

/** Revenue per day for the last 7 days. One series, so no legend: the heading names it. */
function RevenueChart({ daily }: { daily: Day[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(...daily.map((d) => d.revenue), 1)
  const best = daily.reduce((b, d, i) => (d.revenue > (daily[b]?.revenue ?? 0) ? i : b), 0)

  return (
    <figure className="rounded-[2rem] border border-garis bg-kertas p-5 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl">Pendapatan 7 hari</h2>
        <span className="text-sm text-cokelat/60">Pesanan lunas, per hari (WIB)</span>
      </figcaption>

      {/* No y-axis: the best day carries its value, every bar shows its own on hover or focus. */}
      <div className="relative mt-10 grid h-52 grid-cols-7 items-end gap-2 border-b border-garis sm:gap-4" onMouseLeave={() => setActive(null)}>
        {daily.map((d, i) => {
          const height = d.revenue === 0 ? 0 : Math.max(2, (d.revenue / max) * 100)
          const isToday = i === daily.length - 1
          return (
            // The whole column is the hover target, wider and taller than the bar itself.
            <button
              key={d.day}
              type="button"
              aria-label={`${fullDate.format(asDate(d.day))}: ${rupiah(d.revenue)}, ${d.orders} pesanan`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="relative flex h-full items-end justify-center outline-offset-4"
            >
              <span
                className={`w-full max-w-10 rounded-t-[4px] transition-opacity ${isToday ? 'bg-cokelat' : 'bg-cokelat/55'} ${active !== null && active !== i ? 'opacity-40' : ''}`}
                style={{ height: `${height}%` }}
              />
              {/* direct label on the best day only, not on every bar */}
              {i === best && d.revenue > 0 && active === null && (
                <span className="absolute text-xs font-semibold tabular-nums" style={{ bottom: `calc(${height}% + 4px)` }}>
                  {compactRupiah(d.revenue)}
                </span>
              )}
              {active === i && (
                <span
                  role="presentation"
                  // Edge columns open inward so the tooltip never leaves the card on a phone.
                  className={`absolute z-10 w-max rounded-xl border border-garis bg-tepung px-3 py-2 text-left text-xs shadow-lg ${
                    i < 2 ? 'left-0' : i > 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                  }`}
                  style={{ bottom: `calc(${height}% + 8px)` }}
                >
                  <span className="block text-cokelat/70">{fullDate.format(asDate(d.day))}</span>
                  <b className="block text-sm tabular-nums">{rupiah(d.revenue)}</b>
                  <span className="text-cokelat/70">{d.orders} pesanan</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div aria-hidden className="mt-2 grid grid-cols-7 gap-2 text-center text-xs text-cokelat/60 sm:gap-4">
        {daily.map((d, i) => (
          <span key={d.day} className={i === daily.length - 1 ? 'font-bold text-cokelat' : ''}>
            {i === daily.length - 1 ? 'Hari ini' : weekday.format(asDate(d.day))}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Pendapatan per hari</caption>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Pendapatan</th>
            <th>Pesanan</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((d) => (
            <tr key={d.day}>
              <td>{fullDate.format(asDate(d.day))}</td>
              <td>{rupiah(d.revenue)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function ProductRow({ image, name, aside }: { image: string | null; name: string; aside: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      {image ? <img src={image} alt="" className="size-11 shrink-0 rounded-xl bg-adonan object-cover" /> : <span className="size-11 shrink-0 rounded-xl bg-adonan" />}
      <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
      {aside}
    </li>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    api<{ summary: Summary }>('/seller/summary')
      .then((d) => setSummary(d.summary))
      .catch((err) => toast.error(errorMessage(err)))
  }, [])

  if (!summary) return <p className="py-24 text-center text-cokelat/60">Menghitung penjualan...</p>
  const { today, week, waiting } = summary
  const toDo = waiting.PROCESSING + waiting.PACKING + waiting.SHIPPING

  return (
    <>
      <PageTitle>Dashboard</PageTitle>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pendapatan hari ini" value={rupiah(today.revenue)} note={`${today.orders} pesanan lunas`} />
        <Stat label="7 hari terakhir" value={rupiah(week.revenue)} note={`${week.orders} pesanan lunas`} />
        <Link to="/seller/orders" className="block rounded-[2rem] transition-colors hover:[&>div]:border-cokelat">
          <Stat
            label="Perlu ditangani"
            value={String(toDo)}
            note={`${waiting.PROCESSING} diproses, ${waiting.PACKING} dikemas, ${waiting.SHIPPING} dikirim`}
          />
        </Link>
      </div>

      <div className="mt-4">
        <RevenueChart daily={summary.daily} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-garis bg-kertas p-5 sm:p-6">
          <h2 className="font-serif text-2xl">Paling laris</h2>
          {summary.topProducts.length === 0 ? (
            <p className="mt-3 text-cokelat/60">Belum ada penjualan.</p>
          ) : (
            <ol className="mt-3 divide-y divide-garis">
              {summary.topProducts.map((p) => (
                <ProductRow key={p.id} image={p.image} name={p.name} aside={<span className="text-sm tabular-nums text-cokelat/70">{p.sold} terjual</span>} />
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-[2rem] border border-garis bg-kertas p-5 sm:p-6">
          <h2 className="font-serif text-2xl">Stok menipis</h2>
          {summary.lowStock.length === 0 ? (
            <p className="mt-3 text-cokelat/60">Semua stok aman (lebih dari 5).</p>
          ) : (
            <ul className="mt-3 divide-y divide-garis">
              {summary.lowStock.map((p) => (
                <ProductRow
                  key={p.id}
                  image={p.image}
                  name={p.name}
                  aside={
                    <>
                      <span className={`text-sm font-semibold tabular-nums ${p.stock === 0 ? 'text-gosong' : ''}`}>{p.stock === 0 ? 'Habis' : `Sisa ${p.stock}`}</span>
                      <Link to="/seller/products" className="text-sm font-semibold underline underline-offset-4">
                        Ubah
                      </Link>
                    </>
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
