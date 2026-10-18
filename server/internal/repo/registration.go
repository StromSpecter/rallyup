package repo

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"rallyup/server/internal/domain"
)

type RegistrationRepo struct{ pool *pgxpool.Pool }

// Ambang kalibrasi ditanam langsung ke SQL supaya nomor parameter tidak
// bergeser tiap kali kueri ini dipakai dengan filter berbeda.
var registrationSelect = fmt.Sprintf(`
	select r.id, r.event_id, r.user_id, r.status, r.checked_in, r.joined_at,
	       u.name, u.avatar_color,
	       coalesce((select avg(pr.skill_rating) from player_ratings pr
	                 where pr.user_id = r.user_id), 1200)::float8,
	       coalesce((select count(*) from player_ratings pr
	                 where pr.user_id = r.user_id and pr.matches >= %d), 0)
	from event_registrations r
	join users u on u.id = r.user_id`, domain.CalibrationMatches)

func scanRegistration(row rowScanner) (domain.Registration, error) {
	var g domain.Registration
	var calibrated int
	err := row.Scan(&g.ID, &g.EventID, &g.UserID, &g.Status, &g.CheckedIn, &g.JoinedAt,
		&g.UserName, &g.AvatarColor, &g.UserRating, &calibrated)
	// Level diturunkan dari rating saat dibaca, bukan disimpan terpisah, supaya
	// angka level dan angka rating tidak pernah bertentangan.
	if calibrated > 0 {
		g.UserLevel = levelFromRating(g.UserRating)
	}
	return g, err
}

// Join mengunci baris event lebih dulu supaya dua pendaftar bersamaan tidak
// bisa menembus kapasitas.
func (r *RegistrationRepo) Join(ctx context.Context, eventID, userID uuid.UUID) (domain.Registration, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.Registration{}, err
	}
	defer tx.Rollback(ctx)

	var capacity, joined int
	var status domain.EventStatus
	if err := tx.QueryRow(ctx,
		`select capacity, status from events where id = $1 for update`, eventID,
	).Scan(&capacity, &status); err != nil {
		return domain.Registration{}, mapErr(err)
	}
	if status != domain.EventPublished {
		return domain.Registration{}, domain.ErrInvalidState
	}

	if err := tx.QueryRow(ctx,
		`select count(*) from event_registrations
		 where event_id = $1 and status = 'joined'`, eventID,
	).Scan(&joined); err != nil {
		return domain.Registration{}, mapErr(err)
	}

	slot := domain.RegWaitlist
	if joined < capacity {
		slot = domain.RegJoined
	}

	var id uuid.UUID
	if err := tx.QueryRow(ctx,
		`insert into event_registrations (event_id, user_id, status, checked_in, joined_at)
		 values ($1, $2, $3, false, now())
		 on conflict (event_id, user_id) do update
		   set status = excluded.status, checked_in = false, joined_at = now()
		 returning id`,
		eventID, userID, slot,
	).Scan(&id); err != nil {
		return domain.Registration{}, mapErr(err)
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.Registration{}, mapErr(err)
	}
	return r.findByID(ctx, id)
}

func (r *RegistrationRepo) findByID(ctx context.Context, id uuid.UUID) (domain.Registration, error) {
	g, err := scanRegistration(r.pool.QueryRow(ctx, registrationSelect+" where r.id = $1", id))
	return g, mapErr(err)
}

func (r *RegistrationRepo) Cancel(ctx context.Context, eventID, userID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx,
		`update event_registrations
		 set status = 'cancelled', checked_in = false
		 where event_id = $1 and user_id = $2 and status <> 'cancelled'`,
		eventID, userID)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *RegistrationRepo) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]domain.Registration, error) {
	rows, err := r.pool.Query(ctx, registrationSelect+`
		 where r.event_id = $1 and r.status <> 'cancelled'
		 order by r.checked_in desc, r.status asc, r.joined_at asc`, eventID)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()

	out := []domain.Registration{}
	for rows.Next() {
		g, err := scanRegistration(rows)
		if err != nil {
			return nil, mapErr(err)
		}
		out = append(out, g)
	}
	return out, mapErr(rows.Err())
}

func (r *RegistrationRepo) FindByEventAndUser(ctx context.Context, eventID, userID uuid.UUID) (*domain.Registration, error) {
	g, err := scanRegistration(r.pool.QueryRow(ctx,
		registrationSelect+" where r.event_id = $1 and r.user_id = $2", eventID, userID))
	if err != nil {
		if mapErr(err) == domain.ErrNotFound {
			return nil, nil
		}
		return nil, mapErr(err)
	}
	return &g, nil
}

func (r *RegistrationRepo) SetCheckedIn(ctx context.Context, eventID, userID uuid.UUID, checkedIn bool) error {
	tag, err := r.pool.Exec(ctx,
		`update event_registrations set checked_in = $3
		 where event_id = $1 and user_id = $2 and status = 'joined'`,
		eventID, userID, checkedIn)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrInvalidState
	}
	return nil
}

// PromoteWaitlist menaikkan peserta tunggu terlama ke slot utama. skip locked
// mencegah dua promosi bersamaan mengambil baris yang sama.
func (r *RegistrationRepo) PromoteWaitlist(ctx context.Context, eventID uuid.UUID) (*uuid.UUID, error) {
	var userID uuid.UUID
	err := r.pool.QueryRow(ctx,
		`update event_registrations set status = 'joined'
		 where id = (
		   select id from event_registrations
		   where event_id = $1 and status = 'waitlist'
		   order by joined_at asc
		   limit 1
		   for update skip locked
		 )
		 returning user_id`, eventID,
	).Scan(&userID)
	if err != nil {
		if mapErr(err) == domain.ErrNotFound {
			return nil, nil
		}
		return nil, mapErr(err)
	}
	return &userID, nil
}

// levelFromRating memetakan rating ke skala 1..7 yang dipakai saat membuat event.
func levelFromRating(rating float64) int {
	switch {
	case rating < 1050:
		return 1
	case rating < 1200:
		return 2
	case rating < 1350:
		return 3
	case rating < 1500:
		return 4
	case rating < 1650:
		return 5
	case rating < 1800:
		return 6
	default:
		return 7
	}
}
