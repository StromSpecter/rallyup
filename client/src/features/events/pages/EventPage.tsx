import { useState } from 'react'
import { FiCopy, FiEdit2, FiLock, FiShuffle, FiUserMinus, FiUserPlus } from 'react-icons/fi'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/app/auth'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Container, Eyebrow } from '@/shared/components/Container'
import { ErrorState } from '@/shared/components/ErrorState'
import { TextField } from '@/shared/components/FormField'
import { LoadingBlock } from '@/shared/components/Loading'
import { LiveIndicator } from '@/shared/components/Marks'
import { PageHeader, SectionHeading } from '@/shared/components/PageHeader'
import { EventStatusBadge, Pill } from '@/shared/components/StatusBadge'
import { StatTile } from '@/shared/components/StatTile'
import { Avatar } from '@/shared/components/Avatar'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  checkIn,
  closeEvent,
  generatePairings,
  getEvent,
  joinEvent,
  leaveEvent,
} from '@/shared/api/events'
import { useAction } from '@/shared/hooks/useAction'
import { useAsync } from '@/shared/hooks/useAsync'
import { useSSE } from '@/shared/hooks/useSSE'
import { eventStatusLabel, formatLabel, sportLabel } from '@/shared/lib/constants'
import { formatDateFull, formatIDR, formatLevelRange, formatTime } from '@/shared/lib/format'
import { EventFormDialog } from '../components/EventFormDialog'
import { PairingsBoard } from '../components/PairingsBoard'
import { RegistrationList } from '../components/RegistrationList'

// Nama kejadian yang dikirim server untuk stream satu sesi. Semua menyebabkan
// halaman memuat ulang detail, karena detail sudah merangkum seluruh bagian.
const EVENT_STREAM_EVENTS = ['event', 'registrations', 'checkin', 'match', 'score']

