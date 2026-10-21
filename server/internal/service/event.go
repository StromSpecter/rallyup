package service

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"

	"rallyup/server/internal/domain"
	"rallyup/server/internal/stream"
)

type EventService struct {
	events        domain.EventRepository
	communities   domain.CommunityRepository
	registrations domain.RegistrationRepository
	matches       domain.MatchRepository
	ratings       domain.RatingRepository
	notifications *NotificationService
	audit         domain.AuditRepository
	broker        *stream.Broker
}

func NewEventService(
	events domain.EventRepository,
	communities domain.CommunityRepository,
	registrations domain.RegistrationRepository,
	matches domain.MatchRepository,
	ratings domain.RatingRepository,
	notifications *NotificationService,
	audit domain.AuditRepository,
	broker *stream.Broker,
) *EventService {
	return &EventService{
		events:        events,
		communities:   communities,
		registrations: registrations,
		matches:       matches,
		ratings:       ratings,
		notifications: notifications,
		audit:         audit,
		broker:        broker,
	}
}

type CreateEventInput struct {
	CommunityID uuid.UUID
	Title       string
	Sport       domain.Sport
	Format      domain.EventFormat
	Venue       string
	City        string
	StartsAt    time.Time
	EndsAt      time.Time
	Capacity    int
	Fee         int
	LevelMin    int
	LevelMax    int
	Notes       string
	Publish     bool
}

type UpdateEventInput struct {
	CreateEventInput
	Status domain.EventStatus
}

func (s *EventService) Create(ctx context.Context, organizerID uuid.UUID, in CreateEventInput) (domain.Event, error) {
	if err := validateEventCreate(in); err != nil {
		return domain.Event{}, err
	}

	isMember, err := s.communities.IsMember(ctx, in.CommunityID, organizerID)
	if err != nil {
		return domain.Event{}, err
	}
	if !isMember {
		return domain.Event{}, fmt.Errorf("%w: hanya anggota komunitas yang bisa membuat sesi", domain.ErrForbidden)
	}

	status := domain.EventDraft
	if in.Publish {
		status = domain.EventPublished
	}

	event, err := s.events.Create(ctx, domain.Event{
		CommunityID: in.CommunityID,
		OrganizerID: organizerID,
		Title:       strings.TrimSpace(in.Title),
		Sport:       in.Sport,
		Format:      in.Format,
		Venue:       strings.TrimSpace(in.Venue),
		City:        strings.TrimSpace(in.City),
		StartsAt:    in.StartsAt,
		EndsAt:      in.EndsAt,
		Capacity:    in.Capacity,
		Fee:         in.Fee,
		LevelMin:    in.LevelMin,
		LevelMax:    in.LevelMax,
		Notes:       strings.TrimSpace(in.Notes),
		Status:      status,
	})
	if err != nil {
		return domain.Event{}, err
	}

	s.audit.Record(ctx, domain.AuditEntry{
		ActorID:  organizerID,
		Entity:   "event",
		EntityID: event.ID.String(),
		Action:   "created",
		After:    event,
	})
	s.publishEvent(ctx, event.ID.String(), "event")
	return event, nil
}

func (s *EventService) List(ctx context.Context, f domain.ListEventsFilter) ([]domain.Event, error) {
	return s.events.List(ctx, f)
}

func (s *EventService) Count(ctx context.Context, f domain.ListEventsFilter) (int, error) {
	return s.events.Count(ctx, f)
}

// EventDetail menggabungkan event, peserta, dan pertandingan dalam satu
// pembacaan supaya halaman detail cukup satu permintaan.
type EventDetail struct {
	Event         domain.Event               `json:"event"`
	Registrations []domain.Registration      `json:"registrations"`
	Matches       []domain.Match             `json:"matches"`
	Standings     []domain.EventStanding     `json:"standings"`
	Bench         []domain.BenchPlayer       `json:"bench"`
	MyStatus      *domain.RegistrationStatus `json:"myStatus,omitempty"`
	MyRole        *domain.MemberRole         `json:"myRole,omitempty"`
	CanManage     bool                       `json:"canManage"`
}

