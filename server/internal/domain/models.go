package domain

import (
	"time"

	"github.com/google/uuid"
)

type Sport string

const (
	SportPadel  Sport = "padel"
	SportTennis Sport = "tennis"
)

func (s Sport) Valid() bool { return s == SportPadel || s == SportTennis }

type EventFormat string

const (
	FormatDoubles EventFormat = "doubles"
	FormatSingles EventFormat = "singles"
)

func (f EventFormat) Valid() bool { return f == FormatDoubles || f == FormatSingles }

type EventStatus string

const (
	EventDraft     EventStatus = "draft"
	EventPublished EventStatus = "published"
	EventClosed    EventStatus = "closed"
	EventCancelled EventStatus = "cancelled"
)

type RegistrationStatus string

const (
	RegJoined    RegistrationStatus = "joined"
	RegWaitlist  RegistrationStatus = "waitlist"
	RegCancelled RegistrationStatus = "cancelled"
)

type MatchStatus string

const (
	MatchScheduled MatchStatus = "scheduled"
	MatchFinished  MatchStatus = "finished"
	MatchDisputed  MatchStatus = "disputed"
	MatchCancelled MatchStatus = "cancelled"
)

type ScoreStatus string

const (
	ScorePending   ScoreStatus = "pending"
	ScoreConfirmed ScoreStatus = "confirmed"
	ScoreDisputed  ScoreStatus = "disputed"
)

type TeamSide string

const (
	TeamA TeamSide = "A"
	TeamB TeamSide = "B"
)

type MemberRole string

const (
	RoleOwner     MemberRole = "owner"
	RoleModerator MemberRole = "moderator"
	RoleMember    MemberRole = "member"
)

type LeaderboardKind string

const (
	LeaderboardSkill         LeaderboardKind = "skill"
	LeaderboardSeason        LeaderboardKind = "season"
	LeaderboardParticipation LeaderboardKind = "participation"
)

func (k LeaderboardKind) Valid() bool {
	return k == LeaderboardSkill || k == LeaderboardSeason || k == LeaderboardParticipation
}

// CalibrationMatches adalah jumlah pertandingan pertama yang dipakai untuk
// mengunci rating pemain baru. Di bawah angka ini rating masih provisional dan
// reliabilitasnya ditampilkan apa adanya.
const CalibrationMatches = 10

type User struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Email       string    `json:"email"`
	AvatarColor string    `json:"avatarColor"`
	CreatedAt   time.Time `json:"createdAt"`
}

type UserWithHash struct {
	User
	PasswordHash string
}

