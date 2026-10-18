import { Link } from 'react-router-dom'

import { Container } from '@/shared/components/Container'
import { Button } from '@/shared/components/ui/button'

export function NotFoundPage() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-20 text-center">
      <p className="font-display text-6xl tabular-nums">404</p>
      <h1 className="font-display text-2xl uppercase">Halaman tidak ditemukan</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Tautan yang kamu buka mungkin sudah berubah atau tidak pernah ada. Coba mulai
        dari daftar sesi.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/sesi">Lihat sesi</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Ke beranda</Link>
        </Button>
      </div>
    </Container>
  )
}