func (s *EventService) Detail(ctx context.Context, eventID uuid.UUID, viewerID *uuid.UUID) (EventDetail, error) {
	event, err := s.events.FindByID(ctx, eventID)
	if err != nil {
		return EventDetail{}, err
	}

	registrations, err := s.registrations.ListByEvent(ctx, eventID)
	if err != nil {
		return EventDetail{}, err
	}

	matches, err := s.matches.ListByEvent(ctx, eventID)
	if err != nil {
		return EventDetail{}, err
	}

	detail := EventDetail{
		Event:         event,
		Registrations: registrations,
		Matches:       matches,
		Standings:     eventStandings(matches, registrations),
		Bench:         eventBench(matches, registrations),
	}

	if viewerID != nil {
		if reg, err := s.registrations.FindByEventAndUser(ctx, eventID, *viewerID); err == nil && reg != nil {
			detail.MyStatus = &reg.Status
		}
		_, role, err := s.communities.FindBySlug(ctx, event.CommunitySlug, viewerID)
		if err == nil {
			detail.MyRole = role
		}
		detail.CanManage = canManage(event, *viewerID, detail.MyRole)
	}
	return detail, nil
}

func (s *EventService) Update(ctx context.Context, userID, eventID uuid.UUID, in UpdateEventInput) (domain.Event, error) {
	event, err := s.events.FindByID(ctx, eventID)
	if err != nil {
		return domain.Event{}, err
	}
	if err := s.authorizeManage(ctx, event, userID); err != nil {
		return domain.Event{}, err
	}
	if event.Status == domain.EventClosed || event.Status == domain.EventCancelled {
		return domain.Event{}, fmt.Errorf("%w: sesi yang sudah ditutup tidak bisa diubah", domain.ErrInvalidState)
	}

	before := event
	event.Title = strings.TrimSpace(in.Title)
	event.Venue = strings.TrimSpace(in.Venue)
	event.City = strings.TrimSpace(in.City)
	event.StartsAt = in.StartsAt
	event.EndsAt = in.EndsAt
	event.Capacity = in.Capacity
	event.Fee = in.Fee
	event.LevelMin = in.LevelMin
	event.LevelMax = in.LevelMax
	event.Notes = strings.TrimSpace(in.Notes)
	event.Format = in.Format
	if in.Status != "" {
		event.Status = in.Status
	}

	if event.EndsAt.Before(event.StartsAt) || event.EndsAt.Equal(event.StartsAt) {
		return domain.Event{}, fmt.Errorf("%w: waktu selesai harus setelah waktu mulai", domain.ErrInvalid)
	}
	if event.Capacity < event.JoinedCount {
		return domain.Event{}, fmt.Errorf("%w: kapasitas di bawah jumlah peserta saat ini", domain.ErrInvalid)
	}
	minCapacity := 2
	if event.Format == domain.FormatDoubles {
		minCapacity = 4
	}
	if event.Capacity < minCapacity {
		return domain.Event{}, fmt.Errorf("%w: kapasitas format %s minimal %d orang", domain.ErrInvalid, event.Format, minCapacity)
	}

	updated, err := s.events.Update(ctx, event)
	if err != nil {
		return domain.Event{}, err
	}

	s.audit.Record(ctx, domain.AuditEntry{
		ActorID:  userID,
		Entity:   "event",
		EntityID: eventID.String(),
		Action:   "updated",
		Before:   before,
		After:    updated,
	})
	s.publishEvent(ctx, eventID.String(), "event")
	return updated, nil
}

