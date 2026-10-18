package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ListEventsFilter dipakai bersama oleh repository dan handler supaya
// pemilihan kolom tidak duplikat di dua tempat.
type ListEventsFilter struct {
	CommunitySlug string
	Sport         Sport
	Status        []EventStatus
	Query         string
	From          *time.Time
	To            *time.Time
	OrganizerID   *uuid.UUID
	ParticipantID *uuid.UUID
	Limit         int
	Offset        int
}

type LeaderboardFilter struct {
	CommunityID uuid.UUID
	Sport       Sport
	Kind        LeaderboardKind
	Limit       int
}

type UserRepository interface {
	Create(ctx context.Context, name, email, passwordHash, avatarColor string) (User, error)
	FindByEmail(ctx context.Context, email string) (UserWithHash, error)
	FindByID(ctx context.Context, id uuid.UUID) (User, error)
	Update(ctx context.Context, id uuid.UUID, name, avatarColor string) (User, error)
}

type CommunityRepository interface {
	Create(ctx context.Context, c Community, ownerID uuid.UUID) (Community, error)
	List(ctx context.Context, userID *uuid.UUID) ([]Community, error)
	FindBySlug(ctx context.Context, slug string, userID *uuid.UUID) (Community, *MemberRole, error)
	Update(ctx context.Context, c Community) (Community, error)
	FindOrCreateMembership(ctx context.Context, communityID, userID uuid.UUID, role MemberRole) error
	Join(ctx context.Context, communityID, userID uuid.UUID) (int, error)
	IsMember(ctx context.Context, communityID, userID uuid.UUID) (bool, error)
}

type EventRepository interface {
	Create(ctx context.Context, e Event) (Event, error)
	List(ctx context.Context, f ListEventsFilter) ([]Event, error)
	FindByID(ctx context.Context, id uuid.UUID) (Event, error)
	Update(ctx context.Context, e Event) (Event, error)
	Counts(ctx context.Context, eventID uuid.UUID) (joined, waitlist, checkedIn int, err error)
}

type RegistrationRepository interface {
	// Join memutuskan sendiri antara slot utama dan daftar tunggu, karena
	// keputusan itu butuh pembacaan kapasitas dan penulisan yang tidak boleh
	// terpisah.
	Join(ctx context.Context, eventID, userID uuid.UUID) (Registration, error)
	Cancel(ctx context.Context, eventID, userID uuid.UUID) error
	ListByEvent(ctx context.Context, eventID uuid.UUID) ([]Registration, error)
	FindByEventAndUser(ctx context.Context, eventID, userID uuid.UUID) (*Registration, error)
	SetCheckedIn(ctx context.Context, eventID, userID uuid.UUID, checkedIn bool) error
	// PromoteWaitlist menaikkan peserta tunggu pertama setelah ada yang keluar.
	PromoteWaitlist(ctx context.Context, eventID uuid.UUID) (*uuid.UUID, error)
}

type MatchRepository interface {
	CreateBatch(ctx context.Context, matches []Match) ([]Match, error)
	ListByEvent(ctx context.Context, eventID uuid.UUID) ([]Match, error)
	FindByID(ctx context.Context, id uuid.UUID) (Match, error)
	MarkFinished(ctx context.Context, matchID uuid.UUID, playedAt time.Time) error
	MarkDisputed(ctx context.Context, matchID uuid.UUID) error
	ReplaceByEvent(ctx context.Context, eventID uuid.UUID) error
	RecentByUser(ctx context.Context, userID uuid.UUID, limit int) ([]Match, error)
}

type ScoreRepository interface {
	Upsert(ctx context.Context, s ScoreSubmission) (ScoreSubmission, error)
	FindByID(ctx context.Context, id uuid.UUID) (ScoreSubmission, error)
	Confirm(ctx context.Context, id, confirmedBy uuid.UUID) (ScoreSubmission, error)
	Dispute(ctx context.Context, id uuid.UUID, reason string) error
}

type RatingRepository interface {
	// Recalculate dipanggil setelah satu skor dikonfirmasi. Repo yang menentukan
	// urutan transaksi, service yang menentukan rumusnya.
	Get(ctx context.Context, userID, communityID uuid.UUID, sport Sport) (PlayerRating, error)
	Upsert(ctx context.Context, r PlayerRating) error
	Leaderboard(ctx context.Context, f LeaderboardFilter) ([]LeaderboardRow, error)
	Profile(ctx context.Context, userID uuid.UUID) (PlayerProfile, error)
}

type NotificationRepository interface {
	Create(ctx context.Context, n Notification) (Notification, error)
	ListRecent(ctx context.Context, userID uuid.UUID, limit int) ([]Notification, error)
	MarkRead(ctx context.Context, userID, id uuid.UUID) error
}

type AuditRepository interface {
	Record(ctx context.Context, a AuditEntry) error
}
