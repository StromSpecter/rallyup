package repo

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"rallyup/server/internal/domain"
)

type UserRepo struct{ pool *pgxpool.Pool }

const userColumns = `id, name, email, avatar_color, created_at`

func (r *UserRepo) Create(ctx context.Context, name, email, hash, avatarColor string) (domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx,
		`insert into users (name, email, password_hash, avatar_color)
		 values ($1, lower($2), $3, $4)
		 returning `+userColumns,
		name, email, hash, avatarColor,
	).Scan(&u.ID, &u.Name, &u.Email, &u.AvatarColor, &u.CreatedAt)
	return u, mapErr(err)
}

func (r *UserRepo) FindByEmail(ctx context.Context, email string) (domain.UserWithHash, error) {
	var u domain.UserWithHash
	err := r.pool.QueryRow(ctx,
		`select `+userColumns+`, password_hash from users where lower(email) = lower($1)`,
		email,
	).Scan(&u.ID, &u.Name, &u.Email, &u.AvatarColor, &u.CreatedAt, &u.PasswordHash)
	return u, mapErr(err)
}

func (r *UserRepo) FindByID(ctx context.Context, id uuid.UUID) (domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx,
		`select `+userColumns+` from users where id = $1`, id,
	).Scan(&u.ID, &u.Name, &u.Email, &u.AvatarColor, &u.CreatedAt)
	return u, mapErr(err)
}

func (r *UserRepo) Update(ctx context.Context, id uuid.UUID, name, avatarColor string) (domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx,
		`update users set
		   name = coalesce(nullif($2, ''), name),
		   avatar_color = coalesce(nullif($3, ''), avatar_color),
		   updated_at = now()
		 where id = $1
		 returning `+userColumns,
		id, name, avatarColor,
	).Scan(&u.ID, &u.Name, &u.Email, &u.AvatarColor, &u.CreatedAt)
	return u, mapErr(err)
}