func (s *EventService) Join(ctx context.Context, userID, eventID uuid.UUID) (domain.Registration, error) {
	event, err := s.events.FindByID(ctx, eventID)
	if err != nil {
		return domain.Registration{}, err
	}

	registration, err := s.registrations.Join(ctx, eventID, userID)
	if err != nil {
		return domain.Registration{}, err
	}

	title := "Pendaftaran diterima"
	body := fmt.Sprintf("Kamu terdaftar di %s.", event.Title)
	if registration.Status == domain.RegWaitlist {
		title = "Masuk daftar tunggu"
		body = fmt.Sprintf("Slot %s penuh. Kamu ada di daftar tunggu dan akan naik otomatis kalau ada yang keluar.", event.Title)
	}
	s.notifications.Notify(ctx, event.OrganizerID, "event.join", title, body, "/app/events/"+eventID.String())
	s.publishEvent(ctx, eventID.String(), "registrations")

	return registration, nil
}

func (s *EventService) Leave(ctx context.Context, userID, eventID uuid.UUID) error {
	if err := s.registrations.Cancel(ctx, eventID, userID); err != nil {
		return err
	}

	// Satu orang yang keluar membuka tepat satu slot, jadi cukup satu promosi.
	if promoted, err := s.registrations.PromoteWaitlist(ctx, eventID); err == nil && promoted != nil {
		event, err := s.events.FindByID(ctx, eventID)
		if err == nil {
			s.notifications.Notify(ctx, *promoted, "event.promoted",
				"Slot terbuka", fmt.Sprintf("Kamu naik dari daftar tunggu ke slot utama %s.", event.Title),
				"/app/events/"+eventID.String())
		}
	}
	s.publishEvent(ctx, eventID.String(), "registrations")
	return nil
}

// CancelRegistration membatalkan keikutsertaan seorang peserta oleh pengelola
// sesi. Berbeda dengan Leave yang dipanggil peserta sendiri.
func (s *EventService) CancelRegistration(ctx context.Context, actorID, eventID, targetUserID uuid.UUID) error {
	event, err := s.events.FindByID(ctx, eventID)
	if err != nil {
		return err
	}
	if err := s.authorizeManage(ctx, event, actorID); err != nil {
		return err
	}
	if err := s.registrations.Cancel(ctx, eventID, targetUserID); err != nil {
		return err
	}

	if promoted, err := s.registrations.PromoteWaitlist(ctx, eventID); err == nil && promoted != nil {
		if ev, err := s.events.FindByID(ctx, eventID); err == nil {
			s.notifications.Notify(ctx, *promoted, "event.promoted",
				"Slot terbuka", fmt.Sprintf("Kamu naik dari daftar tunggu ke slot utama %s.", ev.Title),
				"/app/events/"+eventID.String())
		}
	}
	s.publishEvent(ctx, eventID.String(), "registrations")
	return nil
}

func (s *EventService) CheckIn(ctx context.Context, actorID, eventID, targetUserID uuid.UUID, checkedIn bool) error {
	event, err := s.events.FindByID(ctx, eventID)
	if err != nil {
		return err
	}
	if err := s.authorizeManage(ctx, event, actorID); err != nil {
		return err
	}
	if err := s.registrations.SetCheckedIn(ctx, eventID, targetUserID, checkedIn); err != nil {
		return err
	}
	s.publishEvent(ctx, eventID.String(), "checkin")
	return nil
}

// CheckInAll menandai semua peserta utama sebagai hadir sekaligus.
func (s *EventService) CheckInAll(ctx context.Context, actorID, eventID uuid.UUID) error {
	event, err := s.events.FindByID(ctx, eventID)
	if err != nil {
		return err
	}
	if err := s.authorizeManage(ctx, event, actorID); err != nil {
		return err
	}
	if err := s.registrations.SetCheckedInAll(ctx, eventID); err != nil {
		return err
	}
	s.publishEvent(ctx, eventID.String(), "checkin")
	return nil
}

