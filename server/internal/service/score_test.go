package service

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"rallyup/server/internal/domain"
)

// fakeEvents dan fakeRatings hanya mengisi metode yang dipakai applyRatings.
// Sisanya dipinjam dari antarmuka supaya pengujian ini tidak perlu memalsukan
// seluruh kontrak repository.
type fakeEvents struct {
	domain.EventRepository
	event domain.Event
}

func (f fakeEvents) FindByID(context.Context, uuid.UUID) (domain.Event, error) {
	return f.event, nil
}

type fakeRatings struct {
	domain.RatingRepository
	rows map[uuid.UUID]domain.PlayerRating
}

func (f *fakeRatings) Get(_ context.Context, userID, _ uuid.UUID, _ domain.Sport) (domain.PlayerRating, error) {
	if pr, ok := f.rows[userID]; ok {
		return pr, nil
	}
	return domain.PlayerRating{}, domain.ErrNotFound
}

func (f *fakeRatings) Upsert(_ context.Context, pr domain.PlayerRating) error {
	f.rows[pr.UserID] = pr
	return nil
}

// Pemain yang baru pertama kali bertanding harus mulai dari StartRating, sama
// seperti yang dipakai saat menghitung selisih. Sebelum diperbaiki, jalur tulis
// memakai nol sehingga semua rating langsung tertahan di batas bawah.
func TestApplyRatingsStartsFromInitialRating(t *testing.T) {
	winnerA, winnerB := uuid.New(), uuid.New()
	loserA, loserB := uuid.New(), uuid.New()

	match := domain.Match{
		ID:      uuid.New(),
		EventID: uuid.New(),
		Players: []domain.MatchPlayer{
			{UserID: winnerA, Team: domain.TeamA},
			{UserID: winnerB, Team: domain.TeamA},
			{UserID: loserA, Team: domain.TeamB},
			{UserID: loserB, Team: domain.TeamB},
		},
	}
	sets := []domain.SetScore{{A: 6, B: 4}, {A: 6, B: 3}}

	ratings := &fakeRatings{rows: map[uuid.UUID]domain.PlayerRating{}}
	svc := &ScoreService{
		events:  fakeEvents{event: domain.Event{CommunityID: uuid.New(), Sport: domain.SportPadel}},
		ratings: ratings,
	}

	if err := svc.applyRatings(context.Background(), match, sets); err != nil {
		t.Fatalf("applyRatings gagal: %v", err)
	}

	for _, id := range []uuid.UUID{winnerA, winnerB} {
		if got := ratings.rows[id].SkillRating; got <= StartRating {
			t.Fatalf("pemenang harus naik di atas rating awal %.0f, dapat %.2f", StartRating, got)
		}
	}
	for _, id := range []uuid.UUID{loserA, loserB} {
		got := ratings.rows[id].SkillRating
		if got >= StartRating {
			t.Fatalf("pemain yang kalah harus turun di bawah %.0f, dapat %.2f", StartRating, got)
		}
		if got < 100 {
			t.Fatalf("rating tidak boleh jatuh di bawah batas bawah, dapat %.2f", got)
		}
	}
}
