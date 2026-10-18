import { useEffect, useRef, useState } from 'react'
import { readStoredToken } from '../api/client'
import { openStream, type StreamState } from '../api/sse'

type StreamOptions = {
  path: string
  params?: Record<string, string | number | undefined>
  /** Nama kejadian yang dikirim server untuk stream ini. */
  events: string[]
  onEvent: (event: string, data: unknown) => void
  enabled?: boolean
  withToken?: boolean
}

/**
 * useSSE membuka satu koneksi Server-Sent Events selama komponen hidup.
 * Koneksinya ditutup dan dibuka ulang hanya kalau alamat atau daftar kejadian
 * berubah, bukan setiap render.
 */
export function useSSE(options: StreamOptions): StreamState {
  const [state, setState] = useState<StreamState>('connecting')

  const onEventRef = useRef(options.onEvent)
  useEffect(() => {
    onEventRef.current = options.onEvent
  })

  const key = JSON.stringify([options.path, options.params ?? {}, options.events])
  const enabled = options.enabled ?? true
  const withToken = options.withToken ?? false

  useEffect(() => {
    if (!enabled) {
      setState('closed')
      return
    }

    const handle = openStream({
      path: options.path,
      params: options.params,
      events: options.events,
      withToken,
      token: readStoredToken(),
      onEvent: (event, data) => onEventRef.current(event, data),
      onState: setState,
    })

    return () => {
      handle.close()
      setState('closed')
    }
    // options sengaja tidak masuk dependensi; perubahannya sudah diringkas ke key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, withToken])

  return state
}
