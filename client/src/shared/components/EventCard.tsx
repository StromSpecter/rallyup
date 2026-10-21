import { Link } from 'react-router-dom'

import { EventStatusBadge, Pill } from '@/shared/components/StatusBadge'
import { SportMark } from '@/shared/components/Marks'
import { formatEventSchedule, formatIDR, formatLevelRange } from '@/shared/lib/format'
import { sportLabel } from '@/shared/lib/constants'
import type { Event } from '@/shared/types/api'

/**
 * Kartu sesi. Informasi yang paling dicari saat memilih sesi ditaruh lebih
 * dulu: kapan, di mana, untuk level berapa, dan masih ada slot atau tidak.
 */
export function EventCard({ event }: { event: Event }) {
  const remaining = Math.max(event.capacity - event.joinedCount, 0)
  const full = remaining === 0
  const ratio = event.capacity > 0 ? Math.min(event.joinedCount / event.capacity, 1) : 0

  return (
    <article className="group relative flex flex-col gap-4 rounded-sm border border-border bg-card p-5 transition-colors hover:border-primary">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="court">
            <SportMark sport={event.sport} className="size-3.5" />
            {sportLabel(event.sport)}
          </Pill>
          <EventStatusBadge status={event.status} />
        </div>
        <span className="font-display text-sm tabular-nums">{formatIDR(event.fee)}</span>
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-xl leading-tight uppercase">
          <Link to={`/sesi/${event.id}`} className="after:absolute after:inset-0">
            {event.title}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">
          {formatEventSchedule(event.startsAt, event.endsAt)} · {event.venue}, {event.city}
        </p>
        <p className="text-sm text-muted-foreground">
          {event.communityName} · {formatLevelRange(event.levelMin, event.levelMax)} ·{' '}
          {event.format === 'doubles' ? 'Doubles' : 'Singles'}
        </p>
      </div>

      <div className="mt-auto space-y-2">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${event.joinedCount} dari ${event.capacity} slot terisi`}
        >
          <span
            className={full ? 'block h-full bg-muted-foreground' : 'block h-full bg-primary'}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            {event.joinedCount}/{event.capacity} peserta
            {event.waitlistCount > 0 ? ` · ${event.waitlistCount} daftar tunggu` : ''}
          </span>
          <span className={full ? 'font-medium text-muted-foreground' : 'font-medium text-primary'}>
            {full ? 'Slot penuh' : `Sisa ${remaining} slot`}
          </span>
        </div>
      </div>
    </article>
  )
}
