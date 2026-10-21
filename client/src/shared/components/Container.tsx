import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

/** Lebar isi yang konsisten di seluruh halaman. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
  )
}

/** Garis rambut sebagai pemisah bagian, dengan lebar penuh layar. */
export function Rule({ className }: { className?: string }) {
  return <div className={cn('hairline', className)} />
}

/** Label pendek huruf besar untuk menandai awal blok data. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase',
        className,
      )}
    >
      {children}
    </p>
  )
}
