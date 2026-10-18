// Fungsi murni untuk menampilkan data. Tidak ada React di sini supaya mudah
// dipakai ulang dan diuji terpisah.

import type { SetScore } from '../types/api'

const LOCALE = 'id-ID'

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const dateShortFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
})

const dateFullFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateTimeFullFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function toDate(value: string | Date | undefined): Date | undefined {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** "Rab, 21 Okt" */
export function formatDate(value: string | Date | undefined): string {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : ''
}

/** "21 Okt" */
export function formatDateShort(value: string | Date | undefined): string {
  const date = toDate(value)
  return date ? dateShortFormatter.format(date) : ''
}

/** "Rabu, 21 Oktober 2026" */
export function formatDateFull(value: string | Date | undefined): string {
  const date = toDate(value)
  return date ? dateFullFormatter.format(date) : ''
}

/** "18.30" */
export function formatTime(value: string | Date | undefined): string {
  const date = toDate(value)
  return date ? timeFormatter.format(date) : ''
}

/** "Rabu, 21 Oktober 2026, 18.30" */
export function formatDateTimeFull(value: string | Date | undefined): string {
  const date = toDate(value)
  return date ? dateTimeFullFormatter.format(date) : ''
}

/** "Rab, 21 Okt, 18.30-20.30" */
export function formatEventSchedule(startsAt: string, endsAt: string): string {
  const day = formatDate(startsAt)
  const start = formatTime(startsAt)
  if (!day || !start) return ''
  const end = formatTime(endsAt)
  return end ? `${day}, ${start}-${end}` : `${day}, ${start}`
}

/** Selisih hari kalender dari hari ini: "Hari ini", "Besok", "Kemarin", atau tanggal. */
export function formatDayLabel(value: string | Date | undefined): string {
  const date = toDate(value)
  if (!date) return ''
  const days = Math.round((startOfLocalDay(date) - startOfLocalDay(new Date())) / 86_400_000)
  if (days === 0) return 'Hari ini'
  if (days === 1) return 'Besok'
  if (days === -1) return 'Kemarin'
  return formatDate(date)
}

/** "baru saja", "12 menit lalu", "3 hari lalu", lalu jatuh ke tanggal singkat. */
export function formatRelative(value: string | Date | undefined): string {
  const date = toDate(value)
  if (!date) return ''
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'baru saja'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return `${formatDateShort(date)} ${formatTime(date)}`
}

/** "Rp150.000" atau "Gratis" untuk biaya nol. */
export function formatIDR(amount: number): string {
  if (!amount) return 'Gratis'
  return `Rp${new Intl.NumberFormat(LOCALE).format(amount)}`
}

/** Rating ditampilkan tanpa desimal supaya kolom tetap rapi. */
export function formatRating(rating: number): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(rating)
}

/** Tingkat kepercayaan rating: "80%". */
export function formatPercent(ratio: number): string {
  return `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`
}

/** "6-3, 6-4" */
export function formatSets(sets: SetScore[] | undefined): string {
  if (!sets || sets.length === 0) return ''
  return sets.map((set) => `${set.a}-${set.b}`).join(', ')
}

/** Jumlah set yang dimenangkan tiap tim. */
export function countSetWins(sets: SetScore[] | undefined): { a: number; b: number } {
  const wins = { a: 0, b: 0 }
  for (const set of sets ?? []) {
    if (set.a > set.b) wins.a += 1
    else if (set.b > set.a) wins.b += 1
  }
  return wins
}

/** Dua huruf pertama dari nama, untuk avatar inisial. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Label tingkat 1..7 yang konsisten dengan perhitungan server. */
const LEVEL_LABELS = [
  'Pemula',
  'Pemula Lanjut',
  'Menengah Bawah',
  'Menengah',
  'Menengah Atas',
  'Mahir',
  'Terbuka',
] as const

export function formatLevel(level: number): string {
  const label = LEVEL_LABELS[Math.min(Math.max(level, 1), LEVEL_LABELS.length) - 1]
  return `Level ${level} · ${label}`
}

export function levelLabel(level: number): string {
  return LEVEL_LABELS[Math.min(Math.max(level, 1), LEVEL_LABELS.length) - 1]
}

/** Rentang level sesi: "Level 1-7" atau "Level 3" kalau sama. */
export function formatLevelRange(min: number, max: number): string {
  return min === max ? `Level ${min}` : `Level ${min}-${max}`
}

/** "3 orang" tanpa bentuk jamak, karena bahasa Indonesia tidak mengubah kata. */
export function formatCount(count: number, noun: string): string {
  return `${count} ${noun}`
}

/** Nilai untuk input `datetime-local`, memakai zona waktu peramban. */
export function toDatetimeLocal(value: string | Date | undefined): string {
  const date = toDate(value)
  if (!date) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Ubah nilai `datetime-local` jadi waktu RFC3339 yang diterima server. */
export function fromDatetimeLocal(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}
