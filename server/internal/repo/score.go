package repo

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"rallyup/server/internal/domain"
)

type ScoreRepo struct{ pool *pgxpool.Pool }

func (r *ScoreRepo) Upsert(ctx context.Context, s domain.ScoreSubmission) (domain.ScoreSubmission, error) {
	var out domain.ScoreSubmission
	err := r.pool.QueryRow(ctx,
		`insert into score_submissions (match_id, submitted_by, sets, status, dispute_reason, created_at)
		 values ($1, $2, $3, 'pending', '', now())
		 on conflict (match_id) do update
		   set submitted_by = excluded.submitted_by,
		       sets = excluded.sets,
		       status = 'pending',
		       confirmed_by = null,
		       confirmed_at = null,
		       dispute_reason = '',
		       created_at = now()
		 returning id, match_id, submitted_by, sets, status, confirmed_by, dispute_reason, created_at`,
		s.MatchID, s.SubmittedBy, s.Sets,
	).Scan(&out.ID, &out.MatchID, &out.SubmittedBy, &out.Sets, &out.Status,
		&out.ConfirmedBy, &out.DisputeReason, &out.CreatedAt)
	return out, mapErr(err)
}

func (r *ScoreRepo) FindByID(ctx context.Context, id uuid.UUID) (domain.ScoreSubmission, error) {
	var s domain.ScoreSubmission
	err := r.pool.QueryRow(ctx,
		`select id, match_id, submitted_by, sets, status, confirmed_by, dispute_reason, created_at
		 from score_submissions where id = $1`, id,
	).Scan(&s.ID, &s.MatchID, &s.SubmittedBy, &s.Sets, &s.Status,
		&s.ConfirmedBy, &s.DisputeReason, &s.CreatedAt)
	return s, mapErr(err)
}

func (r *ScoreRepo) Confirm(ctx context.Context, id, confirmedBy uuid.UUID) (domain.ScoreSubmission, error) {
	var s domain.ScoreSubmission
	err := r.pool.QueryRow(ctx,
		`update score_submissions
		 set status = 'confirmed', confirmed_by = $2, confirmed_at = now()
		 where id = $1 and status <> 'confirmed'
		 returning id, match_id, submitted_by, sets, status, confirmed_by, dispute_reason, created_at`,
		id, confirmedBy,
	).Scan(&s.ID, &s.MatchID, &s.SubmittedBy, &s.Sets, &s.Status,
		&s.ConfirmedBy, &s.DisputeReason, &s.CreatedAt)
	return s, mapErr(err)
}

func (r *ScoreRepo) Dispute(ctx context.Context, id uuid.UUID, reason string) error {
	tag, err := r.pool.Exec(ctx,
		`update score_submissions set status = 'disputed', dispute_reason = $2
		 where id = $1 and status <> 'confirmed'`, id, reason)
	if err != nil {
		return mapErr(err)
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrInvalidState
	}
	return nil
}
