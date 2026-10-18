import { FiUserCheck, FiUserX } from 'react-icons/fi'
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
}

export function RegistrationList({
  registrations,
  canManage,
  onToggleCheckIn,
  pendingUserId,
}: RegistrationListProps) {
  if (registrations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        Belum ada peserta. Bagikan tautan sesi ini supaya pemain bisa mendaftar.
      </p>
    )
  }

  const joined = registrations.filter((item) => item.status !== 'cancelled')

  return (
    <ul className="divide-y divide-border border-y border-border">
      {joined.map((registration) => (
        <li key={registration.id} className="flex flex-wrap items-center gap-3 py-3">
          <Avatar name={registration.userName} color={registration.avatarColor} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link to={`/pemain/${registration.userId}`} className="font-medium hover:text-primary">
                {registration.userName}
              </Link>
              {registration.status === 'waitlist' ? <Pill tone="neutral">Daftar tunggu</Pill> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatLevel(registration.userLevel)} · Rating {Math.round(registration.userRating)} ·{' '}
              {levelLabel(registration.userLevel)}
            </p>
          </div>

          {canManage && onToggleCheckIn ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <span className="text-muted-foreground">Hadir</span>
              <Switch
                checked={registration.checkedIn}
                disabled={pendingUserId === registration.userId}
                onCheckedChange={(checked: boolean) => onToggleCheckIn(registration.userId, checked)}
                aria-label={`Tandai kehadiran ${registration.userName}`}
              />
            </label>
          ) : (
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
      ))}
    </ul>
  )
}
