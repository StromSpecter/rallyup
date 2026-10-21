import { FiUserCheck, FiUserMinus, FiUserX } from 'react-icons/fi'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Avatar } from '@/shared/components/Avatar'
import { Pill } from '@/shared/components/StatusBadge'
import { Switch } from '@/shared/components/ui/switch'
import { formatLevel, levelLabel } from '@/shared/lib/format'
import type { Registration } from '@/shared/types/api'

type RegistrationListProps = {
  registrations: Registration[]
  canManage: boolean
  onToggleCheckIn?: (userId: string, checkedIn: boolean) => void
  pendingUserId?: string
  onCancelParticipant?: (userId: string) => void
  pendingCancelUserId?: string
}

function RegistrationRow({
  registration,
  canManage,
  onToggleCheckIn,
  pendingUserId,
  onCancelParticipant,
  pendingCancelUserId,
}: {
  registration: Registration
  canManage: boolean
  onToggleCheckIn?: (userId: string, checkedIn: boolean) => void
  pendingUserId?: string
  onCancelParticipant?: (userId: string) => void
  pendingCancelUserId?: string
}) {
  const isCancelled = registration.status === 'cancelled'
  const isWaitlist = registration.status === 'waitlist'

  return (
    <li
      className={[
        'flex flex-wrap items-center gap-3 py-3',
        isCancelled ? 'opacity-60' : '',
      ].join(' ')}
    >
      <Avatar name={registration.userName} color={registration.avatarColor} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link to={`/pemain/${registration.userId}`} className="font-medium hover:text-primary">
            {registration.userName}
          </Link>
          {isWaitlist ? <Pill tone="neutral">Daftar tunggu</Pill> : null}
          {isCancelled ? <Pill tone="outline">Dibatalkan</Pill> : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatLevel(registration.userLevel)} · Rating {Math.round(registration.userRating)} ·{' '}
          {levelLabel(registration.userLevel)}
        </p>
      </div>

      {canManage && onCancelParticipant && !isCancelled ? (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
          disabled={Boolean(pendingCancelUserId)}
          onClick={() => onCancelParticipant(registration.userId)}
          aria-label={`Batalkan ${registration.userName}`}
        >
          <FiUserMinus aria-hidden="true" />
          {pendingCancelUserId === registration.userId ? 'Memproses...' : 'Batalkan'}
        </button>
      ) : null}

      {canManage && onToggleCheckIn && registration.status === 'joined' ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <span className="text-muted-foreground">Hadir</span>
          <Switch
            checked={registration.checkedIn}
            disabled={pendingUserId === registration.userId}
            onCheckedChange={(checked: boolean) => onToggleCheckIn(registration.userId, checked)}
            aria-label={`Tandai kehadiran ${registration.userName}`}
          />
        </label>
      ) : isCancelled ? null : (
        <Pill tone={registration.checkedIn ? 'court' : 'outline'}>
          {registration.checkedIn ? (
            <>
              <FiUserCheck aria-hidden="true" /> Hadir
            </>
          ) : (
            <>
              <FiUserX aria-hidden="true" /> Belum absen
            </>
          )}
        </Pill>
      )}
    </li>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2 border-b border-border pb-1">
        <h3 className="font-display text-sm uppercase tracking-wide text-muted-foreground">{title}</h3>
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      </div>
      {children}
    </div>
  )
}

export function RegistrationList({
  registrations,
  canManage,
  onToggleCheckIn,
  pendingUserId,
  onCancelParticipant,
  pendingCancelUserId,
}: RegistrationListProps) {
  if (registrations.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-border p-6 text-sm text-muted-foreground">
        Belum ada peserta. Bagikan tautan sesi ini supaya pemain bisa mendaftar.
      </p>
    )
  }

  const main = registrations.filter((item) => item.status === 'joined')
  const waitlist = registrations.filter((item) => item.status === 'waitlist')
  const cancelled = registrations.filter((item) => item.status === 'cancelled')

  return (
    <div className="space-y-6">
      <Section title="Peserta utama" count={main.length}>
        {main.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Belum ada peserta utama.</p>
        ) : (
          <ul className="divide-y divide-border">
            {main.map((registration) => (
              <RegistrationRow
                key={registration.id}
                registration={registration}
                canManage={canManage}
                onToggleCheckIn={onToggleCheckIn}
                pendingUserId={pendingUserId}
                onCancelParticipant={onCancelParticipant}
                pendingCancelUserId={pendingCancelUserId}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Daftar tunggu" count={waitlist.length}>
        {waitlist.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Belum ada daftar tunggu.</p>
        ) : (
          <ul className="divide-y divide-border">
            {waitlist.map((registration) => (
              <RegistrationRow
                key={registration.id}
                registration={registration}
                canManage={canManage}
                onToggleCheckIn={onToggleCheckIn}
                pendingUserId={pendingUserId}
                onCancelParticipant={onCancelParticipant}
                pendingCancelUserId={pendingCancelUserId}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Peserta batal" count={cancelled.length}>
        {cancelled.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Belum ada peserta batal.</p>
        ) : (
          <ul className="divide-y divide-border">
            {cancelled.map((registration) => (
              <RegistrationRow
                key={registration.id}
                registration={registration}
                canManage={canManage}
                onToggleCheckIn={onToggleCheckIn}
                pendingUserId={pendingUserId}
                onCancelParticipant={onCancelParticipant}
                pendingCancelUserId={pendingCancelUserId}
              />
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
