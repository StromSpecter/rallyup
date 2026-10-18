import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/app/auth'
import { fetchNotifications, markNotificationRead } from '@/shared/api/notifications'
import { errorMessage } from '@/shared/api/client'
import { useAsync } from '@/shared/hooks/useAsync'
import { useSSE } from '@/shared/hooks/useSSE'
import type { StreamState } from '@/shared/api/sse'
import type { Notification } from '@/shared/types/api'

type NotificationsValue = {
  items: Notification[]
  unreadCount: number
  loading: boolean
  error: string
  reload: () => void
  markRead: (id: string) => Promise<void>
  streamState: StreamState
}

const NotificationsContext = createContext<NotificationsValue | null>(null)

/**
 * Notifikasi dipakai di dua tempat sekaligus: lonceng di kepala halaman dan
 * halaman daftar penuh. Keduanya berbagi satu pembacaan dan satu koneksi SSE
 * supaya loncengnya selalu sama dengan daftarnya.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const enabled = Boolean(user)

  const list = useAsync((signal) => fetchNotifications(signal), [enabled], { enabled })

  useEffect(() => {
    if (!enabled) list.setData(() => undefined)
    // list.setData berasal dari useState, jadi acuannya stabil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const streamState = useSSE({
    path: '/stream/me',
    events: ['notification'],
    withToken: true,
    enabled,
    onEvent: (_event, data) => {
      const incoming = data as Notification
      if (!incoming?.id) return
      list.setData((previous) => ({
        items: [incoming, ...(previous?.items ?? []).filter((item) => item.id !== incoming.id)],
      }))
    },
  })

  const markRead = useCallback(
    async (id: string) => {
      const current = list.data?.items.find((item) => item.id === id)
      if (!current || current.readAt) return
      // Optimistis: tanda baca langsung hilang, kalau gagal dipulihkan lagi.
      list.setData((previous) =>
        previous
          ? { items: previous.items.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)) }
          : previous,
      )
      try {
        await markNotificationRead(id)
      } catch (cause) {
        list.setData((previous) =>
          previous
            ? { items: previous.items.map((item) => (item.id === id ? { ...item, readAt: undefined } : item)) }
            : previous,
        )
        toast.error(errorMessage(cause) || 'Gagal menandai notifikasi.')
      }
    },
    [list],
  )

  const value = useMemo<NotificationsValue>(() => {
    const items = list.data?.items ?? []
    return {
      items,
      unreadCount: items.filter((item) => !item.readAt).length,
      loading: list.loading,
      error: list.error,
      reload: list.reload,
      markRead,
      streamState,
    }
  }, [list.data, list.error, list.loading, list.reload, markRead, streamState])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications(): NotificationsValue {
  const value = useContext(NotificationsContext)
  if (!value) throw new Error('useNotifications harus dipakai di dalam NotificationsProvider')
  return value
}
