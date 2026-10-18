import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../api/client'

type ActionOptions<Result> = {
  /** Ditampilkan lewat toast setelah aksi berhasil. */
  successMessage?: string
  onSuccess?: (result: Result) => void
}

export type Action<Args extends unknown[], Result> = {
  run: (...args: Args) => Promise<Result | undefined>
  pending: boolean
  error: string
  clearError: () => void
}

/**
 * useAction membungkus satu aksi yang mengubah data di server. Kegagalan selalu
 * muncul sebagai toast, karena aksi yang gagal tanpa kabar adalah kontrol mati.
 * Pemanggil tetap menerima status agar bisa menutup dialog atau memuat ulang.
 */
export function useAction<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
  options: ActionOptions<Result> = {},
): {
  run: (...args: Args) => Promise<Result | undefined>
  pending: boolean
  error: string
  clearError: () => void
} {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  const run = useCallback(
    async (...args: Args): Promise<Result | undefined> => {
      setPending(true)
      setError('')
      try {
        const result = await action(...args)
        const { successMessage, onSuccess } = optionsRef.current
        if (successMessage) toast.success(successMessage)
        onSuccess?.(result)
        return result
      } catch (cause) {
        const message = errorMessage(cause) || 'Aksi gagal. Coba lagi.'
        setError(message)
        toast.error(message)
        return undefined
      } finally {
        setPending(false)
      }
    },
    [action],
  )

  const clearError = useCallback(() => setError(''), [])

  return { run, pending, error, clearError }
}
