import type { ReactNode } from 'react'

import { cn } from '../lib/utils'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

/**
 * Kepala halaman memakai aturan tajam: label pendek, judul berat, lalu satu
 * garis rambut sebagai pemisah sebelum isi.
 */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 pb-6', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display text-4xl leading-none uppercase sm:text-5xl">{title}</h1>
          {description ? (
            <div className="max-w-2xl text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="hairline" />
    </header>
  )
}

/** Judul bagian dengan garis rambut, dipakai memisahkan blok di dalam halaman. */
export function SectionHeading({
  title,
  hint,
  actions,
  className,
}: {
  title: string
  hint?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-baseline justify-between gap-3', className)}>
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-display text-2xl uppercase">{title}</h2>
        {hint ? <span className="text-sm text-muted-foreground">{hint}</span> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
