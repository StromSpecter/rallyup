import { FiBell } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

import { Avatar } from '@/shared/components/Avatar'
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from '@/shared/components/ui/dropdown'
import { formatRelative } from '@/shared/lib/format'
import { useNotifications } from '../context'

/**
 * Lonceng notifikasi. Angka di lencana adalah jumlah yang belum dibaca dan
 * datang dari koneksi SSE yang sama dengan halaman daftar notifikasi.
 */
export function NotificationBell() {
  const { items, unreadCount, markRead } = useNotifications()
  const navigate = useNavigate()
  const recent = items.slice(0, 6)

  const open = (id: string, link: string) => {
    void markRead(id)
    if (link) navigate(link)
  }

  return (
    <Dropdown>
      <DropdownTrigger
        className="relative inline-flex size-9 items-center justify-center rounded-sm border border-border text-foreground transition-colors hover:bg-accent"
        aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
      >
        <FiBell aria-hidden="true" className="size-4" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-rally px-1 text-[10px] font-bold text-ink tabular-nums"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </DropdownTrigger>

      <DropdownContent className="w-80 p-0" align="end">
        <DropdownLabel className="px-3 pt-3 pb-1 text-sm font-semibold text-foreground">
          Notifikasi
        </DropdownLabel>
        <DropdownSeparator />
        {recent.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Belum ada notifikasi. Kabar pendaftaran dan skor akan muncul di sini.
          </p>
        ) : (
          <div className="flex flex-col">
            {recent.map((item) => (
              <DropdownItem
                key={item.id}
                className="items-start gap-3 px-3 py-2.5"
                onSelect={() => open(item.id, item.link)}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    item.readAt ? 'bg-border' : 'bg-rally',
                  ].join(' ')}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <Avatar name={item.title} color={item.readAt ? '#8E8776' : '#0E4D3A'} size="sm" />
                    <span className="truncate text-sm font-medium">{item.title}</span>
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
                  <span className="text-[11px] text-muted-foreground">{formatRelative(item.createdAt)}</span>
                </span>
              </DropdownItem>
            ))}
          </div>
        )}
        <DropdownSeparator />
        <DropdownItem onSelect={() => navigate('/app/notifikasi')} className="justify-center text-sm font-medium">
          Lihat semua notifikasi
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  )
}
