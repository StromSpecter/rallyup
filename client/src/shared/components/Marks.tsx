import { FiArrowUpRight } from 'react-icons/fi'
import { GiBasketballBall, GiPaddles, GiShuttlecock, GiTennisRacket } from 'react-icons/gi'
import type { IconType } from 'react-icons'

import { cn } from '../lib/utils'
import type { StreamState } from '../api/sse'
import type { Sport } from '../types/api'

const SPORT_ICONS: Record<Sport, IconType> = {
  padel: GiPaddles,
  tennis: GiTennisRacket,
  badminton: GiShuttlecock,
  basket: GiBasketballBall,
}

/**
 * Wordmark RallyUp: nama huruf kecil dengan panah lime, mengikuti berkas Figma.
 * Warnanya mengikuti warna teks induknya (navy di latar terang, putih di latar
 * biru), jadi komponen ini tidak pernah menentukan warnanya sendiri.
 */
export function RallyUpWordmark({
  className,
  arrowClassName = 'text-primary',
  label = 'RallyUp',
}: {
  className?: string
  arrowClassName?: string
  label?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-end gap-1 font-display leading-none font-extrabold tracking-tight lowercase',
        className,
      )}
    >
      {label.toLowerCase()}
      <FiArrowUpRight
        aria-hidden="true"
        className={cn('mb-[0.08em] size-[0.42em] shrink-0', arrowClassName)}
      />
    </span>
  )
}

/**
 * Ikon cabang olahraga. Selalu dipasangkan dengan label teks, jadi gambarnya
 * ditandai hiasan supaya pembaca layar tidak membacanya dua kali.
 */
export function SportMark({ sport, className }: { sport: Sport; className?: string }) {
  const Icon = SPORT_ICONS[sport]
  return <Icon aria-hidden="true" className={className} />
}

/** Penanda siaran langsung untuk data yang didorong lewat SSE. */
export function LiveIndicator({ state, className }: { state: StreamState; className?: string }) {
  if (state === 'open') {
    return (
      <span
        className={[
          'inline-flex items-center gap-1.5 rounded-sm bg-rally px-2 py-0.5 text-xs font-semibold tracking-wide text-ink uppercase',
          className ?? '',
        ].join(' ')}
      >
        <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-ink" />
        Langsung
      </span>
    )
  }

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase',
        className ?? '',
      ].join(' ')}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground" />
      {state === 'connecting' ? 'Menyambung' : 'Terputus'}
    </span>
  )
}
