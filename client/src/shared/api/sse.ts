// Klien Server-Sent Events.
//
// Server mengirim nama kejadian yang stabil per bagian halaman, misalnya
// "registrations" atau "score", jadi klien hanya perlu memuat ulang bagian yang
// berubah. Setiap topik perlu pendengar bernama sendiri; onmessage tidak dipakai
// karena server selalu menyertakan nama kejadian.

import { streamBaseUrl } from './client'

export type StreamState = 'connecting' | 'open' | 'closed'

export type StreamHandle = {
  close: () => void
}

type StreamOptions = {
  path: string
  params?: Record<string, string | number | undefined>
  events: string[]
  onEvent: (event: string, data: unknown) => void
  onState?: (state: StreamState) => void
  /** Token hanya perlu untuk stream pribadi seperti /stream/me. */
  withToken?: boolean
  token?: string | null
}

function buildUrl({ path, params, withToken, token }: StreamOptions): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  // EventSource tidak bisa mengirim header, jadi token pribadi lewat query.
  if (withToken && token) search.set('access_token', token)
  const query = search.toString()
  return `${streamBaseUrl}${path}${query ? `?${query}` : ''}`
}

export function openStream(options: StreamOptions): StreamHandle {
  const url = buildUrl(options)
  const source = new EventSource(url, { withCredentials: true })

  const listeners = options.events.map((name) => {
    const handler = (message: MessageEvent<string>) => {
      let data: unknown = message.data
      try {
        data = JSON.parse(message.data)
      } catch {
        // Kirim apa adanya kalau bukan JSON; handler tetap dapat sinyalnya.
      }
      options.onEvent(name, data)
    }
    source.addEventListener(name, handler as EventListener)
    return { name, handler }
  })

  source.onopen = () => options.onState?.('open')
  source.onerror = () => {
    // EventSource mengurus percobaan ulang sendiri; bedakan sekadar terputus
    // dari benar-benar ditutup supaya indikator siaran bisa ditampilkan jujur.
    options.onState?.(source.readyState === EventSource.CLOSED ? 'closed' : 'connecting')
  }

  return {
    close: () => {
      for (const listener of listeners) {
        source.removeEventListener(listener.name, listener.handler as EventListener)
      }
      source.close()
    },
  }
}
