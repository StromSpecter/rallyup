import { FiArrowRight, FiCalendar, FiCheckCircle, FiUsers } from 'react-icons/fi'
import { Link } from 'react-router-dom'

import { EventCard } from '@/shared/components/EventCard'
import { CommunityCard } from '@/shared/components/CommunityCard'
import { Container, Eyebrow } from '@/shared/components/Container'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingRows } from '@/shared/components/Loading'
import { Reveal } from '@/shared/components/Reveal'
import { Button } from '@/shared/components/ui/button'
import { listEvents } from '@/shared/api/events'
import { listCommunities } from '@/shared/api/communities'
import { useAsync } from '@/shared/hooks/useAsync'

const STEPS = [
  {
    icon: FiUsers,
    title: 'Gabung komunitas',
    body: 'Pilih komunitas padel atau tenis di kotamu, lalu ikut sesi yang cocok dengan levelmu.',
  },
  {
    icon: FiCalendar,
    title: 'Absen, lalu pasangan disusun',
    body: 'Organizer menandai siapa yang hadir. Mesin penyusun membagi pasangan dari rating, bukan undian.',
  },
  {
    icon: FiCheckCircle,
    title: 'Isi skor, konfirmasi lawan',
    body: 'Skor yang dikonfirmasi kedua pihak mengunci hasil dan memperbarui rating komunitas.',
  },
]

export function LandingPage() {
  const now = new Date().toISOString()
  const events = useAsync((signal) => listEvents({ from: now, limit: 6 }, signal), [])
  const communities = useAsync((signal) => listCommunities(signal), [])

  const upcoming = (events.data?.items ?? []).slice(0, 3)
  const communityList = (communities.data?.items ?? []).slice(0, 6)

  return (
    <>
      <section className="court-field border-b border-border">
        <Container className="grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div className="space-y-6">
            <Eyebrow>Padel &amp; Tenis Komunitas</Eyebrow>
            <h1 className="max-w-3xl font-display text-4xl leading-[0.95] uppercase sm:text-6xl">
              Fun match yang rapi, dari daftar sampai rating.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground">
              RallyUp menyatukan jadwal sesi, absensi, penyusunan pasangan, dan skor
              terverifikasi dalam satu alur. Setiap hasil yang dikonfirmasi menaikkan
              rating pemain di komunitasnya.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/sesi">
                  Cari sesi
                  <FiArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/komunitas">Lihat komunitas</Link>
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 text-sm lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            <div className="space-y-1">
              <dt className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                Rating
              </dt>
              <dd>Elo klasik, mulai 1200</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                Level
              </dt>
              <dd>Skala 1 sampai 7</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                Pasangan
              </dt>
              <dd>Disusun dari rating</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                Pembaruan
              </dt>
              <dd>Langsung saat sesi berjalan</dd>
            </div>
          </dl>
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-14">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <Eyebrow>Sesi terdekat</Eyebrow>
              <h2 className="font-display text-3xl uppercase">Cari lawan minggu ini</h2>
            </div>
            <Link
              to="/sesi"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Lihat semua sesi
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>

          {events.loading ? <LoadingRows rows={3} /> : null}
          {events.error ? <ErrorState message={events.error} onRetry={events.reload} /> : null}
          {!events.loading && !events.error && upcoming.length === 0 ? (
            <EmptyState
              icon={<FiCalendar />}
              title="Belum ada sesi terjadwal"
              description="Sesi yang dibuka komunitas akan muncul di sini begitu dijadwalkan."
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link to="/komunitas">Lihat komunitas</Link>
                </Button>
              }
            />
          ) : null}
          {upcoming.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((event, index) => (
                <Reveal key={event.id} delay={index * 0.05}>
                  <EventCard event={event} />
                </Reveal>
              ))}
            </div>
          ) : null}
        </Container>
      </section>

      <section className="border-b border-border">
        <Container className="py-14">
          <div className="mb-8 space-y-2">
            <Eyebrow>Komunitas</Eyebrow>
            <h2 className="font-display text-3xl uppercase">Temukan komunitasmu</h2>
          </div>

          {communities.loading ? <LoadingRows rows={3} /> : null}
          {communities.error ? (
            <ErrorState message={communities.error} onRetry={communities.reload} />
          ) : null}
          {!communities.loading && !communities.error && communityList.length === 0 ? (
            <EmptyState
              icon={<FiUsers />}
              title="Belum ada komunitas"
              description="Jadilah yang pertama membuka komunitas padel atau tenis di kotamu."
              action={
                <Button size="sm" asChild>
                  <Link to="/komunitas">Buat komunitas</Link>
                </Button>
              }
            />
          ) : null}
          {communityList.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {communityList.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          ) : null}
        </Container>
      </section>

      <section className="border-b border-border bg-primary text-primary-foreground">
        <Container className="grid gap-10 py-14 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary-foreground/70 uppercase">
              Cara kerja
            </p>
            <h2 className="font-display text-3xl uppercase">Tiga langkah per sesi</h2>
            <p className="max-w-md text-sm text-primary-foreground/80">
              Tanpa grup chat yang tenggelam. Semua yang dibutuhkan untuk menjalankan
              satu sesi ada di satu halaman.
            </p>
          </div>
          <ol className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="space-y-2 border-t border-primary-foreground/25 pt-4">
                <div className="flex items-center gap-2 text-primary-foreground/80">
                  <step.icon aria-hidden="true" className="size-4" />
                  <span className="font-display text-sm tabular-nums">0{index + 1}</span>
                </div>
                <h3 className="font-display text-lg uppercase">{step.title}</h3>
                <p className="text-sm text-primary-foreground/80">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section>
        <Container className="flex flex-col items-start gap-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h2 className="font-display text-3xl uppercase">Siap menjalankan sesi?</h2>
            <p className="max-w-lg text-sm text-muted-foreground">
              Buat akun untuk ikut sesi, atau buat komunitas sendiri kalau kamu yang
              mengatur jadwal dan pasangan.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/daftar">Daftar gratis</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/peringkat">Lihat peringkat</Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  )
}
