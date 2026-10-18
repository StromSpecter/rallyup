import type { ReactNode } from 'react'
import { cn } from '../lib/utils'

type StatTileProps = {
  label: string
  value: ReactNode
  hint?: ReactNode
  className?: string
}

/** Satu angka dengan keterangan sumbernya. Tanpa angka hiasan. */
export function StatTile({ label, value, hint, className }: StatTileProps) {
  return (
    <div className={cn('border-l border-border pl-4', className)}>
      <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
