import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

import { AuthProvider } from './auth'
import { NotificationsProvider } from '@/features/notifications/context'

/**
 * Provider yang membungkus seluruh aplikasi. Urutannya penting: AuthProvider
 * lebih dulu karena provider notifikasi membaca status masuk untuk tahu kapan
 * boleh memuat data dan membuka koneksi SSE.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </NotificationsProvider>
    </AuthProvider>
  )
}
