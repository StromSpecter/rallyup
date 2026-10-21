import { useState } from 'react'
import { FiArrowDown, FiArrowUpRight, FiCalendar, FiCheck } from 'react-icons/fi'
import { Link } from 'react-router-dom'

import { useAuth } from '@/app/auth'
import { Container } from '@/shared/components/Container'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { EventCard } from '@/shared/components/EventCard'
import { LoadingRows } from '@/shared/components/Loading'
import { Reveal } from '@/shared/components/Reveal'
import { SegmentedControl } from '@/shared/components/SegmentedControl'
import { Button } from '@/shared/components/ui/button'
import { listEvents } from '@/shared/api/events'
import { SPORTS } from '@/shared/lib/constants'
import { useAsync } from '@/shared/hooks/useAsync'
import type { Sport } from '@/shared/types/api'

type SportFilter = '' | Sport

/** Nama berkas foto cabang di public/figma. */
const SPORT_PHOTOS: Record<Sport, string> = {
  padel: '/figma/sport-padel.jpg',
  tennis: '/figma/sport-tennis.jpg',
  badminton: '/figma/sport-badminton.jpg',
  basket: '/figma/sport-basket.jpg',
}

const SPORT_BLURBS: Record<Sport, string> = {
  padel: 'Rally seru, berempat lebih asyik.',
  tennis: 'Temukan ritme di setiap pukulan.',
  badminton: 'Langkah cepat, semangat dekat.',
  basket: 'Satu lapangan, banyak koneksi.',
}

// Langkah menjalankan satu sesi, dari sisi penyelenggara maupun pemain.
const STEPS = [
  {
    title: 'Gabung komunitas',
    body: 'Pilih komunitas di kotamu, lalu ikut sesi yang cocok dengan levelmu.',
  },
  {
    title: 'Absen, pasangan disusun',
    body: 'Organizer menandai siapa yang hadir. Pasangan dibagi dari rating, bukan undian.',
  },
  {
    title: 'Isi skor, konfirmasi lawan',
    body: 'Skor yang dikonfirmasi kedua pihak mengunci hasil dan memperbarui rating.',
  },
]

const PRINCIPLES = [
  'Pemula punya tempat',
  'Saling respek, di dalam dan luar lapangan',
  'Kompetitif boleh. Suportif harus.',
]

const FAQ = [
  {
    question: 'Baru mulai olahraga. Bisa ikut?',
    answer:
      'Bisa. Setiap sesi mencantumkan rentang level, jadi kamu bisa menyaring sesi untuk pemula. Rating semua pemain juga mulai dari angka yang sama, jadi tidak ada yang tertinggal di awal.',
  },
  {
    question: 'Harus punya teman main dulu?',
    answer:
      'Tidak. Sesi dibuka per komunitas dan yang mendaftar biasanya belum saling kenal. Pasangan disusun otomatis dari rating setelah absen ditutup.',
  },
  {
    question: 'Bagaimana pasangan ditentukan?',
    answer:
      'Pasangan dibagi dari rating hasil skor yang sudah dikonfirmasi, bukan diundi. Tujuannya agar tiap sisi lapangan berimbang.',
  },
  {
    question: 'Kalau skor diperdebatkan?',
    answer:
      'Skor yang disanggah ditandai sebagai sengketa dan ditengahi organizer. Hasil yang belum dikonfirmasi tidak mengubah rating siapa pun.',
  },
]

const SPORT_FILTERS: { value: SportFilter; label: string }[] = [
  { value: '', label: 'Semua cabang' },
  ...SPORTS.map((sport) => ({ value: sport.value, label: sport.label })),
]

