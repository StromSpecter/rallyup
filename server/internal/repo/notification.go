package repo

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"rallyup/server/internal/domain"
)

type NotificationRepo struct{ pool *pgxpool.Pool }

func (r *NotificationRepo) Create(ctx context.Context, n domain.Notification) (domain.Notification, error) {
	var out domain.Notification
	err := r.pool.QueryRow(ctx,
		`insert into notifications (user_id, type, title, body, link)
		 values ($1, $2, $3, $4, $5)
		 returning id, user_id, type, title, body, link, read_at, created_at`,
		n.UserID, n.Type, n.Title, n.Body, n.Link,
	).Scan(&out.ID, &out.UserID, &out.Type, &out.Title, &out.Body,
		&out.Link, &out.ReadAt, &out.CreatedAt)
	return out, mapErr(err)
}

func (r *NotificationRepo) ListRecent(ctx context.Context, userID uuid.UUID, limit int) ([]domain.Notification, error) {
	if limit <= 0 {
		limit = 30
	}
	rows, err := r.pool.Query(ctx,
		`select id, user_id, type, title, body, link, read_at, created_at
		 from notifications where user_id = $1
		 order by created_at desc limit $2`, userID, limit)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()

	out := []domain.Notification{}
	for rows.Next() {
		var n domain.Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Body,
			&n.Link, &n.ReadAt, &n.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, n)
	}
	return out, mapErr(rows.Err())
}

func (r *NotificationRepo) MarkRead(ctx context.Context, userID, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`update notifications set read_at = now() where id = $1 and user_id = $2 and read_at is null`,
		id, userID)
	return mapErr(err)
}

type AuditRepo struct{ pool *pgxpool.Pool }

func (r *AuditRepo) Record(ctx context.Context, a domain.AuditEntry) error {
	_, err := r.pool.Exec(ctx,
		`insert into audit_logs (actor_id, entity, entity_id, action, before, after)
		 values ($1, $2, $3, $4, $5, $6)`,
		a.ActorID, a.Entity, a.EntityID, a.Action, a.Before, a.After)
	return mapErr(err)
}
