import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../api/client'

export type AsyncState<T> = {
  data: T | undefined
  error: string
  loading: boolean
  /** Muat ulang data tanpa mengubah parameter. */
  reload: () => void
  /** Ubah data yang sudah ada, misalnya setelah aksi yang mengubah satu baris. */
  setData: (update: (previous: T | undefined) => T | undefined) => void
}

/**
 * useAsync menjalankan satu pembacaan data dan menjaga status memuat, gagal, dan
 * hasilnya. Pembacaan dibatalkan otomatis saat parameter berubah atau komponen
 * dilepas, jadi respons lama tidak menimpa respons baru.
 */
export function useAsync<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[] = [],
  options: { enabled?: boolean } = {},
): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  // Panjang daftar dependensi bisa berbeda antar pemanggil, jadi perubahannya
  // dibandingkan lewat nilai yang sudah diserialkan.
  const key = JSON.stringify(deps)
  const enabled = options.enabled ?? true

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setError('')
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')
    loadRef.current(controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return
        setData(result)
        setLoading(false)
      },
      (cause: unknown) => {
        if (controller.signal.aborted) return
        const message = errorMessage(cause)
        // Pembatalan bukan kegagalan, jadi tidak perlu ditampilkan.
        if (!message) return
        setError(message)
        setLoading(false)
      },
    )
    return () => controller.abort()
  }, [key, attempt, enabled])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  return {
    data,
    error,
    loading,
    reload,
    setData: setData as AsyncState<T>['setData'],
  }
}
