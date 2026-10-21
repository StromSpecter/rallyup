import { Skeleton } from './ui/skeleton'
import { cn } from '../lib/utils'

/** Rangka baris daftar. Bentuknya menyerupai kartu asli supaya tata letak tidak melompat. */
export function LoadingRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-sm border border-border p-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Rangka blok lebar untuk tabel dan papan peringkat. */
export function LoadingBlock({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden="true">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

/** Penanda status muat yang juga terbaca pembaca layar. */
export function LoadingLabel({ label = 'Memuat data' }: { label?: string }) {
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {label}...
    </p>
  )
}
