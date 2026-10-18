import { http } from './client'
import type { Notification } from '../types/api'

export function fetchNotifications(signal?: AbortSignal): Promise<{ items: Notification[] }> {
  return http.get<{ items: Notification[] }>('/notifications', {}, { signal })
}

export function markNotificationRead(notificationId: string): Promise<{ ok: boolean }> {
  return http.post<{ ok: boolean }>(`/notifications/${notificationId}/read`)
}
