// Bentuk data ini mengikuti JSON dari API Go di server/internal/domain.
// Kalau server berubah, ubah di sini dulu supaya TypeScript menandai
// pemakaian yang perlu disesuaikan.

export type Sport = 'padel' | 'tennis' | 'badminton' | 'basket'
export type EventFormat = 'doubles' | 'singles'
export type EventStatus = 'draft' | 'published' | 'closed' | 'cancelled'
export type RegistrationStatus = 'joined' | 'waitlist' | 'cancelled'
export type MatchStatus = 'scheduled' | 'finished' | 'disputed'
export type ScoreStatus = 'pending' | 'confirmed' | 'disputed'
export type TeamSide = 'A' | 'B'
export type MemberRole = 'owner' | 'moderator' | 'member'

export type User = {
  id: string
  name: string
  email: string
  avatarColor: string
  createdAt: string
}

export type Community = {
  id: string
  slug: string
  name: string
  city: string
  description: string
  createdBy: string
  memberCount: number
  createdAt: string
}

export type Event = {
  id: string
  communityId: string
  communitySlug: string
  communityName: string
  organizerId: string
  organizerName: string
  title: string
  sport: Sport
  format: EventFormat
  venue: string
  city: string
  startsAt: string
  endsAt: string
  capacity: number
  fee: number
  levelMin: number
  levelMax: number
  status: EventStatus
  notes: string
  joinedCount: number
  waitlistCount: number
  checkedInCount: number
  createdAt: string
}

export type Registration = {
  id: string
  eventId: string
  userId: string
  status: RegistrationStatus
  checkedIn: boolean
  joinedAt: string
  userName: string
  userLevel: number
  userRating: number
  avatarColor: string
}

export type MatchPlayer = {
  userId: string
  userName: string
  team: TeamSide
  avatarColor: string
}

export type SetScore = {
  a: number
  b: number
}

export type ScoreSubmission = {
  id: string
  matchId: string
  submittedBy: string
  sets: SetScore[]
  status: ScoreStatus
  confirmedBy?: string
  disputeReason?: string
  createdAt: string
}

export type Match = {
  id: string
  eventId: string
  court: number
  round: number
  status: MatchStatus
  playedAt?: string
  players: MatchPlayer[]
  score?: ScoreSubmission
}

export type PlayerRating = {
  userId: string
  communityId: string
  sport: Sport
  skillRating: number
  seasonPoints: number
  participation: number
  matches: number
  wins: number
  losses: number
  reliability: number
  updatedAt: string
}

export type PlayerProfile = {
  user: User
  level: number
  ratings: PlayerRating[]
  totalMatches: number
  totalWins: number
}

export type Notification = {
  id: string
  userId: string
  type: string
  title: string
  body: string
  link: string
  readAt?: string
  createdAt: string
}

export type EventDetail = {
  event: Event
  registrations: Registration[]
  matches: Match[]
  standings: EventStanding[]
  bench: BenchPlayer[]
  myStatus?: RegistrationStatus
  myRole?: MemberRole
  canManage: boolean
}

export type BenchPlayer = {
  userId: string
  name: string
  avatarColor: string
  roundsPlayed: number
}

export type EventStanding = {
  rank: number
  userId: string
  name: string
  avatarColor: string
  matches: number
  wins: number
  draws: number
  losses: number
  points: number
  setsWon: number
  setsLost: number
}

export type AuthResponse = {
  user: User
  accessToken: string
  expiresIn: number
}

export type ApiErrorBody = {
  code: string
  message: string
}

export type ListResponse<T> = {
  items: T[]
}

export type CommunityDetail = {
  community: Community
  myRole?: MemberRole
}

export type EventCountsUpdate = {
  eventId: string
  joinedCount: number
  waitlistCount: number
  checkedInCount: number
}

export type MatchUpdate = {
  matchId: string
  joinedCount?: number
  waitlistCount?: number
  checkedInCount?: number
  joined?: number
  checkedIn?: number
}
