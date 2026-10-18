package repo

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"rallyup/server/internal/domain"
)

type RatingRepo struct{ pool *pgxpool.Pool }

func (r *RatingRepo) Get(ctx context.Context, userID, communityID uuid.UUID, sport domain.Sport) (domain.PlayerRating, error) {
	var pr domain.PlayerRating
	err := r.pool.QueryRow(ctx,
		`select user_id, community_id, sport, skill_rating::float8, season_points,
		        participation, matches, wins, losses, reliability::float8, updated_at
		 from player_ratings
		 where user_id = $1 and community_id = $2 and sport = $3`,
		userID, communityID, sport,
	).Scan(&pr.UserID, &pr.CommunityID, &pr.Sport, &pr.SkillRating, &pr.SeasonPoints,
		&pr.Participation, &pr.Matches, &pr.Wins, &pr.Losses, &pr.Reliability, &pr.UpdatedAt)
	if err != nil {
		return domain.PlayerRating{}, mapErr(err)
	}
	return pr, nil
}

func (r *RatingRepo) Upsert(ctx context.Context, pr domain.PlayerRating) error {
	_, err := r.pool.Exec(ctx,
		`insert into player_ratings
		   (user_id, community_id, sport, skill_rating, season_points, participation,
		    matches, wins, losses, reliability, updated_at)
		 values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
		 on conflict (user_id, community_id, sport) do update
		   set skill_rating = excluded.skill_rating,
		       season_points = excluded.season_points,
		       participation = excluded.participation,
		       matches = excluded.matches,
		       wins = excluded.wins,
		       losses = excluded.losses,
		       reliability = excluded.reliability,
		       updated_at = now()`,
		pr.UserID, pr.CommunityID, pr.Sport, pr.SkillRating, pr.SeasonPoints,
		pr.Participation, pr.Matches, pr.Wins, pr.Losses, pr.Reliability)
	return mapErr(err)
}

func (r *RatingRepo) Leaderboard(ctx context.Context, f domain.LeaderboardFilter) ([]domain.LeaderboardRow, error) {
	order := "skill_rating desc, matches desc"
	switch f.Kind {
	case domain.LeaderboardSeason:
		order = "season_points desc, skill_rating desc"
	case domain.LeaderboardParticipation:
		order = "participation desc, matches desc"
	}

	q := newQuery()
	q.where("pr.community_id = %s", f.CommunityID)
	q.where("pr.sport = %s", f.Sport)
	if f.Kind == domain.LeaderboardParticipation {
		q.where("pr.participation > 0")
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 50
	}

	sql := fmt.Sprintf(`
		select pr.user_id, u.name, u.avatar_color,
		       pr.skill_rating::float8, pr.season_points, pr.participation,
		       pr.matches, pr.wins, pr.losses, pr.reliability::float8
		from player_ratings pr
		join users u on u.id = pr.user_id
		%s
		order by %s
		limit %d`, q.clause(), order, limit)

	rows, err := r.pool.Query(ctx, sql, q.args...)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()

	out := []domain.LeaderboardRow{}
	for rows.Next() {
		var row domain.LeaderboardRow
		if err := rows.Scan(&row.UserID, &row.Name, &row.AvatarColor,
			&row.SkillRating, &row.SeasonPoints, &row.Participation,
			&row.Matches, &row.Wins, &row.Losses, &row.Reliability); err != nil {
			return nil, mapErr(err)
		}
		row.Provisional = row.Matches < domain.CalibrationMatches
		row.Rank = len(out) + 1
		out = append(out, row)
	}
	return out, mapErr(rows.Err())
}

func (r *RatingRepo) Profile(ctx context.Context, userID uuid.UUID) (domain.PlayerProfile, error) {
	var profile domain.PlayerProfile
	err := r.pool.QueryRow(ctx,
		`select id, name, email, avatar_color, created_at from users where id = $1`, userID,
	).Scan(&profile.User.ID, &profile.User.Name, &profile.User.Email,
		&profile.User.AvatarColor, &profile.User.CreatedAt)
	if err != nil {
		return domain.PlayerProfile{}, mapErr(err)
	}

	rows, err := r.pool.Query(ctx,
		`select user_id, community_id, sport, skill_rating::float8, season_points,
		        participation, matches, wins, losses, reliability::float8, updated_at
		 from player_ratings where user_id = $1
		 order by skill_rating desc`, userID)
	if err != nil {
		return domain.PlayerProfile{}, mapErr(err)
	}
	defer rows.Close()

	profile.Ratings = []domain.PlayerRating{}
	for rows.Next() {
		var pr domain.PlayerRating
		if err := rows.Scan(&pr.UserID, &pr.CommunityID, &pr.Sport, &pr.SkillRating,
			&pr.SeasonPoints, &pr.Participation, &pr.Matches, &pr.Wins, &pr.Losses,
			&pr.Reliability, &pr.UpdatedAt); err != nil {
			return domain.PlayerProfile{}, mapErr(err)
		}
		profile.Ratings = append(profile.Ratings, pr)
		profile.TotalMatches += pr.Matches
		profile.TotalWins += pr.Wins
	}
	if err := rows.Err(); err != nil {
		return domain.PlayerProfile{}, mapErr(err)
	}

	if len(profile.Ratings) > 0 {
		best := 0.0
		for _, pr := range profile.Ratings {
			if pr.SkillRating > best {
				best = pr.SkillRating
			}
		}
		profile.Level = levelFromRating(best)
	} else {
		profile.Level = 1
	}
	return profile, nil
}
