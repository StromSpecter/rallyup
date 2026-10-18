import { GiPaddles, GiTennisRacket } from 'react-icons/gi'
import type { IconType } from 'react-icons'

import type { StreamState } from '../api/sse'
import type { Sport } from '../types/api'

const SPORT_ICONS: Record<Sport, IconType> = {
  padel: GiPaddles,
  tennis: GiTennisRacket,
}

/** Tanda RallyUp: garis lapangan dengan bola di tengahnya. */
export function RallyUpMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#0E4D3A" />
      <g stroke="#F4F1E9" strokeWidth="3" opacity="0.85" fill="none">
        <rect x="10" y="10" width="44" height="44" rx="2" />
        <line x1="32" y1="10" x2="32" y2="54" />
        <line x1="10" y1="24" x2="54" y2="24" />
        <line x1="10" y1="40" x2="54" y2="40" />
      </g>
      <circle cx="32" cy="32" r="7" fill="#FFD100" />
    </svg>
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
