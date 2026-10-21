import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { RallyUpWordmark } from '@/shared/components/Marks'
import { Container } from '@/shared/components/Container'

type AuthLayoutProps = {
  eyebrow: string
  title: string
  description: ReactNode
  children: ReactNode
  footer: ReactNode
}

/**
 * Halaman masuk dan daftar memakai satu susunan: panel lapangan di kiri sebagai
 * penanda merek, formulir di kanan. Di layar sempit panel itu hilang dan tinggal
 * formulirnya.
 */
export function AuthLayout({ eyebrow, title, description, children, footer }: AuthLayoutProps) {
  return (
    <Container className="grid min-h-[calc(100dvh-5rem)] items-stretch gap-10 py-10 lg:grid-cols-2 lg:gap-16">
      <section className="brand-panel hidden flex-col justify-between rounded-sm p-10 lg:flex">
        <Link to="/" className="flex items-center">
          <RallyUpWordmark className="text-3xl" arrowClassName="text-rally" />
        </Link>
        <div className="space-y-4">
          <p className="font-display text-4xl leading-[0.98] uppercase">
            Satu tempat untuk sesi, pasangan, dan rating komunitas.
          </p>
          <p className="max-w-md text-sm text-white/75">
            Penyelenggara menyusun jadwal dari pemain yang sudah absen. Setiap hasil
            yang dikonfirmasi dua pihak menaikkan rating, tanpa perlu hitung manual.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-[11px] font-semibold tracking-[0.12em] text-white/60 uppercase">
              Cabang
            </dt>
            <dd className="mt-1">Padel, tenis, badminton, basket</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-[0.12em] text-white/60 uppercase">
              Rating
            </dt>
            <dd className="mt-1">Elo per komunitas</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-[0.12em] text-white/60 uppercase">
              Pasangan
            </dt>
            <dd className="mt-1">Disusun dari rating</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col justify-center">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">
              {eyebrow}
            </p>
            <h1 className="font-display text-4xl uppercase">{title}</h1>
            <div className="text-sm text-muted-foreground">{description}</div>
          </div>
          {children}
          <div className="text-sm text-muted-foreground">{footer}</div>
        </div>
      </section>
    </Container>
  )
}
