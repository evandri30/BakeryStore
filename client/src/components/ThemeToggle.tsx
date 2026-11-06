// Light/dark switch. Without a saved choice the site follows the device theme
// (index.html sets it before the first paint, so there is no flash).
import { useEffect, useState } from 'react'
import { LuMoon, LuSun } from 'react-icons/lu'

type Theme = 'light' | 'dark'
const KEY = 'rizquna-theme'
const query = '(prefers-color-scheme: dark)'

const systemTheme = (): Theme => (matchMedia(query).matches ? 'dark' : 'light')

function savedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  // Matches the header background, so the phone's browser bar blends in.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1c130d' : '#fffcf7')
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'))

  // Follow the device when it switches (e.g. automatic dark mode at night), unless the user picked one.
  useEffect(() => {
    const media = matchMedia(query)
    const onChange = () => {
      if (savedTheme()) return
      const next = systemTheme()
      applyTheme(next)
      setTheme(next)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    try {
      // Picking the device's own theme means "follow the device" again.
      if (next === systemTheme()) localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch {
      // Storage blocked: the switch still works for this visit.
    }
    applyTheme(next)
    setTheme(next)
  }

  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Pakai tampilan terang' : 'Pakai tampilan gelap'}
      title={dark ? 'Tampilan terang' : 'Tampilan gelap'}
      className={`grid size-10 place-items-center rounded-full hover:bg-adonan ${className}`}
    >
      {dark ? <LuSun className="size-5" /> : <LuMoon className="size-5" />}
    </button>
  )
}