export function EventPage() {
  const { eventId = '' } = useParams<{ eventId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [editOpen, setEditOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [courts, setCourts] = useState('2')
  const [pendingUserId, setPendingUserId] = useState('')

  // user.id masuk dependensi supaya hak kelola ikut dihitung ulang setelah
  // pengunjung masuk dari halaman ini.
  const detail = useAsync((signal) => getEvent(eventId, signal), [eventId, user?.id], {
    enabled: Boolean(eventId),
  })

  const streamState = useSSE({
    path: `/stream/events/${eventId}`,
    events: EVENT_STREAM_EVENTS,
    enabled: Boolean(eventId),
    onEvent: () => detail.reload(),
  })

  const join = useAction(() => joinEvent(eventId), {
    successMessage: 'Kamu terdaftar di sesi ini.',
    onSuccess: () => detail.reload(),
  })
  const leave = useAction(() => leaveEvent(eventId), {
    successMessage: 'Kamu keluar dari sesi ini.',
    onSuccess: () => detail.reload(),
  })
  const pairings = useAction<[number, boolean], unknown>(
    (value: number, append: boolean = false) => generatePairings(eventId, value, append),
    {
      successMessage: 'Jadwal pertandingan disusun.',
      onSuccess: () => detail.reload(),
    },
  )
  const close = useAction(() => closeEvent(eventId), {
    successMessage: 'Sesi ditutup.',
    onSuccess: () => {
      setCloseOpen(false)
      detail.reload()
    },
  })
  const toggleCheckIn = useAction(
    (userId: string, checked: boolean) => checkIn(eventId, userId, checked),
    { onSuccess: () => detail.reload() },
  )

  const handleCheckIn = (userId: string, checked: boolean) => {
    setPendingUserId(userId)
    void toggleCheckIn.run(userId, checked).finally(() => setPendingUserId(''))
  }

  if (detail.loading) {
    return (
      <Container className="py-8">
        <LoadingBlock />
      </Container>
    )
  }

  if (detail.error || !detail.data) {
    return (
      <Container className="py-8">
        <ErrorState message={detail.error} onRetry={detail.reload} />
        <div className="mt-4">
          <Button variant="outline" asChild>
            <Link to="/sesi">Lihat semua sesi</Link>
          </Button>
        </div>
      </Container>
    )
  }

  const { event, registrations, matches, myStatus, canManage } = detail.data
  const closed = event.status === 'closed' || event.status === 'cancelled'
  const isRegistered = myStatus === 'joined' || myStatus === 'waitlist'
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href
  const remaining = Math.max(event.capacity - event.joinedCount, 0)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Tautan sesi disalin.')
    } catch {
      toast.error('Peramban menolak akses papan klip. Salin tautan dari kolom di atas.')
    }
  }

  return (
    <Container className="py-8">
      <PageHeader
        eyebrow={event.communityName}
        title={event.title}
        description={
          <span className="space-y-1">
            <span className="block">
              {formatDateFull(event.startsAt)} · {formatTime(event.startsAt)}-{formatTime(event.endsAt)}
            </span>
            <span className="block">
              {event.venue}, {event.city}
            </span>
          </span>
        }
        actions={
          <>
            <LiveIndicator state={streamState} />
            {canManage ? (
              <>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <FiEdit2 aria-hidden="true" />
                  Ubah sesi
                </Button>
                {!closed ? (
                  <Button variant="outline" onClick={() => setCloseOpen(true)}>
                    <FiLock aria-hidden="true" />
                    Tutup sesi
                  </Button>
                ) : null}
              </>
            ) : null}

            {!user ? (
              <Button onClick={() => navigate('/masuk', { state: { from: `/sesi/${eventId}` } })}>
                <FiUserPlus aria-hidden="true" />
                Masuk untuk ikut
              </Button>
            ) : isRegistered ? (
              <Button variant="outline" onClick={() => void leave.run()} disabled={leave.pending}>
                <FiUserMinus aria-hidden="true" />
                {myStatus === 'waitlist' ? 'Keluar dari daftar tunggu' : 'Batalkan keikutsertaan'}
              </Button>
            ) : (
              <Button onClick={() => void join.run()} disabled={join.pending || closed}>
                <FiUserPlus aria-hidden="true" />
                {join.pending ? 'Memproses...' : 'Ikut sesi'}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="min-w-0 space-y-8">
          {event.notes ? (
            <section className="rounded-lg border border-border bg-card p-5">
              <Eyebrow>Catatan organizer</Eyebrow>
              <p className="mt-2 text-sm whitespace-pre-line">{event.notes}</p>
            </section>
          ) : null}

          <section className="space-y-4">
            <Tabs defaultValue="jadwal" className="space-y-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="jadwal">Jadwal pertandingan</TabsTrigger>
                <TabsTrigger value="peringkat">Peringkat</TabsTrigger>
              </TabsList>

              <TabsContent value="jadwal" className="space-y-4">
                <SectionHeading
                  title="Jadwal pertandingan"
                  hint={`${matches.length} pertandingan`}
                  actions={canManage && !closed && matches.length > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void pairings.run(Number(courts) || 1, false)}
                      disabled={pairings.pending}
                    >
                      {pairings.pending ? 'Menyusun...' : 'Susun ulang'}
                    </Button>
                  ) : undefined}
                />
                <PairingsBoard matches={matches} signedIn={Boolean(user)} />
              </TabsContent>

              <TabsContent value="peringkat" className="space-y-4">
                <SectionHeading
                  title="Peringkat sesi"
                  hint={`${detail.data?.standings?.length ?? 0} pemain`}
                />
                {detail.data?.standings?.length ? (
                  <div className="space-y-3">
                    <div className="w-full max-w-full overflow-x-auto rounded-lg border border-border bg-card">
                      <Table className="min-w-[620px]">
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="w-12 text-center font-display">Rank</TableHead>
                            <TableHead>Pemain</TableHead>
                            <TableHead className="text-right">Main</TableHead>
                            <TableHead className="text-right">Menang</TableHead>
                            <TableHead className="text-right">Kalah</TableHead>
                            <TableHead className="hidden text-right sm:table-cell">Set</TableHead>
                            <TableHead className="hidden text-right sm:table-cell">Win rate</TableHead>
                            <TableHead className="text-right font-display">Poin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detail.data?.standings ?? []).map((row) => {
                            const winRate = row.matches > 0 ? Math.round((row.wins / row.matches) * 100) : 0
                            return (
                              <TableRow
                                key={row.userId}
                                className={[
                                  row.rank === 1 ? 'bg-primary/5' : '',
                                  'hover:bg-muted/30',
                                ].join(' ')}
                              >
                                <TableCell className="text-center">
                                  <span
                                    className={[
                                      'inline-flex size-7 items-center justify-center rounded-full font-display text-sm tabular-nums',
                                      row.rank === 1
                                        ? 'bg-primary text-primary-foreground'
                                        : row.rank === 2
                                          ? 'bg-muted text-foreground'
                                          : row.rank === 3
                                            ? 'bg-muted text-foreground'
                                            : 'text-muted-foreground',
                                    ].join(' ')}
                                  >
                                    {row.rank}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Link
                                    to={`/pemain/${row.userId}`}
                                    className="flex items-center gap-3 hover:text-primary"
                                  >
                                    <Avatar name={row.name} color={row.avatarColor} size="sm" />
                                    <span className="truncate font-medium">{row.name}</span>
                                  </Link>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{row.matches}</TableCell>
                                <TableCell className="text-right tabular-nums text-primary">
                                  {row.wins}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                  {row.losses}
                                </TableCell>
                                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                                  {row.setsWon}-{row.setsLost}
                                </TableCell>
                                <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                                  {winRate}%
                                </TableCell>
                                <TableCell className="text-right font-display tabular-nums text-base">
                                  {row.points}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Menang memberi 3 poin, ikut bermain memberi 1 poin. Hanya pertandingan dengan
                      skor terkonfirmasi yang dihitung.
                    </p>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                    Belum ada hasil terkonfirmasi. Peringkat akan terisi setelah pertandingan pertama
                    selesai.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </section>

          <section className="space-y-4">
            <SectionHeading
              title="Peserta"
              hint={`${event.joinedCount} dari ${event.capacity} slot`}
            />
            {isRegistered ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {myStatus === 'waitlist'
                  ? 'Kamu ada di daftar tunggu. Slot terbuka akan otomatis mengisi posisimu.'
                  : 'Kamu terdaftar di sesi ini.'}
              </p>
            ) : null}
            <RegistrationList
              registrations={registrations}
              canManage={canManage}
              pendingUserId={pendingUserId}
              onToggleCheckIn={handleCheckIn}
            />
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <Eyebrow>Ringkasan sesi</Eyebrow>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <EventStatusBadge status={event.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Cabang</dt>
                <dd>
                  <Pill tone="court">{sportLabel(event.sport)}</Pill>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Format</dt>
                <dd className="font-medium">{formatLabel(event.format)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Level</dt>
                <dd className="font-medium">{formatLevelRange(event.levelMin, event.levelMax)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Biaya</dt>
                <dd className="font-medium tabular-nums">{formatIDR(event.fee)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Penyelenggara</dt>
                <dd className="font-medium">{event.organizerName}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Komunitas</dt>
                <dd className="font-medium">
                  <Link
                    to={`/komunitas/${event.communitySlug}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {event.communityName}
                  </Link>
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-card p-5">
            <StatTile label="Peserta" value={event.joinedCount} hint={`dari ${event.capacity}`} />
            <StatTile label="Hadir" value={event.checkedInCount} />
            <StatTile label="Tunggu" value={event.waitlistCount} />
          </div>

          {!closed ? (
            <p className="text-xs text-muted-foreground">
              {remaining > 0
                ? `Masih ada ${remaining} slot kosong.`
                : 'Slot utama sudah penuh. Pendaftaran baru masuk daftar tunggu.'}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sesi berstatus {eventStatusLabel(event.status).toLowerCase()}. Pendaftaran tidak lagi dibuka.
            </p>
          )}

          <div className="rounded-lg border border-border bg-card p-5">
            <Eyebrow>Bagikan sesi</Eyebrow>
            <p className="mt-2 text-sm text-muted-foreground">
              Kirim tautan ini ke grup komunitas supaya pemain lain bisa mendaftar.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <TextField
                label="Tautan sesi"
                className="flex-1"
                readOnly
                value={shareUrl}
                onFocus={(input) => input.currentTarget.select()}
              />
              <Button type="button" variant="outline" onClick={() => void copyLink()} className="mt-6">
                <FiCopy aria-hidden="true" />
                Salin
              </Button>
            </div>
          </div>

          {canManage ? (
            <div className="rounded-lg border border-dashed border-border p-5">
              <Eyebrow>Alat organizer</Eyebrow>
              <p className="mt-2 text-sm text-muted-foreground">
                Tandai pemain yang hadir di daftar peserta, lalu susun jadwal. Minimal 4 pemain
                yang sudah absen.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <TextField
                  label="Jumlah lapangan"
                  type="number"
                  min={1}
                  max={12}
                  className="w-32"
                  value={courts}
                  onChange={(input) => setCourts(input.target.value)}
                />
                <Button
                  onClick={() => void pairings.run(Number(courts) || 1, false)}
                  disabled={pairings.pending}
                >
                  <FiShuffle aria-hidden="true" />
                  {pairings.pending ? 'Menyusun...' : 'Susun jadwal'}
                </Button>
                {matches.length > 0 ? (
                  <Button
                    variant="outline"
                    onClick={() => void pairings.run(Number(courts) || 1, true)}
                    disabled={pairings.pending}
                  >
                    <FiShuffle aria-hidden="true" />
                    {pairings.pending ? 'Menyusun...' : 'Tambah ronde'}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      <EventFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        communities={[]}
        event={event}
        onSaved={() => {
          setEditOpen(false)
          detail.reload()
        }}
      />

      <ConfirmDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="Tutup sesi ini?"
        description="Setelah ditutup, sesi tidak bisa diubah lagi dan pendaftaran baru tidak dibuka. Skor yang belum dikonfirmasi tetap bisa diselesaikan."
        confirmLabel="Tutup sesi"
        pending={close.pending}
        onConfirm={() => void close.run()}
      />
    </Container>
  )
}
