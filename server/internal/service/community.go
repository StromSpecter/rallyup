package service

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"

	"rallyup/server/internal/domain"
)

type CommunityService struct {
	communities domain.CommunityRepository
}

func NewCommunityService(communities domain.CommunityRepository) *CommunityService {
	return &CommunityService{communities: communities}
}

type CreateCommunityInput struct {
	Name        string
	City        string
	Description string
}

func (s *CommunityService) Create(ctx context.Context, ownerID uuid.UUID, in CreateCommunityInput) (domain.Community, error) {
	name := strings.TrimSpace(in.Name)
	city := strings.TrimSpace(in.City)

	if len(name) < 3 {
		return domain.Community{}, fmt.Errorf("%w: nama komunitas minimal 3 karakter", domain.ErrInvalid)
	}
	if city == "" {
		return domain.Community{}, fmt.Errorf("%w: kota wajib diisi", domain.ErrInvalid)
	}

	community := domain.Community{
		Slug:        uniqueSlug(name, city),
		Name:        name,
		City:        city,
		Description: strings.TrimSpace(in.Description),
	}
	return s.communities.Create(ctx, community, ownerID)
}

func (s *CommunityService) List(ctx context.Context, userID *uuid.UUID) ([]domain.Community, error) {
	return s.communities.List(ctx, userID)
}

func (s *CommunityService) Get(ctx context.Context, slug string, userID *uuid.UUID) (domain.Community, *domain.MemberRole, error) {
	return s.communities.FindBySlug(ctx, slug, userID)
}

func (s *CommunityService) Update(ctx context.Context, slug string, userID uuid.UUID, name, city, description string) (domain.Community, error) {
	community, role, err := s.communities.FindBySlug(ctx, slug, &userID)
	if err != nil {
		return domain.Community{}, err
	}
	if role == nil || *role != domain.RoleOwner {
		return domain.Community{}, fmt.Errorf("%w: hanya pemilik yang bisa mengubah komunitas", domain.ErrForbidden)
	}

	name = strings.TrimSpace(name)
	city = strings.TrimSpace(city)
	if len(name) < 3 {
		return domain.Community{}, fmt.Errorf("%w: nama komunitas minimal 3 karakter", domain.ErrInvalid)
	}
	if city == "" {
		return domain.Community{}, fmt.Errorf("%w: kota wajib diisi", domain.ErrInvalid)
	}

	community.Name = name
	community.City = city
	community.Description = strings.TrimSpace(description)
	return s.communities.Update(ctx, community)
}

func (s *CommunityService) Join(ctx context.Context, slug string, userID uuid.UUID) (domain.Community, error) {
	community, _, err := s.communities.FindBySlug(ctx, slug, nil)
	if err != nil {
		return domain.Community{}, err
	}
	count, err := s.communities.Join(ctx, community.ID, userID)
	if err != nil {
		return domain.Community{}, err
	}
	community.MemberCount = count
	return community, nil
}

var slugPattern = regexp.MustCompile(`[^a-z0-9]+`)

// uniqueSlug membuang tanda baca dan memakai akhiran acak pendek supaya dua
// komunitas dengan nama sama di kota berbeda tetap punya alamat yang bisa
// dibagikan.
func uniqueSlug(name, city string) string {
	base := strings.ToLower(name + " " + city)
	base = slugPattern.ReplaceAllString(base, "-")
	base = strings.Trim(base, "-")
	if base == "" {
		base = "komunitas"
	}
	if len(base) > 48 {
		base = strings.Trim(base[:48], "-")
	}
	return fmt.Sprintf("%s-%s", base, uuid.NewString()[:6])
}
