import { Link } from 'react-router-dom'
import { FiBell } from 'react-icons/fi'

import type { Notification } from '../../../shared/types/api'
import { formatRelative } from '../../../shared/lib/format'
import { cn } from '../../../shared/lib/utils'

type NotificationRowProps = {
  notification: Notification
  onRead: (notification: Notification) => void
  className?: string
}

/**
 * Satu baris notifikasi. Selalu berupa tautan ke halaman yang dibicarakan, jadi
 * tidak ada baris yang buntu.
 */
export function NotificationRow({ notification, onRead, className }: NotificationRowProps) {
  const unread = !notification.readAt

  return (
    <Link
      to={notification.link}
      onClick={() => {
        if (unread) onRead(notification)
      }}
      className={cn(
        'flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          unread ? 'bg-primary' : 'bg-border',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('text-sm', unread ? 'font-semibold' : 'font-medium')}>
            {notification.title}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelative(notification.createdAt)}
          </span>
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{notification.body}</span>
      </span>
      {unread ? <span className="sr-only">Belum dibaca</span> : null}
    </Link>
  )
}

export function NotificationEmpty({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center gap-2 text-center', compact ? 'py-6' : 'py-16')}>
      <FiBell aria-hidden="true" className="size-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Belum ada notifikasi. Kabar sesi dan skor akan muncul di sini.
      </p>
    </div>
  )
}
