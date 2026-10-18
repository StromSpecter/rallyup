import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

/** Lebar isi yang konsisten di seluruh halaman. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
  )
}

/** Garis lapangan sebagai pemisah bagian, dengan lebar penuh layar. */
export function Rule({ className }: { className?: string }) {
  return <div className={cn('court-rule', className)} />
}

/** Label pendek huruf besar untuk menandai awal blok data. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase',
        className,
      )}
    >
      {children}
    </p>
  )
}
