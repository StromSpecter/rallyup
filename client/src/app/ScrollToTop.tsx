import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Kembalikan posisi gulir ke atas setiap pindah halaman. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return null
}
