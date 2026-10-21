package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"rallyup/server/internal/domain"
	"rallyup/server/internal/stream"
)

type ScoreService struct {
	scores        domain.ScoreRepository
	matches       domain.MatchRepository
	events        domain.EventRepository
	communities   domain.CommunityRepository
	ratings       domain.RatingRepository
	notifications *NotificationService
	audit         domain.AuditRepository
	broker        *stream.Broker
}

func NewScoreService(
	scores domain.ScoreRepository,
	matches domain.MatchRepository,
	events domain.EventRepository,
	communities domain.CommunityRepository,
	ratings domain.RatingRepository,
	notifications *NotificationService,
	audit domain.AuditRepository,
	broker *stream.Broker,
) *ScoreService {
	return &ScoreService{
		scores:        scores,
		matches:       matches,
		events:        events,
		communities:   communities,
		ratings:       ratings,
		notifications: notifications,
		audit:         audit,
		broker:        broker,
	}
}

// MatchDetail adalah satu pertandingan beserta sesi induknya. Halaman
// pertandingan butuh keduanya karena aturan skor mengacu pada penyelenggara
// sesi dan komunitasnya.
type MatchDetail struct {
	Match     domain.Match `json:"match"`
	Event     domain.Event `json:"event"`
	CanManage bool         `json:"canManage"`
}

func (s *ScoreService) Detail(ctx context.Context, matchID uuid.UUID, viewerID *uuid.UUID) (MatchDetail, error) {
	match, err := s.matches.FindByID(ctx, matchID)
	if err != nil {
		return MatchDetail{}, err
	}
	event, err := s.events.FindByID(ctx, match.EventID)
	if err != nil {
		return MatchDetail{}, err
	}

	detail := MatchDetail{Match: match, Event: event}
	if viewerID != nil {
		detail.CanManage = canManage(event, *viewerID, roleOf(ctx, s.communities, event.CommunitySlug, viewerID))
	}
	return detail, nil
}

// roleOf mengembalikan peran pemanggil di komunitas, atau nil kalau bukan
// anggota. Kesalahan pembacaan diperlakukan sama seperti bukan anggota karena
// pemanggilnya hanya dipakai untuk menentukan izin.
func roleOf(ctx context.Context, communities domain.CommunityRepository, slug string, userID *uuid.UUID) *domain.MemberRole {
	_, role, err := communities.FindBySlug(ctx, slug, userID)
	if err != nil {
		return nil
	}
	return role
}

// Submit menyimpan skor dan mengembalikannya dalam status pending. Rating baru
// bergerak setelah konfirmasi, supaya satu pihak tidak bisa menaikkan
// ratingnya sendiri.
func (s *ScoreService) Submit(ctx context.Context, userID, matchID uuid.UUID, sets []domain.SetScore) (domain.ScoreSubmission, error) {
	if len(sets) == 0 {
		return domain.ScoreSubmission{}, fmt.Errorf("%w: minimal satu set", domain.ErrInvalid)
	}
	if len(sets) > 5 {
		return domain.ScoreSubmission{}, fmt.Errorf("%w: maksimal lima set", domain.ErrInvalid)
	}
	for i, set := range sets {
		if set.A < 0 || set.B < 0 || set.A > 30 || set.B > 30 {
			return domain.ScoreSubmission{}, fmt.Errorf("%w: skor set %d di luar rentang wajar", domain.ErrInvalid, i+1)
		}
		if set.A == set.B {
			return domain.ScoreSubmission{}, fmt.Errorf("%w: set %d tidak boleh seri", domain.ErrInvalid, i+1)
		}
	}

	match, err := s.matches.FindByID(ctx, matchID)
	if err != nil {
		return domain.ScoreSubmission{}, err
	}
	event, err := s.events.FindByID(ctx, match.EventID)
	if err != nil {
		return domain.ScoreSubmission{}, err
	}
	// Hanya owner/pengelola sesi yang boleh mengisi skor, bukan pemain.
	if event.OrganizerID != userID {
		_, role, err := s.communities.FindBySlug(ctx, event.CommunitySlug, &userID)
		if err != nil || role == nil || (*role != domain.RoleOwner && *role != domain.RoleModerator) {
			return domain.ScoreSubmission{}, fmt.Errorf("%w: hanya owner event yang bisa mengisi skor", domain.ErrForbidden)
		}
	}
	if match.Status == domain.MatchFinished {
		return domain.ScoreSubmission{}, fmt.Errorf("%w: pertandingan ini sudah punya skor terkonfirmasi", domain.ErrInvalidState)
	}

	submission, err := s.scores.Upsert(ctx, domain.ScoreSubmission{
		MatchID:     matchID,
		SubmittedBy: userID,
		Sets:        sets,
	})
	if err != nil {
		return domain.ScoreSubmission{}, err
	}

	for _, p := range match.Players {
		if p.UserID == userID {
			continue
		}
		s.notifications.Notify(ctx, p.UserID, "score.submitted", "Skor menunggu konfirmasi",
			"Lawan sudah mengisi skor. Konfirmasi supaya rating diperbarui.", "/app/matches/"+matchID.String())
	}

	s.publishMatch(ctx, match, submission)
	return submission, nil
}

