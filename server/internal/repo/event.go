package repo

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"rallyup/server/internal/domain"
)

type EventRepo struct{ pool *pgxpool.Pool }

const eventSelect = `
	select e.id, e.community_id, c.slug, c.name, e.organizer_id, u.name,
	       e.title, e.sport, e.format, e.venue, e.city, e.starts_at, e.ends_at,
	       e.capacity, e.fee, e.level_min, e.level_max, e.status, e.notes,
	       (select count(*) from event_registrations r
	         where r.event_id = e.id and r.status = 'joined'),
	       (select count(*) from event_registrations r
	         where r.event_id = e.id and r.status = 'waitlist'),
	       (select count(*) from event_registrations r
	         where r.event_id = e.id and r.status = 'joined' and r.checked_in),
	       e.created_at
	from events e
	join communities c on c.id = e.community_id
	join users u on u.id = e.organizer_id`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanEvent(row rowScanner) (domain.Event, error) {
	var e domain.Event
	err := row.Scan(&e.ID, &e.CommunityID, &e.CommunitySlug, &e.CommunityName,
		&e.OrganizerID, &e.OrganizerName, &e.Title, &e.Sport, &e.Format,
		&e.Venue, &e.City, &e.StartsAt, &e.EndsAt, &e.Capacity, &e.Fee,
		&e.LevelMin, &e.LevelMax, &e.Status, &e.Notes,
		&e.JoinedCount, &e.WaitlistCount, &e.CheckedInCount, &e.CreatedAt)
	return e, err
}

func (r *EventRepo) Create(ctx context.Context, e domain.Event) (domain.Event, error) {
	var id uuid.UUID
	err := r.pool.QueryRow(ctx,
		`insert into events (community_id, organizer_id, title, sport, format, venue, city,
		                     starts_at, ends_at, capacity, fee, level_min, level_max, status, notes)
		 values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		 returning id`,
		e.CommunityID, e.OrganizerID, e.Title, e.Sport, e.Format, e.Venue, e.City,
		e.StartsAt, e.EndsAt, e.Capacity, e.Fee, e.LevelMin, e.LevelMax, e.Status, e.Notes,
	).Scan(&id)
	if err != nil {
		return domain.Event{}, mapErr(err)
	}
	return r.FindByID(ctx, id)
}

func (r *EventRepo) List(ctx context.Context, f domain.ListEventsFilter) ([]domain.Event, error) {
	q := newQuery()

	if f.CommunitySlug != "" {
		q.where("c.slug = %s", f.CommunitySlug)
	}
	if f.Sport != "" {
		q.where("e.sport = %s", f.Sport)
	}
	if len(f.Status) > 0 {
		q.where("e.status = any(%s)", f.Status)
	}
	if f.Query != "" {
		like := "%" + f.Query + "%"
		q.where("(e.title ilike %s or e.venue ilike %s or e.city ilike %s)", like, like, like)
	}
	if f.From != nil {
		q.where("e.starts_at >= %s", *f.From)
	}
	if f.To != nil {
		q.where("e.starts_at <= %s", *f.To)
	}
	if f.OrganizerID != nil {
		q.where("e.organizer_id = %s", *f.OrganizerID)
	}
	if f.ParticipantID != nil {
		q.where(`exists (select 1 from event_registrations r
		                  where r.event_id = e.id and r.user_id = %s and r.status <> 'cancelled')`,
			*f.ParticipantID)
	}

	sql := eventSelect + q.clause() + " order by e.starts_at asc" + q.paging(f.Limit, f.Offset)

	rows, err := r.pool.Query(ctx, sql, q.args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()

	out := []domain.Event{}
	for rows.Next() {
		e, err := scanEvent(rows)
		if err != nil {
			return nil, mapErr(err)
		}
		out = append(out, e)
	}
	return out, mapErr(rows.Err())
}

func (r *EventRepo) FindByID(ctx context.Context, id uuid.UUID) (domain.Event, error) {
	e, err := scanEvent(r.pool.QueryRow(ctx, eventSelect+" where e.id = $1", id))
	return e, mapErr(err)
}

func (r *EventRepo) Update(ctx context.Context, e domain.Event) (domain.Event, error) {
	_, err := r.pool.Exec(ctx,
		`update events set
		   title = $2, venue = $3, city = $4, starts_at = $5, ends_at = $6,
		   capacity = $7, fee = $8, level_min = $9, level_max = $10,
		   status = $11, notes = $12, format = $13, updated_at = now()
		 where id = $1`,
		e.ID, e.Title, e.Venue, e.City, e.StartsAt, e.EndsAt, e.Capacity, e.Fee,
		e.LevelMin, e.LevelMax, e.Status, e.Notes, e.Format)
	if err != nil {
		return domain.Event{}, mapErr(err)
	}
	return r.FindByID(ctx, e.ID)
}

func (r *EventRepo) Counts(ctx context.Context, eventID uuid.UUID) (int, int, int, error) {
	var joined, waitlist, checkedIn int
	err := r.pool.QueryRow(ctx,
		`select
		   count(*) filter (where status = 'joined'),
		   count(*) filter (where status = 'waitlist'),
		   count(*) filter (where status = 'joined' and checked_in)
		 from event_registrations where event_id = $1`, eventID,
	).Scan(&joined, &waitlist, &checkedIn)
	return joined, waitlist, checkedIn, mapErr(err)
}
