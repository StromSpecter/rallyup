package service

import "sort"

// PairingEngine menyusun pasangan dari pemain yang sudah hadir.
//
// Algoritmanya deterministik dan bisa dijelaskan ke pemain: yang paling jarang
// turun main didahulukan, lalu pasangan dibentuk pola ular (terkuat dengan
// terlemah). Dua pasangan yang bertemu diadu dengan tiga kemungkinan susunan
// tim, dan susunan dengan selisih rata-rata rating terkecil yang dipakai.
// Tanpa AI dan tanpa angka acak, jadi masukan yang sama selalu memberi
// hasil yang sama.

type Player struct {
	UserID string
	Rating float64
	// RoundsPlayed dipakai untuk merotasi pemain: yang paling sedikit bermain
	// naik lebih dulu.
	RoundsPlayed int
}

type Pair struct {
	A Player
	B Player
}

type MatchPlan struct {
	Court int
	Round int
	TeamA []string
	TeamB []string
	// RatingGap adalah selisih rata-rata rating kedua tim, ditampilkan ke
	// organizer supaya ia bisa menilai keseimbangan jadwal sebelum dijalankan.
	RatingGap float64
}

// BuildRound menyusun satu ronde pertandingan.
//
// courts adalah jumlah lapangan yang dipakai bersamaan. Pemain yang tidak
// kebagian slot dikembalikan lewat bench untuk ronde berikutnya.
func BuildRound(players []Player, courts, round int) (matches []MatchPlan, bench []string) {
	const perMatch = 4
	if courts < 1 {
		courts = 1
	}

	ordered := orderByPriority(players)
	slots := courts
	if maxMatches := len(ordered) / perMatch; maxMatches < slots {
		slots = maxMatches
	}
	if slots == 0 {
		return nil, ids(ordered)
	}

	playing := ordered[:slots*perMatch]
	bench = ids(ordered[slots*perMatch:])

	pairs := snakePairs(playing)
	for i := 0; i < len(pairs); i += 2 {
		teamA, teamB, gap := balanceTeams(pairs[i], pairs[i+1])
		matches = append(matches, MatchPlan{
			Court:     len(matches) + 1,
			Round:     round,
			TeamA:     teamA,
			TeamB:     teamB,
			RatingGap: gap,
		})
	}
	return matches, bench
}

// orderByPriority menempatkan pemain dengan jumlah ronde paling sedikit di
// depan, lalu mengurutkan berdasarkan rating tertinggi.
func orderByPriority(players []Player) []Player {
	out := make([]Player, len(players))
	copy(out, players)
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].RoundsPlayed != out[j].RoundsPlayed {
			return out[i].RoundsPlayed < out[j].RoundsPlayed
		}
		if out[i].Rating != out[j].Rating {
			return out[i].Rating > out[j].Rating
		}
		return out[i].UserID < out[j].UserID
	})
	return out
}

// snakePairs memasangkan pemain terkuat dengan terlemah, lalu bergerak ke
// tengah dari kedua ujung, supaya skill menyebar merata ke tiap pasangan.
func snakePairs(players []Player) []Pair {
	pairs := make([]Pair, 0, len(players)/2)
	for i, j := 0, len(players)-1; i < j; i, j = i+1, j-1 {
		pairs = append(pairs, Pair{A: players[i], B: players[j]})
	}
	return pairs
}

// balanceTeams mengadu dua pasangan dan memilih susunan tim dengan selisih
// rata-rata rating paling kecil.
func balanceTeams(first, second Pair) (teamA, teamB []string, gap float64) {
	type layout struct {
		a, b []Player
	}
	options := []layout{
		{a: []Player{first.A, first.B}, b: []Player{second.A, second.B}},
		{a: []Player{first.A, second.A}, b: []Player{first.B, second.B}},
		{a: []Player{first.A, second.B}, b: []Player{first.B, second.A}},
	}

	best := options[0]
	bestGap := abs(mean(options[0].a) - mean(options[0].b))
	for _, opt := range options[1:] {
		d := abs(mean(opt.a) - mean(opt.b))
		if d < bestGap {
			best, bestGap = opt, d
		}
	}
	return idsOf(best.a), idsOf(best.b), round2(bestGap)
}

func mean(players []Player) float64 {
	if len(players) == 0 {
		return 0
	}
	sum := 0.0
	for _, p := range players {
		sum += p.Rating
	}
	return sum / float64(len(players))
}

func idsOf(players []Player) []string {
	out := make([]string, 0, len(players))
	for _, p := range players {
		out = append(out, p.UserID)
	}
	return out
}

func ids(players []Player) []string { return idsOf(players) }

func abs(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}
