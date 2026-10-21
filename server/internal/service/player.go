package service

import (
	"context"

	"github.com/google/uuid"

	"rallyup/server/internal/domain"
	"rallyup/server/internal/stream"
)

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