// GeneratePairings menyusun jadwal dari pemain yang sudah absen. Jadwal lama
// yang masih berstatus scheduled dibuang lebih dulu supaya organizer bisa
// menyusun ulang tanpa menumpuk pertandingan.
func (s *EventService) GeneratePairings(ctx context.Context, actorID, eventID uuid.UUID, courts int, appendRound bool) ([]domain.Match, error) {
	event, err := s.events.FindByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if err := s.authorizeManage(ctx, event, actorID); err != nil {
		return nil, err
	}

	registrations, err := s.registrations.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}

	players := make([]Player, 0, len(registrations))
	for _, r := range registrations {
		if r.Status != domain.RegJoined || !r.CheckedIn {
			continue
		}
		rating := StartRating
		if stored, err := s.ratings.Get(ctx, r.UserID, event.CommunityID, event.Sport); err == nil {
			rating = stored.SkillRating
		}
		players = append(players, Player{UserID: r.UserID.String(), Rating: rating})
	}

	if len(players) < 4 {
		return nil, fmt.Errorf("%w: butuh minimal 4 pemain yang sudah absen untuk menyusun jadwal", domain.ErrInvalidState)
	}

	// Ronde berikutnya dihitung dari jumlah ronde yang sudah ada, supaya
	// penyusunan ulang melanjutkan rotasi, bukan mengulang dari awal.
	existing, err := s.matches.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	round := 1
	for _, m := range existing {
		if m.Round >= round {
			round = m.Round + 1
		}
	}
	played := map[string]int{}
	for _, m := range existing {
		for _, p := range m.Players {
			played[p.UserID.String()]++
		}
	}
	for i := range players {
		players[i].RoundsPlayed = played[players[i].UserID]
	}

	plans, bench := BuildRound(players, courts, round)
	if len(plans) == 0 {
		return nil, fmt.Errorf("%w: jumlah pemain belum cukup untuk satu lapangan", domain.ErrInvalidState)
	}

	if !appendRound {
		if err := s.matches.ReplaceByEvent(ctx, eventID); err != nil {
			return nil, err
		}
	}

	batch := make([]domain.Match, 0, len(plans))
	for _, p := range plans {
		matchPlayers := make([]domain.MatchPlayer, 0, 4)
		for _, id := range p.TeamA {
			uid, _ := uuid.Parse(id)
			matchPlayers = append(matchPlayers, domain.MatchPlayer{UserID: uid, Team: domain.TeamA})
		}
		for _, id := range p.TeamB {
			uid, _ := uuid.Parse(id)
			matchPlayers = append(matchPlayers, domain.MatchPlayer{UserID: uid, Team: domain.TeamB})
		}
		batch = append(batch, domain.Match{
			EventID: eventID,
			Court:   p.Court,
			Round:   p.Round,
			Players: matchPlayers,
		})
	}

	created, err := s.matches.CreateBatch(ctx, batch)
	if err != nil {
		return nil, err
	}

	s.audit.Record(ctx, domain.AuditEntry{
		ActorID:  actorID,
		Entity:   "event",
		EntityID: eventID.String(),
		Action:   "pairings_generated",
		After:    map[string]any{"matches": len(created), "bench": bench, "courts": courts},
	})
	s.publishEvent(ctx, eventID.String(), "match")
	return created, nil
}

