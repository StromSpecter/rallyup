import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useAuth } from './auth'
import { LoadingRows } from '../shared/components/Loading'
import { Container } from '../shared/components/Container'

/**
 * Menjaga rute yang butuh identitas. Alamat tujuan disimpan supaya pengguna
 * kembali ke halaman yang tadi dibuka setelah masuk.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Container className="py-16">
        <LoadingRows rows={2} />
      </Container>
    )
  }

  if (!user) {
    return <Navigate to="/masuk" replace state={{ from: location.pathname + location.search }} />
  }

  return <>{children}</>
}
