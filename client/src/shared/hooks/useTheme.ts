import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'rallyup.theme'

// Kelas di <html> adalah sumber kebenaran tema. Semua komponen yang memakai
// hook ini mendengarkan perubahan yang sama supaya tidak ada dua sakelar yang
// saling menimpa.
const listeners = new Set<(theme: Theme) => void>()

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Pilihan tema tidak tersimpan, tapi tampilan tetap berubah.
  }
  for (const listener of listeners) listener(theme)
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(() => {
    listeners.add(setTheme)
    setTheme(currentTheme())
    return () => {
      listeners.delete(setTheme)
    }
  }, [])

  return {
    theme,
    setTheme: applyTheme,
    toggle: () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'),
  }
}