// Confirm mengunci skor, menandai pertandingan selesai, lalu menghitung ulang
// rating semua pemain yang terlibat.
func (s *ScoreService) Confirm(ctx context.Context, userID, scoreID uuid.UUID) (domain.ScoreSubmission, error) {
	pending, err := s.scores.FindByID(ctx, scoreID)
	if err != nil {
		return domain.ScoreSubmission{}, err
	}

	match, err := s.matches.FindByID(ctx, pending.MatchID)
	if err != nil {
		return domain.ScoreSubmission{}, err
	}
	if err := s.authorizeScoreAction(ctx, match, userID, pending.SubmittedBy); err != nil {
		return domain.ScoreSubmission{}, err
	}

	confirmed, err := s.scores.Confirm(ctx, scoreID, userID)
	if err != nil {
		if err == domain.ErrNotFound {
			return domain.ScoreSubmission{}, fmt.Errorf("%w: skor ini sudah dikonfirmasi", domain.ErrInvalidState)
		}
		return domain.ScoreSubmission{}, err
	}

	if err := s.matches.MarkFinished(ctx, match.ID, confirmed.CreatedAt); err != nil {
		return domain.ScoreSubmission{}, err
	}
	if err := s.applyRatings(ctx, match, confirmed.Sets); err != nil {
		return domain.ScoreSubmission{}, err
	}

	s.audit.Record(ctx, domain.AuditEntry{
		ActorID:  userID,
		Entity:   "score",
		EntityID: scoreID.String(),
		Action:   "confirmed",
		After:    confirmed,
	})

	for _, p := range match.Players {
		if p.UserID == pending.SubmittedBy {
			continue
		}
		s.notifications.Notify(ctx, p.UserID, "score.confirmed", "Skor terkonfirmasi",
			"Hasil pertandingan sudah dikunci dan rating diperbarui.", "/app/matches/"+match.ID.String())
	}

	s.publishMatch(ctx, match, confirmed)
	return confirmed, nil
}

func (s *ScoreService) Dispute(ctx context.Context, userID, scoreID uuid.UUID, reason string) error {
	pending, err := s.scores.FindByID(ctx, scoreID)
	if err != nil {
		return err
	}
	match, err := s.matches.FindByID(ctx, pending.MatchID)
	if err != nil {
		return err
	}
	if err := s.authorizeScoreAction(ctx, match, userID, pending.SubmittedBy); err != nil {
		return err
	}

	if err := s.scores.Dispute(ctx, scoreID, reason); err != nil {
		return err
	}
	if err := s.matches.MarkDisputed(ctx, match.ID); err != nil {
		return err
	}

	s.audit.Record(ctx, domain.AuditEntry{
		ActorID:  userID,
		Entity:   "score",
		EntityID: scoreID.String(),
		Action:   "disputed",
		After:    map[string]any{"reason": reason},
	})

	s.notifications.Notify(ctx, pending.SubmittedBy, "score.disputed", "Skor disanggah",
		"Ada sanggahan atas skor yang kamu isi. Organizer akan menengahi.", "/app/matches/"+match.ID.String())
	s.publishMatch(ctx, match, pending)
	return nil
}