// SubstitutePlayer menukar pemain di lapangan dengan peserta yang menunggu
// giliran. Hanya pertandingan yang belum dimainkan yang bisa diubah, dan
// pengganti tidak boleh sudah terjadwal di lapangan lain pada ronde yang sama.
func (s *EventService) SubstitutePlayer(ctx context.Context, actorID, matchID, outUserID, inUserID uuid.UUID) (domain.Match, error) {
	match, err := s.matches.FindByID(ctx, matchID)
	if err != nil {
		return domain.Match{}, err
	}
	event, err := s.events.FindByID(ctx, match.EventID)
	if err != nil {
		return domain.Match{}, err
	}
	if err := s.authorizeManage(ctx, event, actorID); err != nil {
		return domain.Match{}, err
	}
	if event.Status == domain.EventClosed || event.Status == domain.EventCancelled {
		return domain.Match{}, fmt.Errorf("%w: sesi sudah ditutup", domain.ErrInvalidState)
	}
	if match.Status != domain.MatchScheduled {
		return domain.Match{}, fmt.Errorf("%w: hanya pertandingan yang belum dimainkan yang bisa ditukar", domain.ErrInvalidState)
	}
	if outUserID == inUserID {
		return domain.Match{}, fmt.Errorf("%w: pemain yang ditukar harus berbeda", domain.ErrInvalid)
	}

	outFound := false
	for _, p := range match.Players {
		if p.UserID == outUserID {
			outFound = true
		}
		if p.UserID == inUserID {
			return domain.Match{}, fmt.Errorf("%w: pemain pengganti sudah ada di lapangan ini", domain.ErrInvalid)
		}
	}
	if !outFound {
		return domain.Match{}, fmt.Errorf("%w: pemain yang ditukar tidak ada di pertandingan ini", domain.ErrNotFound)
	}

	registration, err := s.registrations.FindByEventAndUser(ctx, event.ID, inUserID)
	if err != nil {
		return domain.Match{}, err
	}
	if registration == nil || registration.Status != domain.RegJoined || !registration.CheckedIn {
		return domain.Match{}, fmt.Errorf("%w: pengganti harus peserta yang sudah hadir", domain.ErrInvalidState)
	}

	matches, err := s.matches.ListByEvent(ctx, event.ID)
	if err != nil {
		return domain.Match{}, err
	}
	for _, m := range matches {
		if m.ID == match.ID || m.Round != match.Round {
			continue
		}
		for _, p := range m.Players {
			if p.UserID == inUserID {
				return domain.Match{}, fmt.Errorf("%w: pengganti sudah bermain di lapangan %d pada ronde ini", domain.ErrInvalidState, m.Court)
			}
		}
	}

	if err := s.matches.ReplacePlayer(ctx, match.ID, outUserID, inUserID); err != nil {
		return domain.Match{}, err
	}

	s.audit.Record(ctx, domain.AuditEntry{
		ActorID:  actorID,
		Entity:   "match",
		EntityID: match.ID.String(),
		Action:   "player_substituted",
		Before:   map[string]any{"out": outUserID.String()},
		After:    map[string]any{"in": inUserID.String()},
	})
	s.publishEvent(ctx, event.ID.String(), "match")

	return s.matches.FindByID(ctx, match.ID)
}

func (s *EventService) Close(ctx context.Context, actorID, eventID uuid.UUID) (domain.Event, error) {
	event, err := s.events.FindByID(ctx, eventID)
	if err != nil {
		return domain.Event{}, err
	}
	if err := s.authorizeManage(ctx, event, actorID); err != nil {
		return domain.Event{}, err
	}
	if event.Status == domain.EventClosed {
		return event, nil
	}

	event.Status = domain.EventClosed
	updated, err := s.events.Update(ctx, event)
	if err != nil {
		return domain.Event{}, err
	}

	s.audit.Record(ctx, domain.AuditEntry{
		ActorID:  actorID,
		Entity:   "event",
		EntityID: eventID.String(),
		Action:   "closed",
	})
	s.publishEvent(ctx, eventID.String(), "event")
	return updated, nil
}

func (s *EventService) Matches(ctx context.Context, eventID uuid.UUID) ([]domain.Match, error) {
	return s.matches.ListByEvent(ctx, eventID)
}

// authorizeManage memeriksa hak organizer: penyelenggara sesi, atau pengurus
// komunitas tempat sesi itu bernaung.
func (s *EventService) authorizeManage(ctx context.Context, event domain.Event, userID uuid.UUID) error {
	if event.OrganizerID == userID {
		return nil
	}
	_, role, err := s.communities.FindBySlug(ctx, event.CommunitySlug, &userID)
	if err != nil {
		return err
	}
	if role != nil && (*role == domain.RoleOwner || *role == domain.RoleModerator) {
		return nil
	}
	return fmt.Errorf("%w: hanya organizer atau pengurus komunitas yang bisa mengubah sesi ini", domain.ErrForbidden)
}

func canManage(event domain.Event, userID uuid.UUID, role *domain.MemberRole) bool {
	if event.OrganizerID == userID {
		return true
	}
	return role != nil && (*role == domain.RoleOwner || *role == domain.RoleModerator)
}

