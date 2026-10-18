package service

import (
	"testing"
)

func TestBuildRoundPairsEveryoneAndBenchesTheRest(t *testing.T) {
	players := make([]Player, 0, 10)
	for i := 1; i <= 10; i++ {
		players = append(players, Player{
			UserID: string(rune('a' - 1 + i)),
			Rating: 1200 + float64(i*20),
		})
	}

	matches, bench := BuildRound(players, 1, 1)

	if len(matches) != 1 {
		t.Fatalf("ingin 1 pertandingan, dapat %d", len(matches))
	}
	if len(bench) != 6 {
		t.Fatalf("ingin 6 pemain di bench, dapat %d", len(bench))
	}
	if len(matches[0].TeamA) != 2 || len(matches[0].TeamB) != 2 {
		t.Fatalf("tiap tim harus berisi 2 pemain, dapat %d dan %d",
			len(matches[0].TeamA), len(matches[0].TeamB))
	}
}

func TestBuildRoundUsesAllCourts(t *testing.T) {
	players := make([]Player, 0, 12)
	for i := 0; i < 12; i++ {
		players = append(players, Player{UserID: string(rune('a' + i)), Rating: 1200})
	}

	matches, bench := BuildRound(players, 3, 1)

	if len(matches) != 3 {
		t.Fatalf("ingin 3 pertandingan, dapat %d", len(matches))
	}
	if len(bench) != 0 {
		t.Fatalf("ingin bench kosong, dapat %d", len(bench))
	}
}

func TestBuildRoundIsDeterministic(t *testing.T) {
	players := []Player{
		{UserID: "a", Rating: 1500},
		{UserID: "b", Rating: 1100},
		{UserID: "c", Rating: 1400},
		{UserID: "d", Rating: 1200},
		{UserID: "e", Rating: 1300},
		{UserID: "f", Rating: 1000},
		{UserID: "g", Rating: 1600},
		{UserID: "h", Rating: 1050},
	}

	first, _ := BuildRound(players, 2, 1)
	second, _ := BuildRound(players, 2, 1)

	if len(first) != len(second) {
		t.Fatalf("jumlah pertandingan berubah antar pemanggilan")
	}
	for i := range first {
		if first[i].TeamA[0] != second[i].TeamA[0] || first[i].TeamB[0] != second[i].TeamB[0] {
			t.Fatalf("susunan tim berbeda pada pertandingan %d", i)
		}
	}
}

func TestBuildRoundPrioritisesPlayersWithFewerRounds(t *testing.T) {
	players := []Player{
		{UserID: "played-1", Rating: 1900, RoundsPlayed: 3},
		{UserID: "played-2", Rating: 1850, RoundsPlayed: 3},
		{UserID: "played-3", Rating: 1800, RoundsPlayed: 3},
		{UserID: "played-4", Rating: 1750, RoundsPlayed: 3},
		{UserID: "fresh-1", Rating: 1000, RoundsPlayed: 0},
		{UserID: "fresh-2", Rating: 1010, RoundsPlayed: 0},
		{UserID: "fresh-3", Rating: 1020, RoundsPlayed: 0},
		{UserID: "fresh-4", Rating: 1030, RoundsPlayed: 0},
	}

	matches, bench := BuildRound(players, 1, 4)
	if len(matches) != 1 {
		t.Fatalf("ingin 1 pertandingan, dapat %d", len(matches))
	}
	if len(bench) != 4 {
		t.Fatalf("ingin 4 pemain di bench, dapat %d", len(bench))
	}

	playing := map[string]bool{}
	for _, id := range append(matches[0].TeamA, matches[0].TeamB...) {
		playing[id] = true
	}
	for _, id := range []string{"fresh-1", "fresh-2", "fresh-3", "fresh-4"} {
		if !playing[id] {
			t.Fatalf("pemain %s yang belum bermain harus didahulukan", id)
		}
	}
}

func TestBuildRoundReturnsNilWhenNotEnoughPlayers(t *testing.T) {
	matches, bench := BuildRound([]Player{
		{UserID: "a", Rating: 1200},
		{UserID: "b", Rating: 1200},
	}, 2, 1)

	if len(matches) != 0 {
		t.Fatalf("ingin tanpa pertandingan, dapat %d", len(matches))
	}
	if len(bench) != 2 {
		t.Fatalf("semua pemain harus masuk bench, dapat %d", len(bench))
	}
}

func TestBalanceTeamsKeepsGapSmall(t *testing.T) {
	// Susunan apa adanya memberi selisih 300: (1800+1200)/2 lawan
	// (1400+1000)/2. Susunan terbaik menukar pasangan sehingga menjadi
	// (1800+1000)/2 lawan (1400+1200)/2, selisih 100.
	first := Pair{A: Player{UserID: "a", Rating: 1800}, B: Player{UserID: "b", Rating: 1200}}
	second := Pair{A: Player{UserID: "c", Rating: 1400}, B: Player{UserID: "d", Rating: 1000}}

	teamA, teamB, gap := balanceTeams(first, second)

	if gap != 100 {
		t.Fatalf("ingin selisih 100, dapat %.2f", gap)
	}
	if !sameIDs(teamA, []string{"a", "d"}) || !sameIDs(teamB, []string{"b", "c"}) {
		t.Fatalf("susunan tim tidak seimbang: %v lawan %v", teamA, teamB)
	}
}

func sameIDs(got, want []string) bool {
	if len(got) != len(want) {
		return false
	}
	seen := map[string]int{}
	for _, id := range got {
		seen[id]++
	}
	for _, id := range want {
		seen[id]--
	}
	for _, count := range seen {
		if count != 0 {
			return false
		}
	}
	return true
}
