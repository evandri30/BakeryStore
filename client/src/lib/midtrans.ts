// Midtrans Snap popup (sandbox). The script is loaded once, on the first online checkout.

type SnapResult = 'success' | 'pending' | 'error' | 'closed'
type SnapCallbacks = { onSuccess: () => void; onPending: () => void; onError: () => void; onClose: () => void }
declare global {
  interface Window {
    snap?: { pay: (token: string, callbacks: SnapCallbacks) => void }
  }
}

let loading: Promise<void> | null = null

function loadSnap(): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.dataset.clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY ?? ''
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      reject(new Error('Gagal memuat halaman pembayaran Midtrans'))
    }
    document.body.appendChild(script)
  })
  return loading
}

export async function payWithSnap(token: string): Promise<SnapResult> {
  await loadSnap()
  return new Promise((resolve) => {
    window.snap?.pay(token, {
      onSuccess: () => resolve('success'),
      onPending: () => resolve('pending'),
      onError: () => resolve('error'),
      onClose: () => resolve('closed'),
    })
  })
}