// publishEvent mengirim ringkasan sesi ke pelanggan SSE sesi itu. Nama kejadian
// dibedakan supaya klien cukup memuat ulang bagian yang berubah.
func (s *EventService) publishEvent(ctx context.Context, eventID, name string) {
	joined, waitlist, checkedIn, err := s.events.Counts(ctx, uuid.MustParse(eventID))
	if err != nil {
		return
	}
	s.broker.PublishNamed(stream.TopicEvent(eventID), name, map[string]any{
		"eventId":        eventID,
		"joinedCount":    joined,
		"waitlistCount":  waitlist,
		"checkedInCount": checkedIn,
	})
}

func validateEventCreate(in CreateEventInput) error {
	switch {
	case len(strings.TrimSpace(in.Title)) < 3:
		return fmt.Errorf("%w: judul sesi minimal 3 karakter", domain.ErrInvalid)
	case !in.Sport.Valid():
		return fmt.Errorf("%w: cabang olahraga harus padel atau tennis", domain.ErrInvalid)
	case !in.Format.Valid():
		return fmt.Errorf("%w: format harus doubles atau singles", domain.ErrInvalid)
	case strings.TrimSpace(in.Venue) == "":
		return fmt.Errorf("%w: venue wajib diisi", domain.ErrInvalid)
	case strings.TrimSpace(in.City) == "":
		return fmt.Errorf("%w: kota wajib diisi", domain.ErrInvalid)
	case !in.EndsAt.After(in.StartsAt):
		return fmt.Errorf("%w: waktu selesai harus setelah waktu mulai", domain.ErrInvalid)
	case in.Capacity < 2:
		return fmt.Errorf("%w: kapasitas minimal 2 orang", domain.ErrInvalid)
	case in.Fee < 0:
		return fmt.Errorf("%w: biaya tidak boleh negatif", domain.ErrInvalid)
	case in.LevelMin < 1 || in.LevelMax > 7 || in.LevelMax < in.LevelMin:
		return fmt.Errorf("%w: rentang level harus di antara 1 dan 7", domain.ErrInvalid)
	case in.Format == domain.FormatDoubles && in.Capacity < 4:
		return fmt.Errorf("%w: kapasitas format doubles minimal 4 orang", domain.ErrInvalid)
	case in.Format == domain.FormatSingles && in.Capacity < 2:
		return fmt.Errorf("%w: kapasitas format singles minimal 2 orang", domain.ErrInvalid)
	}
	return nil
}

