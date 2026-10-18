// Label bahasa Indonesia untuk nilai enum dari API. Satu tempat supaya istilah
// yang dipakai konsisten di seluruh layar.

import type {
  EventFormat,
  EventStatus,
  LeaderboardKind,
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
  { value: '#0E4D3A', label: 'Hijau lapangan' },
  { value: '#8A5A00', label: 'Cokelat tanah' },
  { value: '#1F3A5F', label: 'Biru malam' },
  { value: '#6B2D3C', label: 'Merah marun' },
  { value: '#3F4A0E', label: 'Zaitun' },
  { value: '#4A2C5E', label: 'Ungu tua' },
]

export const SPORTS: { value: Sport; label: string; short: string }[] = [
  { value: 'padel', label: 'Padel', short: 'Padel' },
  { value: 'tennis', label: 'Tenis', short: 'Tenis' },
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

export const LEADERBOARD_KINDS: { value: LeaderboardKind; label: string; hint: string }[] = [
  { value: 'skill', label: 'Rating skill', hint: 'Dihitung dari hasil pertandingan terverifikasi.' },
  { value: 'season', label: 'Poin musim', hint: 'Menang 3 poin, ikut bermain 1 poin.' },
  { value: 'participation', label: 'Partisipasi', hint: 'Jumlah pertandingan terverifikasi.' },
]

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
