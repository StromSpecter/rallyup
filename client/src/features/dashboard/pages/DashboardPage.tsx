import { FiCalendar, FiPlus, FiUsers } from 'react-icons/fi'
import { Link } from 'react-router-dom'

import { useAuth } from '@/app/auth'
import { Container } from '@/shared/components/Container'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { EventCard } from '@/shared/components/EventCard'
import { LoadingRows } from '@/shared/components/Loading'
import { PageHeader, SectionHeading } from '@/shared/components/PageHeader'
import { StatTile } from '@/shared/components/StatTile'
import { Button } from '@/shared/components/ui/button'
import { listEvents } from '@/shared/api/events'
import { fetchPlayer } from '@/shared/api/players'
import { useAsync } from '@/shared/hooks/useAsync'
import { sportLabel } from '@/shared/lib/constants'
import { formatLevel, formatRating } from '@/shared/lib/format'

export function DashboardPage() {
  const { user } = useAuth()

  const profile = useAsync(
    (signal) => fetchPlayer(user?.id ?? '', signal),
    [user?.id],
    { enabled: Boolean(user?.id) },
  )
  const joined = useAsync(
    (signal) => listEvents({ scope: 'joined', from: new Date().toISOString(), limit: 6 }, signal),
    [],
  )
  const organized = useAsync((signal) => listEvents({ scope: 'mine', limit: 6 }, signal), [])

  if (!user) {
    return null
  }

  const firstName = user.name.trim().split(/\s+/)[0]
  const ratings = profile.data?.ratings ?? []
  const bestRating = ratings.reduce<(typeof ratings)[number] | undefined>(
    (best, rating) => (!best || rating.skillRating > best.skillRating ? rating : best),
    undefined,
  )

  return (
    <Container className="py-8">
      <PageHeader
        eyebrow="Dashboard"
        title={`Halo, ${firstName}`}
        description="Ringkasan sesi, rating, dan kabar terbaru untukmu."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/sesi">
                <FiCalendar aria-hidden="true" />
                Cari sesi
              </Link>
            </Button>
            <Button asChild>
              <Link to="/sesi?buat=1">
                <FiPlus aria-hidden="true" />
                Buat sesi
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-4">
        <StatTile label="Level" value={profile.data?.level ?? '-'} hint={formatLevel(profile.data?.level ?? 1)} />
        <StatTile
          label="Rating"
          value={bestRating ? formatRating(bestRating.skillRating) : '-'}
          hint={bestRating ? sportLabel(bestRating.sport) : 'Belum ada'}
        />
        <StatTile label="Pertandingan" value={profile.data?.totalMatches ?? 0} />
        <StatTile label="Kemenangan" value={profile.data?.totalWins ?? 0} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <section className="space-y-4">
            <SectionHeading
              title="Sesi yang kamu ikuti"
              actions={
                <Button variant="link" size="sm" asChild>
                  <Link to="/sesi?scope=joined">Lihat semua</Link>
                </Button>
              }
            />
            {joined.loading ? <LoadingRows rows={2} /> : null}
            {joined.error ? <ErrorState message={joined.error} onRetry={joined.reload} /> : null}
            {!joined.loading && !joined.error && (joined.data?.items.length ?? 0) === 0 ? (
              <EmptyState
                icon={<FiCalendar />}
                title="Belum ikut sesi mendatang"
                description="Cari sesi padel atau tenis di komunitasmu, lalu daftar."
                action={
                  <Button size="sm" asChild>
                    <Link to="/sesi">Cari sesi</Link>
                  </Button>
                }
              />
            ) : null}
            {(joined.data?.items.length ?? 0) > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {joined.data?.items.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            <SectionHeading
              title="Sesi yang kamu kelola"
              actions={
                <Button variant="link" size="sm" asChild>
                  <Link to="/sesi?scope=mine">Lihat semua</Link>
                </Button>
              }
            />
            {organized.loading ? <LoadingRows rows={2} /> : null}
            {organized.error ? <ErrorState message={organized.error} onRetry={organized.reload} /> : null}
            {!organized.loading && !organized.error && (organized.data?.items.length ?? 0) === 0 ? (
              <EmptyState
                icon={<FiUsers />}
                title="Belum mengelola sesi"
                description="Kalau kamu pengurus komunitas, buat sesi dan susun jadwalnya di sini."
                action={
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/komunitas">Kelola komunitas</Link>
                  </Button>
                }
              />
            ) : null}
            {(organized.data?.items.length ?? 0) > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {organized.data?.items.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-display text-lg uppercase">Kabar terbaru</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Pendaftaran diterima, slot terbuka, skor menunggu konfirmasi, dan hasil
              terkonfirmasi masuk ke notifikasi.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/app/notifikasi">Buka notifikasi</Link>
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-display text-lg uppercase">Profil</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Perbarui nama dan warna avatar yang tampil di papan peringkat.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/app/profil">Atur profil</Link>
            </Button>
          </div>
        </aside>
      </div>
    </Container>
  )
}
