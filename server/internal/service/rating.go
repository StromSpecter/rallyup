package service

import "math"

// RatingEngine memisahkan rumus dari penyimpanan. Fungsi di berkas ini murni:
// tidak menyentuh database, tidak menyentuh waktu, jadi bisa diuji langsung
// dan hasilnya bisa dihitung ulang kapan saja dari skor mentah.

const (
	// StartRating adalah titik awal pemain baru. Dipilih di tengah skala
	// 1..7 supaya pemain baru tidak langsung dianggap kuat atau lemah.
	StartRating = 1200.0

	// kFactor menentukan seberapa cepat rating bergerak per pertandingan.
	kFactor = 32.0
)

// MatchOutcome adalah satu penampilan pemain dalam satu pertandingan.
type MatchOutcome struct {
	UserID    string
	Team      string
	TeamScore float64 // 1 untuk menang, 0 untuk kalah, 0.5 untuk seri
}

// RatingDelta adalah perubahan rating satu pemain.
type RatingDelta struct {
	UserID string
	Delta  float64
}

// ExpectedScore adalah peluang menang menurut selisih rating (kurva Elo).
func ExpectedScore(ratingA, ratingB float64) float64 {
	return 1 / (1 + math.Pow(10, (ratingB-ratingA)/400))
}

// ApplyMatch menghitung perubahan rating seluruh pemain dalam satu pertandingan.
//
// Pemain dibandingkan dengan rata-rata rating tim lawan, bukan per individu.
// Cara ini memberi bobot lebih pada kekuatan lawan ketimbang rasio kemenangan,
// dan tetap memberi perubahan kecil saat pemain sudah jauh di atas lawannya.
func ApplyMatch(current map[string]float64, outcomes []MatchOutcome) []RatingDelta {
	teamA := teamAverage(current, outcomes, "A")
	teamB := teamAverage(current, outcomes, "B")

	deltas := make([]RatingDelta, 0, len(outcomes))
	for _, o := range outcomes {
		opponent := teamB
		if o.Team == "B" {
			opponent = teamA
		}
		expected := ExpectedScore(current[o.UserID], opponent)
		deltas = append(deltas, RatingDelta{
			UserID: o.UserID,
			Delta:  kFactor * (o.TeamScore - expected),
		})
	}
	return deltas
}

// Reliability memetakan jumlah pertandingan terverifikasi ke tingkat
// kepercayaan rating. Di bawah ambang kalibrasi, rating masih provisional.
func Reliability(matchesPlayed int) float64 {
	ratio := float64(matchesPlayed) / float64(CalibrationMatches)
	if ratio >= 1 {
		return 1
	}
	return math.Round(ratio*1000) / 1000
}

// CalibrationMatches dipakai bersama oleh service dan pengujian.
const CalibrationMatches = 10

// SeasonPoints menghitung poin partisipasi. Dipisahkan dari rating skill
// supaya pemain yang sering bermain tidak otomatis dianggap lebih kuat.
func SeasonPoints(won bool) int {
	if won {
		return 3
	}
	return 1
}

func teamAverage(current map[string]float64, outcomes []MatchOutcome, team string) float64 {
	sum, n := 0.0, 0
	for _, o := range outcomes {
		if o.Team != team {
			continue
		}
		sum += current[o.UserID]
		n++
	}
	if n == 0 {
		return StartRating
	}
	return sum / float64(n)
}
