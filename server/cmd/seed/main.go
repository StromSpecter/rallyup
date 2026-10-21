// Seeder menulis data contoh untuk pengembangan.
//
// Seluruh data di sini fiktif dan hanya dipakai untuk mencoba alur aplikasi.
// Rating tidak ditulis langsung ke tabel: skor pertandingan dikonfirmasi lewat
// service yang sama dengan yang dipakai API, jadi papan peringkat yang muncul
// benar-benar hasil mesin rating, bukan angka tempelan.
//
// Perintah ini selalu membersihkan tabel yang dikelolanya lebih dulu, jadi aman
// dijalankan berulang tanpa menabrak batas unik. Jalankan lewat `make seed`,
// atau `go run ./cmd/seed` dari folder server/.
package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"rallyup/server/internal/domain"
	"rallyup/server/internal/pkg/password"
	"rallyup/server/internal/repo"
	"rallyup/server/internal/service"
	"rallyup/server/internal/stream"
)

// demoPassword dipakai semua akun contoh supaya bisa langsung dipakai mencoba
// alur masuk tanpa menyiapkan akun satu per satu.
const demoPassword = "rallyup123"

const (
	emailRani   = "rani@rallyup.test"
	emailDimas  = "dimas@rallyup.test"
	emailFajar  = "fajar@rallyup.test"
	emailSinta  = "sinta@rallyup.test"
	emailYusuf  = "yusuf@rallyup.test"
	emailLaras  = "laras@rallyup.test"
	emailBagas  = "bagas@rallyup.test"
	emailNadia  = "nadia@rallyup.test"
	emailSekar  = "sekar@rallyup.test"
	emailYoga   = "yoga@rallyup.test"
	emailAdit   = "adit@rallyup.test"
	emailCitra  = "citra@rallyup.test"
	emailBayu   = "bayu@rallyup.test"
	emailPutri  = "putri@rallyup.test"
	emailIlham  = "ilham@rallyup.test"
	emailGita   = "gita@rallyup.test"
	emailRendra = "rendra@rallyup.test"

	slugPadelBandung     = "padel-bandung-selatan"
	slugTennisJakarta    = "tennis-jakarta-pusat"
	slugPadelSurabaya    = "padel-surabaya-timur"
	slugBadmintonJakarta = "badminton-jakarta-selatan"
	slugBasketBandung    = "basket-bandung"
)