type Community struct {
	ID          uuid.UUID `json:"id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	City        string    `json:"city"`
	Description string    `json:"description"`
	CreatedBy   uuid.UUID `json:"createdBy"`
	MemberCount int       `json:"memberCount"`
	CreatedAt   time.Time `json:"createdAt"`
}

type CommunityMembership struct {
	CommunityID uuid.UUID
	UserID      uuid.UUID
	Role        MemberRole
}

type Event struct {
	ID             uuid.UUID   `json:"id"`
	CommunityID    uuid.UUID   `json:"communityId"`
	CommunitySlug  string      `json:"communitySlug"`
	CommunityName  string      `json:"communityName"`
	OrganizerID    uuid.UUID   `json:"organizerId"`
	OrganizerName  string      `json:"organizerName"`
	Title          string      `json:"title"`
	Sport          Sport       `json:"sport"`
	Format         EventFormat `json:"format"`
	Venue          string      `json:"venue"`
	City           string      `json:"city"`
	StartsAt       time.Time   `json:"startsAt"`
	EndsAt         time.Time   `json:"endsAt"`
	Capacity       int         `json:"capacity"`
	Fee            int         `json:"fee"`
	LevelMin       int         `json:"levelMin"`
	LevelMax       int         `json:"levelMax"`
	Status         EventStatus `json:"status"`
	Notes          string      `json:"notes"`
	JoinedCount    int         `json:"joinedCount"`
	WaitlistCount  int         `json:"waitlistCount"`
	CheckedInCount int         `json:"checkedInCount"`
	CreatedAt      time.Time   `json:"createdAt"`
}

type Registration struct {
	ID          uuid.UUID          `json:"id"`
	EventID     uuid.UUID          `json:"eventId"`
	UserID      uuid.UUID          `json:"userId"`
	Status      RegistrationStatus `json:"status"`
	CheckedIn   bool               `json:"checkedIn"`
	JoinedAt    time.Time          `json:"joinedAt"`
	UserName    string             `json:"userName"`
	UserLevel   int                `json:"userLevel"`
	UserRating  float64            `json:"userRating"`
	AvatarColor string             `json:"avatarColor"`
}

type Match struct {
	ID       uuid.UUID        `json:"id"`
	EventID  uuid.UUID        `json:"eventId"`
	Court    int              `json:"court"`
	Round    int              `json:"round"`
	Status   MatchStatus      `json:"status"`
	PlayedAt *time.Time       `json:"playedAt,omitempty"`
	Players  []MatchPlayer    `json:"players"`
	Score    *ScoreSubmission `json:"score,omitempty"`
}

type MatchPlayer struct {
	UserID      uuid.UUID `json:"userId"`
	UserName    string    `json:"userName"`
	Team        TeamSide  `json:"team"`
	AvatarColor string    `json:"avatarColor"`
}

type ScoreSubmission struct {
	ID            uuid.UUID   `json:"id"`
	MatchID       uuid.UUID   `json:"matchId"`
	SubmittedBy   uuid.UUID   `json:"submittedBy"`
	Sets          []SetScore  `json:"sets"`
	Status        ScoreStatus `json:"status"`
	ConfirmedBy   *uuid.UUID  `json:"confirmedBy,omitempty"`
	DisputeReason string      `json:"disputeReason,omitempty"`
	CreatedAt     time.Time   `json:"createdAt"`
}

type SetScore struct {
	A int `json:"a"`
	B int `json:"b"`
}

// PlayerRating memisahkan data mentah hasil pertandingan dari hasil
// perhitungan. Simpanan ini bisa dihitung ulang tanpa menyentuh skor asli.
type PlayerRating struct {
	UserID        uuid.UUID `json:"userId"`
	CommunityID   uuid.UUID `json:"communityId"`
	Sport         Sport     `json:"sport"`
	SkillRating   float64   `json:"skillRating"`
	SeasonPoints  int       `json:"seasonPoints"`
	Participation int       `json:"participation"`
	Matches       int       `json:"matches"`
	Wins          int       `json:"wins"`
	Losses        int       `json:"losses"`
	Reliability   float64   `json:"reliability"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type LeaderboardRow struct {
	Rank          int       `json:"rank"`
	UserID        uuid.UUID `json:"userId"`
	Name          string    `json:"name"`
	AvatarColor   string    `json:"avatarColor"`
	SkillRating   float64   `json:"skillRating"`
	SeasonPoints  int       `json:"seasonPoints"`
	Participation int       `json:"participation"`
	Matches       int       `json:"matches"`
	Wins          int       `json:"wins"`
	Losses        int       `json:"losses"`
	Reliability   float64   `json:"reliability"`
	Provisional   bool      `json:"provisional"`
}

// EventStanding adalah peringkat pemain dalam satu sesi, dihitung dari
// pertandingan yang sudah selesai dan skornya terkonfirmasi.
type EventStanding struct {
	Rank        int       `json:"rank"`
	UserID      uuid.UUID `json:"userId"`
	Name        string    `json:"name"`
	AvatarColor string    `json:"avatarColor"`
	Matches     int       `json:"matches"`
	Wins        int       `json:"wins"`
	Losses      int       `json:"losses"`
	Points      int       `json:"points"`
	SetsWon     int       `json:"setsWon"`
	SetsLost    int       `json:"setsLost"`
}

type PlayerProfile struct {
	User         User           `json:"user"`
	Level        int            `json:"level"`
	Ratings      []PlayerRating `json:"ratings"`
	TotalMatches int            `json:"totalMatches"`
	TotalWins    int            `json:"totalWins"`
}

type Notification struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"userId"`
	Type      string     `json:"type"`
	Title     string     `json:"title"`
	Body      string     `json:"body"`
	Link      string     `json:"link"`
	ReadAt    *time.Time `json:"readAt,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
}

type AuditEntry struct {
	ActorID  uuid.UUID
	Entity   string
	EntityID string
	Action   string
	Before   any
	After    any
}
