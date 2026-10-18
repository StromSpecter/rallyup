package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"rallyup/server/internal/domain"
	"rallyup/server/internal/pkg/password"
	"rallyup/server/internal/pkg/token"
)

type AuthService struct {
	users  domain.UserRepository
	tokens *token.Manager
}

func NewAuthService(users domain.UserRepository, tokens *token.Manager) *AuthService {
	return &AuthService{users: users, tokens: tokens}
}

type RegisterInput struct {
	Name     string
	Email    string
	Password string
}

func (s *AuthService) Register(ctx context.Context, in RegisterInput) (domain.User, token.Pair, error) {
	name := strings.TrimSpace(in.Name)
	email := strings.TrimSpace(strings.ToLower(in.Email))

	if len(name) < 2 {
		return domain.User{}, token.Pair{}, fmt.Errorf("%w: nama minimal 2 karakter", domain.ErrInvalid)
	}
	if !strings.Contains(email, "@") || len(email) < 5 {
		return domain.User{}, token.Pair{}, fmt.Errorf("%w: email tidak valid", domain.ErrInvalid)
	}
	if len(in.Password) < 8 {
		return domain.User{}, token.Pair{}, fmt.Errorf("%w: password minimal 8 karakter", domain.ErrInvalid)
	}

	hash, err := password.Hash(in.Password)
	if err != nil {
		return domain.User{}, token.Pair{}, err
	}

	user, err := s.users.Create(ctx, name, email, hash, AvatarColor(email))
	if err != nil {
		if errors.Is(err, domain.ErrConflict) {
			return domain.User{}, token.Pair{}, fmt.Errorf("%w: email sudah terdaftar", domain.ErrConflict)
		}
		return domain.User{}, token.Pair{}, err
	}

	pair, err := s.tokens.Issue(user.ID)
	return user, pair, err
}

func (s *AuthService) Login(ctx context.Context, email, plain string) (domain.User, token.Pair, error) {
	found, err := s.users.FindByEmail(ctx, strings.TrimSpace(email))
	if err != nil {
		return domain.User{}, token.Pair{}, domain.ErrUnauthorized
	}
	if !password.Verify(found.PasswordHash, plain) {
		return domain.User{}, token.Pair{}, domain.ErrUnauthorized
	}

	pair, err := s.tokens.Issue(found.ID)
	return found.User, pair, err
}

// Refresh hanya menerbitkan token baru. Pemanggil bertanggung jawab mencabut
// cookie lama di sisi klien.
func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (domain.User, token.Pair, error) {
	userID, err := s.tokens.Verify(refreshToken, "refresh")
	if err != nil {
		return domain.User{}, token.Pair{}, domain.ErrUnauthorized
	}
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return domain.User{}, token.Pair{}, domain.ErrUnauthorized
	}
	pair, err := s.tokens.Issue(userID)
	return user, pair, err
}

func (s *AuthService) Me(ctx context.Context, userID uuid.UUID) (domain.User, error) {
	return s.users.FindByID(ctx, userID)
}

func (s *AuthService) Update(ctx context.Context, userID uuid.UUID, name, avatarColor string) (domain.User, error) {
	name = strings.TrimSpace(name)
	if name != "" && len(name) < 2 {
		return domain.User{}, fmt.Errorf("%w: nama minimal 2 karakter", domain.ErrInvalid)
	}
	if avatarColor != "" && !strings.HasPrefix(avatarColor, "#") {
		return domain.User{}, fmt.Errorf("%w: warna avatar harus format heksadesimal", domain.ErrInvalid)
	}
	return s.users.Update(ctx, userID, name, avatarColor)
}
