package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"rallyup/server/internal/domain"
	"rallyup/server/internal/stream"
)

type LeaderboardService struct {
	communities domain.CommunityRepository
	ratings     domain.RatingRepository
	broker      *stream.Broker
}

func NewLeaderboardService(communities domain.CommunityRepository, ratings domain.RatingRepository, broker *stream.Broker) *LeaderboardService {
	return &LeaderboardService{communities: communities, ratings: ratings, broker: broker}
}

// Board adalah keluaran papan peringkat beserta keterangan komunitasnya,
// supaya klien tidak perlu meminta dua kali.
type Board struct {
	Community domain.Community        `json:"community"`
	Sport     domain.Sport            `json:"sport"`
	Kind      domain.LeaderboardKind  `json:"kind"`
	Rows      []domain.LeaderboardRow `json:"rows"`
}

func (s *LeaderboardService) Board(ctx context.Context, communitySlug string, sport domain.Sport, kind domain.LeaderboardKind, limit int) (Board, error) {
	community, _, err := s.communities.FindBySlug(ctx, communitySlug, nil)
	if err != nil {
		return Board{}, err
	}
	if !sport.Valid() {
		return Board{}, fmt.Errorf("%w: cabang olahraga harus padel atau tennis", domain.ErrInvalid)
	}
	if !kind.Valid() {
		return Board{}, fmt.Errorf("%w: jenis papan peringkat tidak dikenal", domain.ErrInvalid)
	}

	rows, err := s.ratings.Leaderboard(ctx, domain.LeaderboardFilter{
		CommunityID: community.ID,
		Sport:       sport,
		Kind:        kind,
		Limit:       limit,
	})
	if err != nil {
		return Board{}, err
	}

	return Board{Community: community, Sport: sport, Kind: kind, Rows: rows}, nil
}

// Publish mengirim papan terbaru ke pelanggan SSE. Dipanggil setelah ada hasil
// yang terkonfirmasi atau setelah organizer menyusun jadwal baru.
func (s *LeaderboardService) Publish(ctx context.Context, communitySlug string, sport domain.Sport) {
	community, _, err := s.communities.FindBySlug(ctx, communitySlug, nil)
	if err != nil {
		return
	}
	rows, err := s.ratings.Leaderboard(ctx, domain.LeaderboardFilter{
		CommunityID: community.ID,
		Sport:       sport,
		Kind:        domain.LeaderboardSkill,
		Limit:       50,
	})
	if err != nil {
		return
	}
	s.broker.PublishNamed(stream.TopicLeaderboard(communitySlug, string(sport)), "leaderboard", map[string]any{
		"communitySlug": communitySlug,
		"sport":         sport,
		"kind":          domain.LeaderboardSkill,
		"rows":          rows,
	})
}

type PlayerService struct {
	ratings domain.RatingRepository
	matches domain.MatchRepository
}

func NewPlayerService(ratings domain.RatingRepository, matches domain.MatchRepository) *PlayerService {
	return &PlayerService{ratings: ratings, matches: matches}
}

func (s *PlayerService) Profile(ctx context.Context, userID uuid.UUID) (domain.PlayerProfile, error) {
	return s.ratings.Profile(ctx, userID)
}

func (s *PlayerService) History(ctx context.Context, userID uuid.UUID, limit int) ([]domain.Match, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	return s.matches.RecentByUser(ctx, userID, limit)
}

type NotificationService struct {
	notifications domain.NotificationRepository
	broker        *stream.Broker
}

func NewNotificationService(notifications domain.NotificationRepository, broker *stream.Broker) *NotificationService {
	return &NotificationService{notifications: notifications, broker: broker}
}

// Notify menyimpan notifikasi lalu mendorongnya ke koneksi SSE pemiliknya.
// Kegagalan pengiriman tidak membatalkan aksi utama yang sedang berjalan.
func (s *NotificationService) Notify(ctx context.Context, userID uuid.UUID, kind, title, body, link string) {
	created, err := s.notifications.Create(ctx, domain.Notification{
		UserID: userID,
		Type:   kind,
		Title:  title,
		Body:   body,
		Link:   link,
	})
	if err != nil {
		return
	}
	s.broker.PublishNamed(stream.TopicUser(userID.String()), "notification", created)
}

func (s *NotificationService) List(ctx context.Context, userID uuid.UUID) ([]domain.Notification, error) {
	return s.notifications.ListRecent(ctx, userID, 30)
}

func (s *NotificationService) MarkRead(ctx context.Context, userID, id uuid.UUID) error {
	return s.notifications.MarkRead(ctx, userID, id)
}
