package repo

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"rallyup/server/internal/domain"
)

// Store menampung pool dan menyediakan setiap repository dari satu tempat.
// Handler cukup menerima antarmuka yang dibutuhkannya, bukan seluruh Store.
type Store struct {
	Pool *pgxpool.Pool

	Users         *UserRepo
	Communities   *CommunityRepo
	Events        *EventRepo
	Registrations *RegistrationRepo
	Matches       *MatchRepo
	Scores        *ScoreRepo
	Ratings       *RatingRepo
	Notifications *NotificationRepo
	Audit         *AuditRepo
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{
		Pool:          pool,
		Users:         &UserRepo{pool},
		Communities:   &CommunityRepo{pool},
		Events:        &EventRepo{pool},
		Registrations: &RegistrationRepo{pool},
		Matches:       &MatchRepo{pool},
		Scores:        &ScoreRepo{pool},
		Ratings:       &RatingRepo{pool},
		Notifications: &NotificationRepo{pool},
		Audit:         &AuditRepo{pool},
	}
}

// mapErr menerjemahkan error driver ke error domain. Hanya kode yang benar-benar
// dipakai yang diterjemahkan, sisanya dilewatkan apa adanya.
func mapErr(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return fmt.Errorf("%w: %s", domain.ErrConflict, pgErr.ConstraintName)
		case "23503":
			return fmt.Errorf("%w: referensi tidak ada", domain.ErrInvalid)
		case "23514":
			return fmt.Errorf("%w: nilai di luar batas kolom", domain.ErrInvalid)
		}
	}
	return err
}