func main() {
	dsn := os.Getenv("RALLYUP_DATABASE_URL")
	if dsn == "" {
		fail(fmt.Errorf("RALLYUP_DATABASE_URL kosong"))
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		fail(err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		fail(fmt.Errorf("database tidak terjangkau: %w", err))
	}

	store := repo.NewStore(pool)
	broker := stream.NewBroker()
	notifications := service.NewNotificationService(store.Notifications, broker)

	s := &seeder{
		ctx:             ctx,
		store:           store,
		users:           map[string]domain.User{},
		communities:     map[string]domain.Community{},
		communitySports: map[string]domain.Sport{},
		services: &service.Services{
			Community: service.NewCommunityService(store.Communities),
			Event: service.NewEventService(store.Events, store.Communities, store.Registrations,
				store.Matches, store.Ratings, notifications, store.Audit, broker),
			Score: service.NewScoreService(store.Scores, store.Matches, store.Events,
				store.Communities, store.Ratings, notifications, store.Audit, broker),
			Player: service.NewPlayerService(store.Ratings, store.Matches),
		},
	}

	steps := []struct {
		name string
		run  func(context.Context) error
	}{
		{"membersihkan data lama", s.clear},
		{"membuat pengguna", s.createUsers},
		{"membuat komunitas", s.createCommunities},
		{"membuat sesi dan hasil", s.createEvents},
	}
	for _, step := range steps {
		if err := step.run(ctx); err != nil {
			fail(fmt.Errorf("%s: %w", step.name, err))
		}
	}

	s.report()
}

type seeder struct {
	ctx             context.Context
	store           *repo.Store
	services        *service.Services
	users           map[string]domain.User
	communities     map[string]domain.Community
	communitySports map[string]domain.Sport
}

// clear mengosongkan seluruh tabel aplikasi. Tabel referensi tidak dihapus,
// hanya isinya, supaya urutan migrasi tetap terjaga.
func (s *seeder) clear(ctx context.Context) error {
	_, err := s.store.Pool.Exec(ctx, `truncate table
		audit_logs, notifications, score_submissions, match_players, matches,
		event_registrations, events, community_members, communities,
		player_ratings, users
		restart identity cascade`)
	if err != nil {
		return err
	}
	fmt.Println("data contoh lama dibersihkan")
	return nil
}

type demoUser struct {
	Name  string
	Email string
}

var demoUsers = []demoUser{
	{"Rani Puspita", emailRani},
	{"Dimas Prakoso", emailDimas},
	{"Fajar Nugraha", emailFajar},
	{"Sinta Maharani", emailSinta},
	{"Yusuf Ramadhan", emailYusuf},
	{"Laras Wulandari", emailLaras},
	{"Bagas Setiawan", emailBagas},
	{"Nadia Kusuma", emailNadia},
	{"Sekar Ayu", emailSekar},
	{"Yoga Pratama", emailYoga},
	{"Adit Santoso", emailAdit},
	{"Citra Dewi", emailCitra},
	{"Bayu Anggara", emailBayu},
	{"Putri Handayani", emailPutri},
	{"Ilham Maulana", emailIlham},
	{"Gita Larasati", emailGita},
	{"Rendra Prakoso", emailRendra},
}

func (s *seeder) createUsers(ctx context.Context) error {
	hash, err := password.Hash(demoPassword)
	if err != nil {
		return err
	}
	for _, u := range demoUsers {
		created, err := s.store.Users.Create(ctx, u.Name, u.Email, hash, service.AvatarColor(u.Email))
		if err != nil {
			return fmt.Errorf("pengguna %s: %w", u.Email, err)
		}
		s.users[u.Email] = created
	}
	fmt.Printf("%d pengguna dibuat\n", len(s.users))
	return nil
}

type demoCommunity struct {
	Slug        string
	Name        string
	City        string
	Sport       domain.Sport
	Description string
	Owner       string
	Moderators  []string
	Members     []string
}

var demoCommunities = []demoCommunity{
	{
		Slug:  slugPadelBandung,
		Name:  "Padel Bandung Selatan",
		City:  "Bandung",
		Sport: domain.SportPadel,
		Description: "Komunitas padel untuk sesi rutin tengah pekan dan turnamen mini " +
			"akhir pekan di kawasan Bandung selatan.",
		Owner:      emailRani,
		Moderators: []string{emailDimas},
		Members: []string{
			emailDimas, emailFajar, emailSinta, emailYusuf,
			emailLaras, emailBagas, emailNadia, emailAdit, emailBayu,
		},
	},
	{
		Slug:  slugTennisJakarta,
		Name:  "Tennis Jakarta Pusat",
		City:  "Jakarta",
		Sport: domain.SportTennis,
		Description: "Jadwal tenis lapangan keras di Jakarta Pusat. Terbuka untuk " +
			"pemain yang baru mulai sampai yang rutin bertanding.",
		Owner:      emailSekar,
		Moderators: []string{emailYoga},
		Members: []string{
			emailYoga, emailAdit, emailCitra, emailBayu,
			emailPutri, emailBagas, emailNadia,
		},
	},
	{
		Slug:  slugPadelSurabaya,
		Name:  "Padel Surabaya Timur",
		City:  "Surabaya",
		Sport: domain.SportPadel,
		Description: "Sesi padel santai akhir pekan di Surabaya Timur, " +
			"rotasi pasangan diatur supaya semua kebagian bermain.",
		Owner:   emailIlham,
		Members: []string{emailDimas, emailFajar, emailAdit, emailBayu, emailCitra, emailPutri, emailSinta},
	},
	{
		Slug:  slugBadmintonJakarta,
		Name:  "Badminton Jakarta Selatan",
		City:  "Jakarta",
		Sport: domain.SportBadminton,
		Description: "Sesi badminton malam di Jakarta Selatan. Lapangan karpet, " +
			"pasangan diundi ulang tiap gim supaya semua kebagian.",
		Owner:   emailGita,
		Members: []string{emailYoga, emailAdit, emailCitra, emailBayu, emailBagas, emailNadia, emailFajar},
	},
	{
		Slug:  slugBasketBandung,
		Name:  "Basket Bandung",
		City:  "Bandung",
		Sport: domain.SportBasket,
		Description: "Half court rutin untuk pemain yang ingin tetap main " +
			"tanpa komitmen liga.",
		Owner:   emailRendra,
		Members: []string{emailDimas, emailFajar, emailAdit, emailBayu, emailBagas},
	},
}

func (s *seeder) createCommunities(ctx context.Context) error {
	for _, spec := range demoCommunities {
		owner := s.user(spec.Owner)
		community, err := s.store.Communities.Create(ctx, domain.Community{
			Slug:        spec.Slug,
			Name:        spec.Name,
			City:        spec.City,
			Description: spec.Description,
		}, owner.ID)
		s.communitySports[spec.Slug] = spec.Sport
		if err != nil {
			return fmt.Errorf("komunitas %s: %w", spec.Slug, err)
		}
		s.communities[spec.Slug] = community

		for _, email := range spec.Members {
			if _, err := s.store.Communities.Join(ctx, community.ID, s.user(email).ID); err != nil {
				return fmt.Errorf("anggota %s di %s: %w", email, spec.Slug, err)
			}
		}
		for _, email := range spec.Moderators {
			if err := s.store.Communities.FindOrCreateMembership(ctx, community.ID, s.user(email).ID, domain.RoleModerator); err != nil {
				return fmt.Errorf("moderator %s di %s: %w", email, spec.Slug, err)
			}
		}
	}
	fmt.Printf("%d komunitas dibuat\n", len(s.communities))
	return nil
}

type pastEvent struct {
	Community    string
	Organizer    string
	Title        string
	Venue        string
	StartsAt     time.Time
	Fee          int
	Courts       int
	Participants []string
}

type openEvent struct {
	Community    string
	Organizer    string
	Title        string
	Venue        string
	StartsAt     time.Time
	Capacity     int
	Fee          int
	LevelMin     int
	LevelMax     int
	Publish      bool
	Notes        string
	Participants []string
}

func (s *seeder) createEvents(ctx context.Context) error {
	now := time.Now()

	for _, spec := range []pastEvent{
		{
			Community: slugPadelBandung,
			Organizer: emailRani,
			Title:     "Sesi Rutin Padel Rabu",
			Venue:     "GOR Padel Buah Batu",
			StartsAt:  at(now.AddDate(0, 0, -5), 19, 0),
			Fee:       60000,
			Courts:    2,
			Participants: []string{
				emailRani, emailDimas, emailFajar, emailSinta,
				emailYusuf, emailLaras, emailBagas, emailNadia,
			},
		},
		{
			Community: slugTennisJakarta,
			Organizer: emailSekar,
			Title:     "Sunday Tennis Social",
			Venue:     "Lapangan Tenis Senayan",
			StartsAt:  at(now.AddDate(0, 0, -3), 8, 0),
			Fee:       75000,
			Courts:    2,
			Participants: []string{
				emailSekar, emailYoga, emailAdit, emailCitra,
				emailBayu, emailPutri, emailBagas, emailNadia,
			},
		},
		{
			Community: slugBadmintonJakarta,
			Organizer: emailGita,
			Title:     "Badminton Malam Jumat",
			Venue:     "GOR Bulungan",
			StartsAt:  at(now.AddDate(0, 0, -4), 20, 0),
			Fee:       50000,
			Courts:    2,
			Participants: []string{
				emailGita, emailYoga, emailAdit, emailCitra,
				emailBayu, emailBagas, emailNadia, emailFajar,
			},
		},
	} {
		if err := s.seedPastEvent(ctx, spec); err != nil {
			return err
		}
	}

	for _, spec := range []openEvent{
		{
			Community: slugPadelBandung,
			Organizer: emailRani,
			Title:     "Turnamen Mini Padel",
			Venue:     "Padel Court Dago",
			StartsAt:  at(now.AddDate(0, 0, 4), 18, 30),
			Capacity:  8,
			Fee:       150000,
			LevelMin:  1,
			LevelMax:  7,
			Publish:   true,
			Notes:     "Format doubles, rotasi pasangan tiap ronde. Bawa botol minum sendiri.",
			Participants: []string{
				emailRani, emailDimas, emailFajar, emailSinta, emailYusuf,
				emailLaras, emailBagas, emailNadia, emailAdit, emailBayu,
			},
		},
		{
			Community:    slugTennisJakarta,
			Organizer:    emailSekar,
			Title:        "Tennis Night Jakarta",
			Venue:        "Lapangan Tenis Senayan",
			StartsAt:     at(now.AddDate(0, 0, 2), 19, 0),
			Capacity:     8,
			Fee:          90000,
			LevelMin:     2,
			LevelMax:     6,
			Publish:      true,
			Notes:        "Sesi malam, lampu lapangan sudah termasuk biaya.",
			Participants: []string{emailSekar, emailYoga, emailAdit, emailCitra},
		},
		{
			Community:    slugPadelSurabaya,
			Organizer:    emailIlham,
			Title:        "Padel Akhir Pekan Surabaya",
			Venue:        "Padel House Surabaya",
			StartsAt:     at(now.AddDate(0, 0, 6), 16, 0),
			Capacity:     12,
			Fee:          80000,
			LevelMin:     1,
			LevelMax:     7,
			Publish:      true,
			Notes:        "Tiga lapangan dipakai bergantian, pasangan diundi di lokasi.",
			Participants: []string{emailIlham, emailDimas, emailFajar, emailAdit},
		},
		{
			Community:    slugBadmintonJakarta,
			Organizer:    emailGita,
			Title:        "Badminton Rutin Rabu",
			Venue:        "GOR Bulungan",
			StartsAt:     at(now.AddDate(0, 0, 3), 20, 0),
			Capacity:     8,
			Fee:          50000,
			LevelMin:     1,
			LevelMax:     7,
			Publish:      true,
			Notes:        "Tiga lapangan, gim 21 poin, pasangan diundi ulang tiap gim.",
			Participants: []string{emailGita, emailYoga, emailAdit, emailCitra},
		},
		{
			Community:    slugBasketBandung,
			Organizer:    emailRendra,
			Title:        "Basket Half Court",
			Venue:        "GOR C-Tra Arena",
			StartsAt:     at(now.AddDate(0, 0, 5), 19, 0),
			Capacity:     10,
			Fee:          40000,
			LevelMin:     1,
			LevelMax:     7,
			Publish:      true,
			Notes:        "Format 3x3 bergilir, tim diacak di lokasi.",
			Participants: []string{emailRendra, emailDimas, emailFajar, emailAdit, emailBayu},
		},
		{
			Community: slugPadelBandung,
			Organizer: emailRani,
			Title:     "Latihan Pagi Pemula",
			Venue:     "Padel Court Dago",
			StartsAt:  at(now.AddDate(0, 0, 9), 7, 0),
			Capacity:  8,
			Fee:       50000,
			LevelMin:  1,
			LevelMax:  3,
			Publish:   false,
			Notes:     "Konsep masih disusun, jadwal belum dibuka.",
		},
	} {
		if err := s.seedOpenEvent(ctx, spec); err != nil {
			return err
		}
	}
	return nil
}

// seedPastEvent menjalankan alur sesi dari awal sampai tutup: anggota bergabung,
// absen, jadwal disusun, skor diisi lalu dikonfirmasi, dan rating diperbarui.
func (s *seeder) seedPastEvent(ctx context.Context, spec pastEvent) error {
	community := s.community(spec.Community)
	organizer := s.user(spec.Organizer)

	event, err := s.services.Event.Create(ctx, organizer.ID, service.CreateEventInput{
		CommunityID: community.ID,
		Title:       spec.Title,
		Sport:       s.communitySports[spec.Community],
		Format:      domain.FormatDoubles,
		Venue:       spec.Venue,
		City:        community.City,
		StartsAt:    spec.StartsAt,
		EndsAt:      spec.StartsAt.Add(3 * time.Hour),
		Capacity:    len(spec.Participants),
		Fee:         spec.Fee,
		LevelMin:    1,
		LevelMax:    7,
		Notes:       "Data contoh: sesi yang sudah selesai beserta hasilnya.",
		Publish:     true,
	})
	if err != nil {
		return fmt.Errorf("sesi %q: %w", spec.Title, err)
	}

	for _, email := range spec.Participants {
		user := s.user(email)
		if _, err := s.services.Event.Join(ctx, user.ID, event.ID); err != nil {
			return fmt.Errorf("daftar %s di %q: %w", email, spec.Title, err)
		}
		if err := s.services.Event.CheckIn(ctx, organizer.ID, event.ID, user.ID, true); err != nil {
			return fmt.Errorf("absen %s di %q: %w", email, spec.Title, err)
		}
	}

	matches, err := s.services.Event.GeneratePairings(ctx, organizer.ID, event.ID, spec.Courts, false)
	if err != nil {
		return fmt.Errorf("jadwal %q: %w", spec.Title, err)
	}

	for i, match := range matches {
		if len(match.Players) == 0 {
			return fmt.Errorf("pertandingan %d di %q tidak punya pemain", i+1, spec.Title)
		}
		submitter := match.Players[0].UserID
		submission, err := s.services.Score.Submit(ctx, submitter, match.ID, scorePattern(i))
		if err != nil {
			return fmt.Errorf("skor pertandingan %d di %q: %w", i+1, spec.Title, err)
		}
		if _, err := s.services.Score.Confirm(ctx, organizer.ID, submission.ID); err != nil {
			return fmt.Errorf("konfirmasi skor pertandingan %d di %q: %w", i+1, spec.Title, err)
		}
	}

	if _, err := s.services.Event.Close(ctx, organizer.ID, event.ID); err != nil {
		return fmt.Errorf("tutup sesi %q: %w", spec.Title, err)
	}
	fmt.Printf("sesi selesai %q: %d pertandingan dengan skor terkonfirmasi\n", spec.Title, len(matches))
	return nil
}

func (s *seeder) seedOpenEvent(ctx context.Context, spec openEvent) error {
	community := s.community(spec.Community)
	organizer := s.user(spec.Organizer)

	event, err := s.services.Event.Create(ctx, organizer.ID, service.CreateEventInput{
		CommunityID: community.ID,
		Title:       spec.Title,
		Sport:       s.communitySports[spec.Community],
		Format:      domain.FormatDoubles,
		Venue:       spec.Venue,
		City:        community.City,
		StartsAt:    spec.StartsAt,
		EndsAt:      spec.StartsAt.Add(3 * time.Hour),
		Capacity:    spec.Capacity,
		Fee:         spec.Fee,
		LevelMin:    spec.LevelMin,
		LevelMax:    spec.LevelMax,
		Notes:       spec.Notes,
		Publish:     spec.Publish,
	})
	if err != nil {
		return fmt.Errorf("sesi %q: %w", spec.Title, err)
	}

	joined, waitlisted := 0, 0
	for _, email := range spec.Participants {
		registration, err := s.services.Event.Join(ctx, s.user(email).ID, event.ID)
		if err != nil {
			return fmt.Errorf("daftar %s di %q: %w", email, spec.Title, err)
		}
		if registration.Status == domain.RegWaitlist {
			waitlisted++
			continue
		}
		joined++
	}

	state := "terbit"
	if !spec.Publish {
		state = "draf"
	}
	fmt.Printf("sesi %s %q: %d terdaftar, %d daftar tunggu\n", state, spec.Title, joined, waitlisted)
	return nil
}

// scorePattern mengembalikan skor contoh bergiliran. Tim A menang di pola
// genap, tim B menang di pola ganjil, supaya rating bergerak dua arah dan
// papan peringkat tidak diisi satu tim saja.
func scorePattern(index int) []domain.SetScore {
	patterns := [][]domain.SetScore{
		{{A: 6, B: 4}, {A: 6, B: 3}},
		{{A: 4, B: 6}, {A: 7, B: 5}, {A: 3, B: 6}},
		{{A: 6, B: 2}, {A: 6, B: 4}},
		{{A: 5, B: 7}, {A: 6, B: 4}, {A: 7, B: 5}},
	}
	return patterns[index%len(patterns)]
}

func (s *seeder) report() {
	fmt.Println()
	fmt.Println("Data contoh siap. Masuk dengan akun berikut:")
	fmt.Printf("  email    : %s\n", emailRani)
	fmt.Printf("  password : %s (sama untuk semua akun contoh)\n", demoPassword)
	fmt.Println()
	fmt.Println("Komunitas:")
	for _, spec := range demoCommunities {
		c := s.communities[spec.Slug]
		fmt.Printf("  /komunitas/%s  %s (%s)\n", c.Slug, c.Name, c.City)
	}
}

func (s *seeder) user(email string) domain.User {
	u, ok := s.users[email]
	if !ok {
		fail(fmt.Errorf("pengguna contoh %q tidak dikenal", email))
	}
	return u
}

func (s *seeder) community(slug string) domain.Community {
	c, ok := s.communities[slug]
	if !ok {
		fail(fmt.Errorf("komunitas contoh %q tidak dikenal", slug))
	}
	return c
}

// at memindahkan jam pada tanggal tertentu tanpa mengubah zona waktu lokal.
func at(day time.Time, hour, minute int) time.Time {
	return time.Date(day.Year(), day.Month(), day.Day(), hour, minute, 0, 0, day.Location())
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
