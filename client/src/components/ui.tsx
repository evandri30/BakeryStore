// Small shared building blocks. Kept in one file: each is a few lines.
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { LuMinus, LuPlus } from 'react-icons/lu'
import type { Tone } from '../lib/format'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }

const buttonStyles = {
  primary: 'bg-cokelat text-tepung hover:bg-cokelat-tua disabled:bg-cokelat/40',
  secondary: 'border border-cokelat text-cokelat hover:bg-adonan disabled:opacity-50',
  ghost: 'text-cokelat hover:bg-adonan disabled:opacity-50',
  danger: 'border border-gosong text-gosong hover:bg-gosong/10 disabled:opacity-50',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  )
}

export function Field({
  label,
  hint,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="font-medium">{label}</span>
      <input
        className="mt-1 block w-full rounded-lg border border-garis bg-kertas px-3 py-2.5 text-base outline-none transition-colors placeholder:text-cokelat/40 focus:border-cokelat sm:text-sm"
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-cokelat/60">{hint}</span>}
    </label>
  )
}

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-adonan text-cokelat',
  info: 'bg-kraft/35 text-cokelat',
  success: 'bg-pandan text-white',
  warning: 'bg-mentega/30 text-cokelat',
  danger: 'bg-gosong/10 text-gosong',
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneStyles[tone]}`}>{children}</span>
}

export function QuantityStepper({
  value,
  max,
  onChange,
  label,
}: {
  value: number
  max: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-cokelat text-cokelat" role="group" aria-label={`Jumlah ${label}`}>
      <button type="button" className="grid size-9 place-items-center rounded-full hover:bg-adonan" onClick={() => onChange(value - 1)} aria-label="Kurangi">
        <LuMinus />
      </button>
      <span className="w-7 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="grid size-9 place-items-center rounded-full hover:bg-adonan disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Tambah"
      >
        <LuPlus />
      </button>
    </div>
  )
}

/** Native <dialog>: Esc to close, focus trapped, background inert. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-tepung p-0 text-cokelat shadow-xl"
    >
      {open && <div className="p-6 sm:p-8">{children}</div>}
    </dialog>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="font-serif text-3xl text-cokelat">{title}</p>
      {children && <p className="mt-3 text-cokelat/70">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function PageTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6 sm:pt-12">
      <h1 className="font-serif text-4xl sm:text-5xl">{children}</h1>
      {aside}
    </div>
  )
}
