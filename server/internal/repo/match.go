package repo

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"rallyup/server/internal/domain"
)

type MatchRepo struct{ pool *pgxpool.Pool }

// ListByEvent mengambil pertandingan beserta pemain dan skor terakhir dalam
// tiga kueri, bukan satu kueri per pertandingan.
func (r *MatchRepo) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]domain.Match, error) {
	rows, err := r.pool.Query(ctx,
		`select id, event_id, court, round, status, played_at
		 from matches where event_id = $1
		 order by round asc, court asc`, eventID)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()

	matches := []domain.Match{}
	index := map[uuid.UUID]int{}
	for rows.Next() {
		var m domain.Match
		if err := rows.Scan(&m.ID, &m.EventID, &m.Court, &m.Round, &m.Status, &m.PlayedAt); err != nil {
			return nil, mapErr(err)
		}
		m.Players = []domain.MatchPlayer{}
		index[m.ID] = len(matches)
		matches = append(matches, m)
	}
	if err := rows.Err(); err != nil {
		return nil, mapErr(err)
	}
	if len(matches) == 0 {
		return matches, nil
	}

	ids := make([]uuid.UUID, 0, len(matches))
	for _, m := range matches {
		ids = append(ids, m.ID)
	}
	if err := r.attachPlayers(ctx, ids, matches, index); err != nil {
		return nil, err
	}
	if err := r.attachScores(ctx, ids, matches, index); err != nil {
		return nil, err
	}
	return matches, nil
}

func (r *MatchRepo) attachPlayers(ctx context.Context, ids []uuid.UUID, matches []domain.Match, index map[uuid.UUID]int) error {
	rows, err := r.pool.Query(ctx,
		`select mp.match_id, mp.user_id, u.name, mp.team, u.avatar_color
		 from match_players mp
		 join users u on u.id = mp.user_id
		 where mp.match_id = any($1)
		 order by mp.team asc, u.name asc`, ids)
	if err != nil {
		return mapErr(err)
	}
	defer rows.Close()

	for rows.Next() {
		var matchID uuid.UUID
		var p domain.MatchPlayer
		if err := rows.Scan(&matchID, &p.UserID, &p.UserName, &p.Team, &p.AvatarColor); err != nil {
			return mapErr(err)
		}
		i := index[matchID]
		matches[i].Players = append(matches[i].Players, p)
	}
	return mapErr(rows.Err())
}

func (r *MatchRepo) attachScores(ctx context.Context, ids []uuid.UUID, matches []domain.Match, index map[uuid.UUID]int) error {
	rows, err := r.pool.Query(ctx,
		`select match_id, id, submitted_by, sets, status, confirmed_by, dispute_reason, created_at
		 from score_submissions where match_id = any($1)`, ids)
	if err != nil {
		return mapErr(err)
	}
	defer rows.Close()

	for rows.Next() {
		var matchID uuid.UUID
		var s domain.ScoreSubmission
		if err := rows.Scan(&matchID, &s.ID, &s.SubmittedBy, &s.Sets, &s.Status,
			&s.ConfirmedBy, &s.DisputeReason, &s.CreatedAt); err != nil {
			return mapErr(err)
		}
		s.MatchID = matchID
		i := index[matchID]
		matches[i].Score = &s
	}
	return mapErr(rows.Err())
}

func (r *MatchRepo) FindByID(ctx context.Context, id uuid.UUID) (domain.Match, error) {
	var m domain.Match
	err := r.pool.QueryRow(ctx,
		`select id, event_id, court, round, status, played_at from matches where id = $1`, id,
	).Scan(&m.ID, &m.EventID, &m.Court, &m.Round, &m.Status, &m.PlayedAt)
	if err != nil {
		return domain.Match{}, mapErr(err)
	}

	matches := []domain.Match{m}
	index := map[uuid.UUID]int{m.ID: 0}
	if err := r.attachPlayers(ctx, []uuid.UUID{m.ID}, matches, index); err != nil {
		return domain.Match{}, err
	}
	if err := r.attachScores(ctx, []uuid.UUID{m.ID}, matches, index); err != nil {
		return domain.Match{}, err
	}
	return matches[0], nil
}

// CreateBatch menulis hasil pairing dalam satu transaksi. Pairing yang gagal
// separuh jalan akan meninggalkan jadwal yang tidak bisa dipakai.
func (r *MatchRepo) CreateBatch(ctx context.Context, matches []domain.Match) ([]domain.Match, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var eventID uuid.UUID
	for _, m := range matches {
		eventID = m.EventID
		var matchID uuid.UUID
		if err := tx.QueryRow(ctx,
			`insert into matches (event_id, court, round) values ($1, $2, $3) returning id`,
			m.EventID, m.Court, m.Round,
		).Scan(&matchID); err != nil {
			return nil, mapErr(err)
		}
		for _, p := range m.Players {
			if _, err := tx.Exec(ctx,
				`insert into match_players (match_id, user_id, team) values ($1, $2, $3)`,
				matchID, p.UserID, p.Team); err != nil {
				return nil, mapErr(err)
			}
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, mapErr(err)
	}
	return r.ListByEvent(ctx, eventID)
}

// ReplaceByEvent menghapus jadwal lama sebelum pairing ulang.
func (r *MatchRepo) ReplaceByEvent(ctx context.Context, eventID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`delete from matches where event_id = $1 and status = 'scheduled'`, eventID)
	return mapErr(err)
}

func (r *MatchRepo) MarkFinished(ctx context.Context, matchID uuid.UUID, playedAt time.Time) error {
	_, err := r.pool.Exec(ctx,
		`update matches set status = 'finished', played_at = $2 where id = $1`, matchID, playedAt)
	return mapErr(err)
}

func (r *MatchRepo) MarkDisputed(ctx context.Context, matchID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`update matches set status = 'disputed' where id = $1`, matchID)
	return mapErr(err)
}

func (r *MatchRepo) RecentByUser(ctx context.Context, userID uuid.UUID, limit int) ([]domain.Match, error) {
	rows, err := r.pool.Query(ctx,
		`select distinct m.id
		 from matches m
		 join match_players mp on mp.match_id = m.id
		 where mp.user_id = $1 and m.status in ('finished', 'disputed')
		 order by m.id
		 limit $2`, userID, limit)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, mapErr(err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, mapErr(err)
	}

	out := []domain.Match{}
	for _, id := range ids {
		m, err := r.FindByID(ctx, id)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, nil
}
