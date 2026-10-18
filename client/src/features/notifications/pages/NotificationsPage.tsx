import { FiBell, FiCheck } from 'react-icons/fi'
import { Link } from 'react-router-dom'

import { Container } from '@/shared/components/Container'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingRows } from '@/shared/components/Loading'
import { PageHeader } from '@/shared/components/PageHeader'
import { LiveIndicator } from '@/shared/components/Marks'
import { Button } from '@/shared/components/ui/button'
import { formatRelative } from '@/shared/lib/format'
import { useNotifications } from '../context'

export function NotificationsPage() {
  const { items, unreadCount, loading, error, reload, markRead, streamState } = useNotifications()

  return (
    <Container className="py-8">
      <PageHeader
        eyebrow="Kotak masuk"
        title="Notifikasi"
        description={
          unreadCount > 0
            ? `${unreadCount} notifikasi belum dibaca.`
            : 'Semua notifikasi sudah dibaca.'
        }
        actions={<LiveIndicator state={streamState} />}
      />

      {loading && !items.length ? <LoadingRows rows={4} /> : null}

      {error && !items.length ? <ErrorState message={error} onRetry={reload} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          icon={<FiBell />}
          title="Belum ada notifikasi"
          description="Kabar pendaftaran, absen, skor, dan konfirmasi akan muncul di sini."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/sesi">Cari sesi</Link>
            </Button>
          }
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="divide-y divide-border border-y border-border">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-start gap-3 py-4">
              <span
                aria-hidden="true"
                className={['mt-2 size-2 shrink-0 rounded-full', item.readAt ? 'bg-border' : 'bg-rally'].join(' ')}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-medium">{item.title}</p>
                  <span className="text-xs text-muted-foreground">{formatRelative(item.createdAt)}</span>
                  {!item.readAt ? (
                    <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                      Belum dibaca
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{item.body}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.link ? (
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to={item.link}
                        onClick={() => {
                          void markRead(item.id)
                        }}
                      >
                        Buka
                      </Link>
                    </Button>
                  ) : null}
                  {!item.readAt ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void markRead(item.id)
                      }}
                    >
                      <FiCheck aria-hidden="true" />
                      Tandai dibaca
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Container>
  )
}
