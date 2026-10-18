package repo

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"rallyup/server/internal/domain"
)

type CommunityRepo struct{ pool *pgxpool.Pool }

const communityColumns = `c.id, c.slug, c.name, c.city, c.description,
	c.created_by,
	(select count(*) from community_members m where m.community_id = c.id), c.created_at`

// Create menyimpan komunitas dan keanggotaan owner dalam satu transaksi.
// Komunitas tanpa owner adalah data rusak, jadi keduanya tidak boleh terpisah.
func (r *CommunityRepo) Create(ctx context.Context, c domain.Community, ownerID uuid.UUID) (domain.Community, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.Community{}, err
	}
	defer tx.Rollback(ctx)

	var out domain.Community
	err = tx.QueryRow(ctx,
		`insert into communities (slug, name, city, description, created_by)
		 values ($1, $2, $3, $4, $5)
		 returning id, slug, name, city, description, 1, created_at`,
		c.Slug, c.Name, c.City, c.Description, ownerID,
	).Scan(&out.ID, &out.Slug, &out.Name, &out.City,
		&out.Description, &out.MemberCount, &out.CreatedAt)
	out.CreatedBy = ownerID
	if err != nil {
		return domain.Community{}, mapErr(err)
	}

	if _, err := tx.Exec(ctx,
		`insert into community_members (community_id, user_id, role) values ($1, $2, 'owner')`,
		out.ID, ownerID,
	); err != nil {
		return domain.Community{}, mapErr(err)
	}

	return out, mapErr(tx.Commit(ctx))
}

func (r *CommunityRepo) List(ctx context.Context, userID *uuid.UUID) ([]domain.Community, error) {
	rows, err := r.pool.Query(ctx,
		`select `+communityColumns+`
		 from communities c
		 order by (select count(*) from community_members m2 where m2.community_id = c.id) desc,
		          c.name asc`)
	if err != nil {
		return nil, mapErr(err)
	}
	defer rows.Close()

	out := []domain.Community{}
	for rows.Next() {
		var c domain.Community
		if err := rows.Scan(&c.ID, &c.Slug, &c.Name, &c.City,
			&c.Description, &c.CreatedBy, &c.MemberCount, &c.CreatedAt); err != nil {
			return nil, mapErr(err)
		}
		out = append(out, c)
	}
	return out, mapErr(rows.Err())
}

func (r *CommunityRepo) Update(ctx context.Context, c domain.Community) (domain.Community, error) {
	_, err := r.pool.Exec(ctx,
		`update communities set name = $2, city = $3, description = $4 where id = $1`,
		c.ID, c.Name, c.City, c.Description)
	if err != nil {
		return domain.Community{}, mapErr(err)
	}

	var out domain.Community
	err = r.pool.QueryRow(ctx,
		`select `+communityColumns+` from communities c where c.id = $1`, c.ID,
	).Scan(&out.ID, &out.Slug, &out.Name, &out.City,
		&out.Description, &out.CreatedBy, &out.MemberCount, &out.CreatedAt)
	return out, mapErr(err)
}

func (r *CommunityRepo) FindBySlug(ctx context.Context, slug string, userID *uuid.UUID) (domain.Community, *domain.MemberRole, error) {
	var c domain.Community
	err := r.pool.QueryRow(ctx,
		`select `+communityColumns+` from communities c where c.slug = $1`, slug,
	).Scan(&c.ID, &c.Slug, &c.Name, &c.City, &c.Description, &c.CreatedBy, &c.MemberCount, &c.CreatedAt)
	if err != nil {
		return domain.Community{}, nil, mapErr(err)
	}

	var role *domain.MemberRole
	if userID != nil {
		var raw string
		err := r.pool.QueryRow(ctx,
			`select role from community_members where community_id = $1 and user_id = $2`,
			c.ID, *userID,
		).Scan(&raw)
		if err == nil {
			r := domain.MemberRole(raw)
			role = &r
		} else if err != nil && mapErr(err) != domain.ErrNotFound {
			return domain.Community{}, nil, mapErr(err)
		}
	}
	return c, role, nil
}

func (r *CommunityRepo) FindOrCreateMembership(ctx context.Context, communityID, userID uuid.UUID, role domain.MemberRole) error {
	_, err := r.pool.Exec(ctx,
		`insert into community_members (community_id, user_id, role)
		 values ($1, $2, $3)
		 on conflict (community_id, user_id) do nothing`,
		communityID, userID, role)
	return mapErr(err)
}

func (r *CommunityRepo) Join(ctx context.Context, communityID, userID uuid.UUID) (int, error) {
	if _, err := r.pool.Exec(ctx,
		`insert into community_members (community_id, user_id, role) values ($1, $2, 'member')
		 on conflict (community_id, user_id) do nothing`,
		communityID, userID,
	); err != nil {
		return 0, mapErr(err)
	}

	var count int
	err := r.pool.QueryRow(ctx,
		`select count(*) from community_members where community_id = $1`, communityID,
	).Scan(&count)
	return count, mapErr(err)
}

func (r *CommunityRepo) IsMember(ctx context.Context, communityID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`select exists (select 1 from community_members where community_id = $1 and user_id = $2)`,
		communityID, userID,
	).Scan(&exists)
	return exists, mapErr(err)
}
