// Klien HTTP tunggal untuk seluruh aplikasi.
//
// Aturan yang dipegang di sini:
// - Access token disimpan di memori dan dicerminkan ke localStorage supaya sesi
//   bertahan saat tab dimuat ulang.
// - Refresh token dikirim server sebagai cookie httpOnly, jadi setiap permintaan
//   memakai credentials: 'include'.
// - Balasan 401 dicoba sekali lagi setelah menukar refresh token. Kalau tetap
//   gagal, handler yang didaftarkan lewat setAuthLostHandler dipanggil.

import type { AuthResponse } from '../types/api'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'

const TOKEN_KEY = 'rallyup.accessToken'

let accessToken: string | null = null
let authLostHandler: (() => void) | null = null
let refreshInFlight: Promise<boolean> | null = null

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** Pesan siap tampil untuk semua jenis kegagalan, termasuk kegagalan jaringan. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.name === 'AbortError') return ''
  return 'Terjadi kesalahan. Coba lagi sebentar lagi.'
}

export function setAccessToken(token: string | null): void {
  accessToken = token
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // localStorage bisa diblokir; sesi tetap jalan selama tab ini hidup.
  }
}

export function readStoredToken(): string | null {
  if (accessToken) return accessToken
  try {
    accessToken = localStorage.getItem(TOKEN_KEY)
  } catch {
    accessToken = null
  }
  return accessToken
}

export function setAuthLostHandler(handler: (() => void) | null): void {
  authLostHandler = handler
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  skipRefresh?: boolean
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers = new Headers()
  const token = readStoredToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')

  try {
    return await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      credentials: 'include',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'network', 'Server tidak terjangkau. Periksa koneksi lalu coba lagi.')
  }
}

async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (!response.ok) return false
        const data = (await response.json()) as AuthResponse
        setAccessToken(data.accessToken)
        return true
      } catch {
        return false
      }
    })()
    // Setelah selesai, izinkan percobaan baru pada permintaan berikutnya.
    void refreshInFlight.finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options)

  if (response.status === 401 && !options.skipRefresh) {
    const refreshed = await refreshSession()
    if (refreshed) {
      response = await send(path, { ...options, skipRefresh: true })
    } else {
      setAccessToken(null)
      authLostHandler?.()
    }
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let data: unknown
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = undefined
    }
  }

  if (!response.ok) {
    const body = data as { code?: string; message?: string } | undefined
    throw new ApiError(
      response.status,
      body?.code ?? 'unknown',
      body?.message ?? 'Permintaan gagal. Coba lagi sebentar lagi.',
    )
  }

  return data as T
}

export const http = {
  get: <T>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
    options?: RequestOptions,
  ) => request<T>(`${path}${buildQuery(params)}`, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
}

/** Basis URL untuk SSE, dipakai bersama klien stream. */
export const streamBaseUrl = BASE_URL

/**
 * Menukar refresh token yang tersimpan di cookie dengan access token baru.
 * Dipakai permintaan yang gagal karena token kedaluwarsa dan oleh penjaga sesi
 * berkala supaya koneksi SSE tidak memakai token basi.
 */
export function refreshAccessToken(): Promise<boolean> {
  return refreshSession()
}