// applyRatings menulis perubahan rating untuk seluruh pemain dalam satu
// pertandingan. Rumusnya ada di rating.go, bagian ini hanya urusan simpan.
func (s *ScoreService) applyRatings(ctx context.Context, match domain.Match, sets []domain.SetScore) error {
	event, err := s.events.FindByID(ctx, match.EventID)
	if err != nil {
		return err
	}

	winner := winningTeam(sets)
	outcomes := make([]MatchOutcome, 0, len(match.Players))
	current := map[string]float64{}

	for _, p := range match.Players {
		stored, err := s.ratings.Get(ctx, p.UserID, event.CommunityID, event.Sport)
		rating := StartRating
		if err == nil {
			rating = stored.SkillRating
		} else if err != domain.ErrNotFound {
			return err
		}
		current[p.UserID.String()] = rating

		teamScore := 0.0
		if string(p.Team) == winner {
			teamScore = 1.0
		}
		outcomes = append(outcomes, MatchOutcome{
			UserID:    p.UserID.String(),
			Team:      string(p.Team),
			TeamScore: teamScore,
		})
	}

	deltas := ApplyMatch(current, outcomes)
	for _, d := range deltas {
		uid, err := uuid.Parse(d.UserID)
		if err != nil {
			return err
		}

		stored, err := s.ratings.Get(ctx, uid, event.CommunityID, event.Sport)
		if err != nil {
			if err != domain.ErrNotFound {
				return err
			}
			// Pemain yang belum punya baris rating mulai dari rating awal yang
			// sama dengan yang dipakai saat menghitung selisih di atas, bukan
			// dari nol. Kalau tidak, hasilnya langsung tertahan di batas bawah.
			stored = domain.PlayerRating{
				UserID:      uid,
				CommunityID: event.CommunityID,
				Sport:       event.Sport,
				SkillRating: StartRating,
			}
		}

		next := stored.SkillRating + d.Delta
		// Rating dasar ditahan di atas nol supaya pemain baru yang kalah
		// beruntun tidak jatuh ke angka yang tidak masuk akal.
		if next < 100 {
			next = 100
		}
		stored.SkillRating = next
		stored.Matches++
		stored.Participation++
		if d.Delta > 0 {
			stored.Wins++
			stored.SeasonPoints += SeasonPoints(true)
		} else {
			stored.Losses++
			stored.SeasonPoints += SeasonPoints(false)
		}
		stored.Reliability = Reliability(stored.Matches)

		if err := s.ratings.Upsert(ctx, stored); err != nil {
			return err
		}
	}
	return nil
}

// authorizeScoreAction mengizinkan pemain, atau organizer atau pengurus
// komunitas. Pengirim skor asli tidak boleh mengonfirmasi skornya sendiri.
func (s *ScoreService) authorizeScoreAction(ctx context.Context, match domain.Match, userID, submittedBy uuid.UUID) error {
	event, err := s.events.FindByID(ctx, match.EventID)
	if err != nil {
		return err
	}
	if event.OrganizerID == userID {
		return nil
	}
	if _, role, err := s.communities.FindBySlug(ctx, event.CommunitySlug, &userID); err == nil {
		if role != nil && (*role == domain.RoleOwner || *role == domain.RoleModerator) {
			return nil
		}
	}
	if !isMatchPlayer(match, userID) {
		return fmt.Errorf("%w: hanya pemain di pertandingan ini yang bisa menanggapi skor", domain.ErrForbidden)
	}
	if userID == submittedBy {
		return fmt.Errorf("%w: pengirim skor tidak bisa mengonfirmasi skornya sendiri", domain.ErrForbidden)
	}
	return nil
}

// winningTeam mengembalikan tim yang memenangkan pertandingan berdasarkan
// jumlah set yang dimenangkan.
func winningTeam(sets []domain.SetScore) string {
	winsA, winsB := 0, 0
	for _, s := range sets {
		switch {
		case s.A > s.B:
			winsA++
		case s.B > s.A:
			winsB++
		}
	}
	if winsB > winsA {
		return "B"
	}
	return "A"
}

func isMatchPlayer(match domain.Match, userID uuid.UUID) bool {
	for _, p := range match.Players {
		if p.UserID == userID {
			return true
		}
	}
	return false
}

func (s *ScoreService) publishMatch(ctx context.Context, match domain.Match, score domain.ScoreSubmission) {
	s.broker.PublishNamed(stream.TopicEvent(match.EventID.String()), "score", map[string]any{
		"matchId": match.ID.String(),
		"status":  match.Status,
		"score":   score,
	})
}
