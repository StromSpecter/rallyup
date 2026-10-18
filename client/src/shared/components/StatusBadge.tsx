import type { ReactNode } from 'react'

import { cn } from '../lib/utils'
import {
  EVENT_STATUS_LABELS,
  MATCH_STATUS_LABELS,
  REGISTRATION_STATUS_LABELS,
  SCORE_STATUS_LABELS,
} from '../lib/constants'
import type {
  EventStatus,
  MatchStatus,
  RegistrationStatus,
  ScoreStatus,
} from '../types/api'

const TONES = {
  neutral: 'bg-secondary text-secondary-foreground',
  court: 'bg-primary text-primary-foreground',
  live: 'bg-rally text-ink',
  danger: 'bg-destructive text-destructive-foreground',
  outline: 'border border-border bg-transparent text-foreground',
} as const

export type BadgeTone = keyof typeof TONES

type PillProps = {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

export function Pill({ tone = 'neutral', children, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-semibold tracking-wide uppercase',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const EVENT_TONES: Record<EventStatus, BadgeTone> = {
  draft: 'outline',
  published: 'court',
  closed: 'neutral',
  cancelled: 'danger',
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Pill tone={EVENT_TONES[status]}>{EVENT_STATUS_LABELS[status]}</Pill>
}

const MATCH_TONES: Record<MatchStatus, BadgeTone> = {
  scheduled: 'outline',
  finished: 'court',
  disputed: 'danger',
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  return <Pill tone={MATCH_TONES[status]}>{MATCH_STATUS_LABELS[status]}</Pill>
}

const SCORE_TONES: Record<ScoreStatus, BadgeTone> = {
  pending: 'neutral',
  confirmed: 'court',
  disputed: 'danger',
}

export function ScoreStatusBadge({ status }: { status: ScoreStatus }) {
  return <Pill tone={SCORE_TONES[status]}>{SCORE_STATUS_LABELS[status]}</Pill>
}

const REGISTRATION_TONES: Record<RegistrationStatus, BadgeTone> = {
  joined: 'court',
  waitlist: 'neutral',
  cancelled: 'outline',
}

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  return <Pill tone={REGISTRATION_TONES[status]}>{REGISTRATION_STATUS_LABELS[status]}</Pill>
}