/** Label kecil bernomor yang menandai awal bagian, dengan penanda kotak. */
function SectionLabel({ children, tone = 'brand' }: { children: string; tone?: 'brand' | 'light' }) {
  return (
    <p
      className={[
        'flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase',
        tone === 'brand' ? 'text-primary' : 'text-white/80',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={tone === 'brand' ? 'size-[7px] bg-primary' : 'size-[7px] bg-rally'}
      />
      {children}
    </p>
  )
}

export function LandingPage() {
  const { user } = useAuth()
  const [sport, setSport] = useState<SportFilter>('')
  const now = new Date().toISOString()
  const events = useAsync((signal) => listEvents({ from: now, limit: 9 }, signal), [])

  const upcoming = events.data?.items ?? []
  const filtered = sport ? upcoming.filter((event) => event.sport === sport) : upcoming
  const shown = filtered.slice(0, 3)

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <img
          src="/figma/hero-tennis.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-ink/70" />

        <Container className="relative flex min-h-[34rem] flex-col justify-between gap-10 pt-14 pb-6 lg:min-h-[38rem]">
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
            <SectionLabel tone="light">Olahraga, pertemuan, cerita baru</SectionLabel>
            <h1 className="max-w-4xl font-display text-[2.75rem] leading-[0.92] uppercase sm:text-6xl lg:text-[6.5rem]">
              Temukan ritmemu. Mulai rally-mu.
            </h1>
            <p className="max-w-xl text-base text-white/80">
              Olahraga favorit, teman main baru, dan alasan untuk bergerak. Temukan
              semuanya bersama Rallyup.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" className="bg-rally font-semibold text-ink hover:bg-rally/85" asChild>
                <Link to="/sesi">
                  Jelajah olahraga
                  <FiArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link to="/komunitas">
                  Kenalan dengan Rallyup
                  <FiArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/25 pt-5 text-[11px] font-semibold tracking-[0.12em] text-white/70 uppercase sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2">
              <FiArrowUpRight aria-hidden="true" className="size-3.5 text-rally" />
              Dari pertemuan coba sampai jadi rutinitas
            </p>
            <p>Padel / Tenis / Badminton / Basket</p>
            <p className="flex items-center gap-2">
              Jelajah Rallyup
              <FiArrowDown aria-hidden="true" className="size-3.5" />
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-secondary">
        <Container className="grid gap-8 py-16 lg:grid-cols-[1fr_2fr] lg:gap-16 lg:py-20">
          <div className="space-y-4">
            <SectionLabel>01 / Ini Rallyup</SectionLabel>
            <p className="max-w-xs text-sm text-muted-foreground">
              Bukan cuma soal menang. Ini soal menemukan tempatmu di permainan.
            </p>
          </div>
          <div className="space-y-6">
            <h2 className="font-display text-4xl leading-[0.98] uppercase sm:text-5xl lg:text-6xl">
              Lebih dari olahraga. Ini titik temumu.
            </h2>
            <p className="max-w-3xl text-base text-muted-foreground">
              Rallyup adalah ruang untuk menemukan olahraga yang kamu suka dan
              orang-orang yang juga ingin bermain. Bawa rasa penasaranmu. Kita mulai
              dari satu permainan.
            </p>
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-16 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-4">
              <SectionLabel>02 / Pilih permainanmu</SectionLabel>
              <h2 className="font-display text-4xl leading-[0.98] uppercase sm:text-5xl lg:text-6xl">
                Banyak cara untuk bergerak.
              </h2>
            </div>
            <Link
              to="/sesi"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Lihat semua sesi
              <FiArrowUpRight aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SPORTS.map((item) => (
              <li key={item.value}>
                <Link to={`/sesi?sport=${item.value}`} className="group block">
                  <div className="relative overflow-hidden rounded-sm">
                    <img
                      src={SPORT_PHOTOS[item.value]}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="aspect-[313/350] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <span className="absolute right-3 bottom-3 inline-flex size-10 items-center justify-center bg-rally text-ink transition-colors group-hover:bg-white">
                      <FiArrowUpRight aria-hidden="true" className="size-5" />
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-2xl uppercase">{item.label}</h3>
                  <p className="text-sm text-muted-foreground">{SPORT_BLURBS[item.value]}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="bg-secondary">
        <Container className="py-16 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-4">
              <SectionLabel>03 / Dari penasaran jadi permainan</SectionLabel>
              <h2 className="font-display text-4xl leading-[0.98] uppercase sm:text-5xl lg:text-6xl">
                Mau main apa hari ini?
              </h2>
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              Pilih cabang olahraga, lalu buka sesi yang paling dekat denganmu.
            </p>
          </div>

          <SegmentedControl
            label="Saring cabang olahraga"
            value={sport}
            options={SPORT_FILTERS}
            onChange={setSport}
            className="mt-8"
          />

          <div className="mt-8">
            {events.loading ? <LoadingRows rows={3} /> : null}
            {events.error ? <ErrorState message={events.error} onRetry={events.reload} /> : null}

            {!events.loading && !events.error && shown.length === 0 ? (
              <EmptyState
                icon={<FiCalendar />}
                title="Belum ada sesi terjadwal"
                description={
                  sport
                    ? 'Belum ada sesi untuk cabang ini. Coba cabang lain atau lihat semua sesi.'
                    : 'Sesi yang dibuka komunitas akan muncul di sini begitu dijadwalkan.'
                }
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/komunitas">Lihat komunitas</Link>
                  </Button>
                }
              />
            ) : null}

            {shown.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((event, index) => (
                  <Reveal key={event.id} delay={index * 0.05}>
                    <EventCard event={event} />
                  </Reveal>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Daftar diperbarui dari sesi yang dibuka komunitas.
            </p>
            <Button asChild>
              <Link to={sport ? `/sesi?sport=${sport}` : '/sesi'}>
                Cari sesi lain
                <FiArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="bg-brand text-white">
        <Container className="py-16 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-4">
              <SectionLabel tone="light">04 / Langkah pertamamu</SectionLabel>
              <h2 className="font-display text-4xl leading-[0.98] uppercase sm:text-5xl lg:text-6xl">
                Nggak perlu jago. Cukup mau mulai.
              </h2>
            </div>
          </div>

          <ol className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="space-y-3 border-t border-white/30 pt-5">
                <p className="font-display text-sm tracking-[0.12em] text-rally tabular-nums">
                  0{index + 1} /
                </p>
                <h3 className="font-display text-2xl uppercase">{step.title}</h3>
                <p className="text-sm text-white/80">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section>
        <Container className="grid gap-0 py-16 lg:grid-cols-2 lg:items-stretch lg:gap-16 lg:py-20">
          <div className="relative overflow-hidden rounded-sm">
            <img
              src="/figma/community-padel.jpg"
              alt="Empat pemain padel tertawa bersama sebelum masuk lapangan"
              loading="lazy"
              className="h-72 w-full object-cover lg:h-full"
            />
          </div>

          <div className="space-y-6 pt-8 lg:flex lg:flex-col lg:justify-center lg:pt-0">
            <SectionLabel>05 / Temukan circle-mu</SectionLabel>
            <h2 className="font-display text-4xl leading-[0.98] uppercase sm:text-5xl lg:text-6xl">
              Datang buat main. Pulang bawa teman.
            </h2>
            <p className="max-w-xl text-base text-muted-foreground">
              Ada yang baru pegang raket. Ada yang nggak bisa lepas dari lapangan. Di
              Rallyup, rasa suka pada olahraga jadi awal percakapan.
            </p>
            <ul className="space-y-3">
              {PRINCIPLES.map((principle) => (
                <li key={principle} className="flex items-center gap-3 text-sm">
                  <FiCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  {principle}
                </li>
              ))}
            </ul>
            <div>
              <Button asChild>
                <Link to="/komunitas">
                  Temukan komunitasmu
                  <FiArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-secondary">
        <Container className="grid gap-10 py-16 lg:grid-cols-[1fr_2fr] lg:gap-16 lg:py-20">
          <div className="space-y-4">
            <SectionLabel>06 / Sebelum mulai</SectionLabel>
            <h2 className="font-display text-4xl leading-[0.98] uppercase sm:text-5xl">
              Masih penasaran?
            </h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Hal-hal kecil yang mungkin ingin kamu tahu sebelum mengambil langkah
              pertama.
            </p>
          </div>

          <div className="divide-y divide-border border-t border-border">
            {FAQ.map((item, index) => (
              <details key={item.question} open={index === 0} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-xl leading-none text-primary group-open:hidden"
                  >
                    +
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden shrink-0 text-xl leading-none text-primary group-open:block"
                  >
                    −
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-brand text-white">
        <Container className="grid gap-8 py-16 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-16 lg:py-20">
          <div className="space-y-4">
            <SectionLabel tone="light">Giliranmu sekarang</SectionLabel>
            <h2 className="font-display text-4xl leading-[0.98] uppercase sm:text-5xl lg:text-6xl">
              Jangan cuma nonton. Ikut jadi permainan.
            </h2>
          </div>
          <div className="space-y-5">
            <p className="text-base text-white/80">
              Satu olahraga baru. Satu teman baru. Satu alasan lagi untuk keluar dan
              bergerak.
            </p>
            <Button size="lg" className="bg-rally font-semibold text-ink hover:bg-rally/85" asChild>
              <Link to={user ? '/app' : '/daftar'}>
                Mulai rally-mu
                <FiArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-white/70 uppercase">
              Sampai ketemu di lapangan
            </p>
          </div>
        </Container>
      </section>
    </>
  )
}
