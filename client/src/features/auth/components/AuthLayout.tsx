import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { RallyUpMark } from '@/shared/components/Marks'
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
    <Container className="grid min-h-[calc(100dvh-4rem)] items-stretch gap-10 py-10 lg:grid-cols-2 lg:gap-16">
      <section className="court-field hidden flex-col justify-between rounded-lg border border-border p-8 lg:flex">
        <Link to="/" className="flex items-center gap-3 text-foreground">
          <RallyUpMark className="size-10" />
          <span className="font-display text-lg tracking-wide uppercase">RallyUp</span>
        </Link>
        <div className="space-y-4">
          <p className="font-display text-3xl leading-tight uppercase">
            Satu tempat untuk sesi, pasangan, dan rating komunitas.
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            Penyelenggara menyusun jadwal dari pemain yang sudah absen. Setiap hasil
            yang dikonfirmasi dua pihak menaikkan rating, tanpa perlu hitung manual.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
              Padel
            </dt>
            <dd className="mt-1">Doubles rotasi</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
              Tenis
            </dt>
            <dd className="mt-1">Singles dan ganda</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
              Rating
            </dt>
            <dd className="mt-1">Elo per komunitas</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col justify-center">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
            <h1 className="font-display text-3xl uppercase">{title}</h1>
            <div className="text-sm text-muted-foreground">{description}</div>
          </div>
          {children}
          <div className="text-sm text-muted-foreground">{footer}</div>
        </div>
      </section>
    </Container>
  )
}
