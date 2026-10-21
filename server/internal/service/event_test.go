package service

import (
	"testing"

	"github.com/google/uuid"

	"rallyup/server/internal/domain"
)

func TestEventStandingsPoints(t *testing.T) {
	winnerA := uuid.New()
	loserA, loserB := uuid.New(), uuid.New()
	drawA, drawB := uuid.New(), uuid.New()

	registrations := []domain.Registration{
		{UserID: winnerA, Status: domain.RegJoined, UserName: "Winner A"},
		{UserID: loserA, Status: domain.RegJoined, UserName: "Loser A"},
		{UserID: drawA, Status: domain.RegJoined, UserName: "Draw A"},
		{UserID: uuid.New(), Status: domain.RegJoined, UserName: "No Match"},
		{UserID: uuid.New(), Status: domain.RegWaitlist, UserName: "Waitlist"},
	}

	player := func(id uuid.UUID, name string, team domain.TeamSide) domain.MatchPlayer {
		return domain.MatchPlayer{UserID: id, UserName: name, Team: team}
	}

	matches := []domain.Match{
		{
			Status: domain.MatchFinished,
			Players: []domain.MatchPlayer{
				player(winnerA, "Winner A", domain.TeamA),
				player(loserB, "Loser B", domain.TeamB),
			},
			Score: &domain.ScoreSubmission{
				Status: domain.ScoreConfirmed,
				Sets:   []domain.SetScore{{A: 6, B: 3}, {A: 6, B: 4}},
			},
		},
		{
			Status: domain.MatchFinished,
			Players: []domain.MatchPlayer{
				player(drawA, "Draw A", domain.TeamA),
				player(drawB, "Draw B", domain.TeamB),
			},
			Score: &domain.ScoreSubmission{
				Status: domain.ScoreConfirmed,
				Sets:   []domain.SetScore{{A: 6, B: 4}, {A: 4, B: 6}},
			},
		},
		{
			// Skor belum dikonfirmasi tidak boleh menambah statistik.
			Status: domain.MatchFinished,
			Players: []domain.MatchPlayer{
				player(loserA, "Loser A", domain.TeamA),
				player(uuid.New(), "Pending", domain.TeamB),
			},
			Score: &domain.ScoreSubmission{
				Status: domain.ScorePending,
				Sets:   []domain.SetScore{{A: 1, B: 6}},
			},
		},
	}

	standings := eventStandings(matches, registrations)
	if len(standings) != 6 {
		t.Fatalf("want 6 rows (4 joined + 2 match-only players), got %d", len(standings))
	}

	byName := map[string]domain.EventStanding{}
	for _, row := range standings {
		byName[row.Name] = row
	}

	cases := []struct {
		name    string
		matches int
		wins    int
		draws   int
		losses  int
		points  int
	}{
		{name: "Winner A", matches: 1, wins: 1, points: 3},
		{name: "Loser B", matches: 1, losses: 1, points: 0},
		{name: "Draw A", matches: 1, draws: 1, points: 1},
		{name: "Draw B", matches: 1, draws: 1, points: 1},
		{name: "No Match", matches: 0, points: 0},
	}
	for _, tc := range cases {
		row, ok := byName[tc.name]
		if !ok {
			t.Fatalf("%s missing from standings", tc.name)
		}
		if row.Matches != tc.matches || row.Wins != tc.wins || row.Draws != tc.draws ||
			row.Losses != tc.losses || row.Points != tc.points {
			t.Errorf("%s: got main=%d menang=%d seri=%d kalah=%d poin=%d, want main=%d menang=%d seri=%d kalah=%d poin=%d",
				tc.name, row.Matches, row.Wins, row.Draws, row.Losses, row.Points,
				tc.matches, tc.wins, tc.draws, tc.losses, tc.points)
		}
	}
	if _, ok := byName["Waitlist"]; ok {
		t.Error("waitlist registration should not appear in standings")
	}
	if standings[0].Name != "Winner A" || standings[0].Rank != 1 {
		t.Errorf("want Winner A rank 1, got %s rank %d", standings[0].Name, standings[0].Rank)
	}
	// Peserta yang sudah main tapi 0 poin tetap di atas peserta yang belum main.
	if last := standings[len(standings)-1]; last.Name != "No Match" {
		t.Errorf("want No Match last, got %s rank %d", last.Name, last.Rank)
	}
	if byName["Loser B"].Rank > byName["No Match"].Rank {
		t.Errorf("want Loser B above No Match, got %d vs %d ranks",
			byName["Loser B"].Rank, byName["No Match"].Rank)
	}
}

func TestEventBenchListsRestingPlayers(t *testing.T) {
	playing := [8]uuid.UUID{}
	for i := range playing {
		playing[i] = uuid.New()
	}
	resting := [2]uuid.UUID{uuid.New(), uuid.New()}

	registrations := make([]domain.Registration, 0, 10)
	for _, id := range playing {
		registrations = append(registrations, domain.Registration{
			UserID: id, Status: domain.RegJoined, CheckedIn: true, UserName: id.String()[:8],
		})
	}
	for i, id := range resting {
		registrations = append(registrations, domain.Registration{
			UserID: id, Status: domain.RegJoined, CheckedIn: true, UserName: []string{"Rest One", "Rest Two"}[i],
		})
	}
	// Peserta yang belum hadir tidak masuk daftar tunggu rotasi.
	registrations = append(registrations, domain.Registration{
		UserID: uuid.New(), Status: domain.RegJoined, UserName: "Belum Hadir",
	})

	matchPlayers := make([]domain.MatchPlayer, 0, 8)
	for _, id := range playing {
		matchPlayers = append(matchPlayers, domain.MatchPlayer{UserID: id, Team: domain.TeamA})
	}
	matches := []domain.Match{
		{ID: uuid.New(), Round: 1, Status: domain.MatchScheduled, Players: matchPlayers},
	}

	bench := eventBench(matches, registrations)
	if len(bench) != 2 {
		t.Fatalf("want 2 players on bench, got %d", len(bench))
	}
	got := map[string]bool{bench[0].Name: true, bench[1].Name: true}
	if !got["Rest One"] || !got["Rest Two"] {
		t.Errorf("unexpected bench players: %v", bench)
	}
	for _, p := range bench {
		if p.RoundsPlayed != 0 {
			t.Errorf("%s: want 0 rounds played, got %d", p.Name, p.RoundsPlayed)
		}
	}
}
