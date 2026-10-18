package service

import "testing"

func TestExpectedScoreIsHalfBetweenEqualRatings(t *testing.T) {
	if got := ExpectedScore(1200, 1200); got != 0.5 {
		t.Fatalf("rating sama harus 0.5, dapat %v", got)
	}
}

func TestExpectedScoreFavoursHigherRating(t *testing.T) {
	if ExpectedScore(1500, 1200) <= 0.5 {
		t.Fatal("rating lebih tinggi harus punya peluang menang di atas 0.5")
	}
	if ExpectedScore(1200, 1500) >= 0.5 {
		t.Fatal("rating lebih rendah harus punya peluang menang di bawah 0.5")
	}
}

func TestExpectedScoreIsSymmetric(t *testing.T) {
	up := ExpectedScore(1500, 1200)
	down := ExpectedScore(1200, 1500)
	if diff := (up + down) - 1; diff > 0.0001 || diff < -0.0001 {
		t.Fatalf("peluang kedua sisi harus berjumlah 1, dapat %v", up+down)
	}
}

func TestApplyMatchMovesWinnerUpAndLoserDown(t *testing.T) {
	current := map[string]float64{"a": 1200, "b": 1200, "c": 1200, "d": 1200}
	outcomes := []MatchOutcome{
		{UserID: "a", Team: "A", TeamScore: 1},
		{UserID: "b", Team: "A", TeamScore: 1},
		{UserID: "c", Team: "B", TeamScore: 0},
		{UserID: "d", Team: "B", TeamScore: 0},
	}

	deltas := ApplyMatch(current, outcomes)
	byUser := map[string]float64{}
	for _, d := range deltas {
		byUser[d.UserID] = d.Delta
	}

	// Dengan rating yang sama, menang memberi +16 dan kalah memberi -16.
	if byUser["a"] != 16 {
		t.Fatalf("pemenang ingin +16, dapat %v", byUser["a"])
	}
	if byUser["c"] != -16 {
		t.Fatalf("yang kalah ingin -16, dapat %v", byUser["c"])
	}
}

func TestApplyMatchGivesSmallGainToHeavyFavourite(t *testing.T) {
	current := map[string]float64{"strong": 2000, "partner": 2000, "weak": 1000, "weak2": 1000}
	outcomes := []MatchOutcome{
		{UserID: "strong", Team: "A", TeamScore: 1},
		{UserID: "partner", Team: "A", TeamScore: 1},
		{UserID: "weak", Team: "B", TeamScore: 0},
		{UserID: "weak2", Team: "B", TeamScore: 0},
	}

	deltas := ApplyMatch(current, outcomes)
	byUser := map[string]float64{}
	for _, d := range deltas {
		byUser[d.UserID] = d.Delta
	}

	if byUser["strong"] <= 0 {
		t.Fatal("pemenang tetap naik walau jauh lebih kuat")
	}
	if byUser["strong"] >= 16 {
		t.Fatalf("kenaikan pemain yang jauh lebih kuat harus kecil, dapat %v", byUser["strong"])
	}
}

func TestReliabilityReachesOneAfterCalibration(t *testing.T) {
	if got := Reliability(0); got != 0 {
		t.Fatalf("pemain tanpa pertandingan ingin 0, dapat %v", got)
	}
	if got := Reliability(CalibrationMatches); got != 1 {
		t.Fatalf("setelah kalibrasi ingin 1, dapat %v", got)
	}
	if got := Reliability(CalibrationMatches * 3); got != 1 {
		t.Fatalf("melewati kalibrasi tetap 1, dapat %v", got)
	}
	if got := Reliability(5); got != 0.5 {
		t.Fatalf("setengah kalibrasi ingin 0.5, dapat %v", got)
	}
}

func TestSeasonPointsSplitParticipationFromSkill(t *testing.T) {
	if SeasonPoints(true) <= SeasonPoints(false) {
		t.Fatal("menang harus memberi poin lebih banyak daripada sekadar ikut bermain")
	}
	if SeasonPoints(false) < 1 {
		t.Fatal("sekadar ikut bermain tetap memberi poin partisipasi")
	}
}