// eventStandings menghitung peringkat pemain dalam satu sesi dari pertandingan
// yang sudah selesai dan skornya terkonfirmasi. Semua peserta yang masih
// terdaftar ikut tampil, termasuk yang belum bertanding, dengan statistik nol.
// Poin: menang 3, seri 1, kalah 0.
func eventStandings(matches []domain.Match, registrations []domain.Registration) []domain.EventStanding {
	type row struct {
		userID      uuid.UUID
		name        string
		avatarColor string
		matches     int
		wins        int
		draws       int
		losses      int
		points      int
		setsWon     int
		setsLost    int
	}
	rows := map[uuid.UUID]*row{}

	ensure := func(userID uuid.UUID, name, avatarColor string) *row {
		if r, ok := rows[userID]; ok {
			return r
		}
		r := &row{userID: userID, name: name, avatarColor: avatarColor}
		rows[userID] = r
		return r
	}

	// Peserta terdaftar jadi dasar tabel, supaya pemain tanpa pertandingan
	// tetap muncul dengan 0 main dan 0 poin.
	for _, reg := range registrations {
		if reg.Status != domain.RegJoined {
			continue
		}
		ensure(reg.UserID, reg.UserName, reg.AvatarColor)
	}

	for _, m := range matches {
		if m.Status != domain.MatchFinished || m.Score == nil || m.Score.Status != domain.ScoreConfirmed {
			continue
		}
		winsA, winsB := 0, 0
		for _, set := range m.Score.Sets {
			if set.A > set.B {
				winsA++
			} else if set.B > set.A {
				winsB++
			}
		}
		draw := winsA == winsB
		winner := domain.TeamA
		if winsB > winsA {
			winner = domain.TeamB
		}

		for _, p := range m.Players {
			r := ensure(p.UserID, p.UserName, p.AvatarColor)
			r.matches++
			if p.Team == domain.TeamA {
				for _, set := range m.Score.Sets {
					if set.A > set.B {
						r.setsWon++
					} else if set.B > set.A {
						r.setsLost++
					}
				}
			} else {
				for _, set := range m.Score.Sets {
					if set.B > set.A {
						r.setsWon++
					} else if set.A > set.B {
						r.setsLost++
					}
				}
			}
			switch {
			case draw:
				r.draws++
				r.points++
			case p.Team == winner:
				r.wins++
				r.points += 3
			default:
				r.losses++
			}
		}
	}

	out := make([]domain.EventStanding, 0, len(rows))
	for _, r := range rows {
		out = append(out, domain.EventStanding{
			UserID:      r.userID,
			Name:        r.name,
			AvatarColor: r.avatarColor,
			Matches:     r.matches,
			Wins:        r.wins,
			Draws:       r.draws,
			Losses:      r.losses,
			Points:      r.points,
			SetsWon:     r.setsWon,
			SetsLost:    r.setsLost,
		})
	}

	sort.SliceStable(out, func(i, j int) bool {
		// Peserta yang belum bertanding sama sekali selalu di bawah peserta
		// yang sudah main, walaupun keduanya sama-sama 0 poin.
		if (out[i].Matches == 0) != (out[j].Matches == 0) {
			return out[i].Matches > 0
		}
		if out[i].Points != out[j].Points {
			return out[i].Points > out[j].Points
		}
		if out[i].Wins != out[j].Wins {
			return out[i].Wins > out[j].Wins
		}
		if out[i].Draws != out[j].Draws {
			return out[i].Draws > out[j].Draws
		}
		if (out[i].SetsWon - out[i].SetsLost) != (out[j].SetsWon - out[j].SetsLost) {
			return (out[i].SetsWon - out[i].SetsLost) > (out[j].SetsWon - out[j].SetsLost)
		}
		if out[i].Matches != out[j].Matches {
			return out[i].Matches < out[j].Matches
		}
		return out[i].Name < out[j].Name
	})

	for i := range out {
		out[i].Rank = i + 1
	}
	return out
}

// eventBench mengembalikan peserta hadir yang tidak bermain di ronde paling
// akhir. Ronde terakhir dipakai karena rotasi selalu berjalan maju: begitu
// ronde baru disusun, daftar tunggu ikut berganti.
func eventBench(matches []domain.Match, registrations []domain.Registration) []domain.BenchPlayer {
	latest := 0
	for _, m := range matches {
		if m.Round > latest {
			latest = m.Round
		}
	}
	if latest == 0 {
		return nil
	}

	playing := map[uuid.UUID]bool{}
	played := map[uuid.UUID]int{}
	for _, m := range matches {
		for _, p := range m.Players {
			played[p.UserID]++
			if m.Round == latest {
				playing[p.UserID] = true
			}
		}
	}

	bench := make([]domain.BenchPlayer, 0)
	for _, reg := range registrations {
		if reg.Status != domain.RegJoined || !reg.CheckedIn || playing[reg.UserID] {
			continue
		}
		bench = append(bench, domain.BenchPlayer{
			UserID:       reg.UserID,
			Name:         reg.UserName,
			AvatarColor:  reg.AvatarColor,
			RoundsPlayed: played[reg.UserID],
		})
	}

	sort.SliceStable(bench, func(i, j int) bool {
		if bench[i].RoundsPlayed != bench[j].RoundsPlayed {
			return bench[i].RoundsPlayed < bench[j].RoundsPlayed
		}
		return bench[i].Name < bench[j].Name
	})
	return bench
}
