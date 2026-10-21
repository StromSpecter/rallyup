// Label bahasa Indonesia untuk nilai enum dari API. Satu tempat supaya istilah
// yang dipakai konsisten di seluruh layar.

import type {
  EventFormat,
  EventStatus,
  MatchStatus,
  MemberRole,
  RegistrationStatus,
  ScoreStatus,
  Sport,
} from '../types/api'

// Palet avatar yang sama dengan server (server/internal/service/avatar.go).
// Dipakai di halaman profil supaya pengguna memilih dari warna yang benar-benar
// disimpan, bukan input bebas yang bisa ditolak server.
export const AVATAR_COLORS: { value: string; label: string }[] = [
  { value: '#174BE0', label: 'Biru rally' },
  { value: '#101B30', label: 'Navy malam' },
  { value: '#0E5A6B', label: 'Teal lapangan' },
  { value: '#6B2D3C', label: 'Merah marun' },
  { value: '#4A2C5E', label: 'Ungu tua' },
  { value: '#5C4A00', label: 'Cokelat tanah' },
]

export const SPORTS: { value: Sport; label: string; short: string }[] = [
  { value: 'padel', label: 'Padel', short: 'Padel' },
  { value: 'tennis', label: 'Tenis', short: 'Tenis' },
  { value: 'badminton', label: 'Badminton', short: 'Badminton' },
  { value: 'basket', label: 'Basket', short: 'Basket' },
]

export function sportLabel(sport: Sport): string {
  return SPORTS.find((item) => item.value === sport)?.label ?? sport
}

export const FORMATS: { value: EventFormat; label: string }[] = [
  { value: 'doubles', label: 'Ganda' },
  { value: 'singles', label: 'Tunggal' },
]

export function formatLabel(format: EventFormat): string {
  return FORMATS.find((item) => item.value === format)?.label ?? format
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Draf',
  published: 'Dibuka',
  closed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  joined: 'Terdaftar',
  waitlist: 'Daftar tunggu',
  cancelled: 'Keluar',
}

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: 'Belum bermain',
  finished: 'Selesai',
  disputed: 'Disanggah',
}

export const SCORE_STATUS_LABELS: Record<ScoreStatus, string> = {
  pending: 'Menunggu konfirmasi',
  confirmed: 'Terkonfirmasi',
  disputed: 'Disanggah',
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Pemilik',
  moderator: 'Moderator',
  member: 'Anggota',
}

// Server memakai ambang ini untuk status provisional. Angkanya dipakai juga di
// layar supaya kalimat "butuh N pertandingan lagi" bisa dihitung.
export const CALIBRATION_MATCHES = 10

export const MATCH_STATUS_HINT: Record<MatchStatus, string> = {
  scheduled: 'Skor belum diisi.',
  finished: 'Skor sudah dikunci, rating ikut diperbarui.',
  disputed: 'Ada sanggahan yang perlu ditengahi organizer.',
}

export const SCORE_STATUS_HINT: Record<ScoreStatus, string> = {
  pending: 'Menunggu konfirmasi pemain lawan atau organizer.',
  confirmed: 'Skor terkunci.',
  disputed: 'Sanggahan diajukan.',
}

export const MEMBER_ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Pemilik komunitas',
  moderator: 'Moderator',
  member: 'Anggota',
}

export function registrationStatusLabel(status: RegistrationStatus): string {
  return REGISTRATION_STATUS_LABELS[status]
}

export function eventStatusLabel(status: EventStatus): string {
  return EVENT_STATUS_LABELS[status]
}

export function matchStatusLabel(status: MatchStatus): string {
  return MATCH_STATUS_LABELS[status]
}

export function scoreStatusLabel(status: ScoreStatus): string {
  return SCORE_STATUS_LABELS[status]
}

export function memberRoleLabel(role: MemberRole | undefined): string {
  return role ? MEMBER_ROLE_LABEL[role] : 'Pengunjung'
}
