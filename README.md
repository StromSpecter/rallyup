# RallyUp

Platform pengelolaan fun match untuk komunitas padel dan tenis di Indonesia.
Penyelenggara menjalankan sesi berulang dari satu tempat, pemain menemukan
pertandingan yang seimbang, dan setiap hasil yang terverifikasi menaikkan
rating serta peringkat komunitas.

Arah desain ada di [DESIGN.md](DESIGN.md).

## Stack

| Lapisan | Teknologi |
|---|---|
| Frontend | Vite, React, Tailwind CSS v4, React Router, react-icons, SnitchUI, Motion (Framer Motion) |
| Backend | Go, chi, pgx, golang-jwt |
| Database | PostgreSQL |
| Realtime | Server-Sent Events |

## Struktur proyek

```
rallyup/
├── DESIGN.md          # Arah visual, palet, tipografi, dials
├── Makefile           # Perintah harian
├── docker-compose.yml # Postgres untuk development
├── client/            # Frontend (Vite + React)
└── server/            # Backend (Go)
```

### Server

```
server/
├── cmd/
│   ├── api/           # Entrypoint HTTP
│   ├── migrate/       # Runner migrasi
│   └── seed/          # Data contoh
├── internal/
│   ├── config/        # Baca env sekali saat start
│   ├── domain/        # Tipe entitas, konstanta status, kontrak repository
│   ├── repo/          # Implementasi repository dengan pgx
│   ├── service/       # Aturan bisnis: event, pairing, skor, rating
│   ├── handler/       # Handler HTTP dan DTO
│   ├── middleware/    # Auth, CORS, logging, recovery
│   ├── stream/        # Broker Server-Sent Events
│   └── pkg/           # Utilitas murni: jwt, hash, respons, kueri
├── migrations/        # SQL urut, tanpa framework eksternal
└── internal/server/   # Perakitan router dan dependency injection
```

Pembagian yang dipegang: `handler` tidak menyentuh SQL, `service` tidak tahu
HTTP, `repo` tidak tahu aturan bisnis. Satu arah ketergantungan, dari handler
ke repo.

### Client

```
client/src/
├── app/               # Router, provider, layout aplikasi
├── features/          # Fitur per domain: auth, events, matches, leaderboard
│   └── <feature>/
│       ├── api/       # Akses data fitur itu saja
│       ├── components/
│       ├── pages/
│       └── hooks/
├── shared/
│   ├── api/           # Client HTTP dan klien SSE
│   ├── components/    # Primitif dan komponen UI yang dipakai lintas fitur
│   ├── hooks/         # Hook generik
│   ├── lib/           # Fungsi murni tanpa React
│   └── types/         # Kontrak tipe yang dipakai bersama
└── styles/            # Token desain dan aturan global
```

Satu fitur tidak membaca folder fitur lain secara langsung. Kalau butuh
komponen bersama, ia naik ke `shared`.

## Menjalankan

Prasyarat: Go 1.24, Node 20+, Docker, Postgres (Docker dipakai di sini).

```bash
cp .env.example .env
make install
make up          # Postgres di port 5432
make db          # Terapkan migrasi
make seed        # Data contoh: komunitas, event, pemain, skor
make dev         # API :8080 dan client :5173 bersamaan
```

Buka http://localhost:5173.

## Kontrak API

Semua rute di bawah `/api/v1`.

### Autentikasi

| Method | Rute | Keterangan |
|---|---|---|
| POST | `/auth/register` | Daftar, langsung dapat pasangan token |
| POST | `/auth/login` | Masuk |
| POST | `/auth/refresh` | Tukar refresh token baru |
| GET | `/me` | Profil sendiri |
| PATCH | `/me` | Ubah nama atau warna avatar |

Access token berumur 15 menit, refresh token 14 hari dan disimpan sebagai
httpOnly cookie. Endpoint `/stream/me` menerima token lewat query `?access_token=`
karena EventSource tidak bisa mengirim header.

### Komunitas

| Method | Rute | Keterangan |
|---|---|---|
| GET | `/communities` | Daftar komunitas |
| POST | `/communities` | Buat, pembuat jadi owner |
| GET | `/communities/{slug}` | Detail dan keanggotaan saya |
| POST | `/communities/{slug}/join` | Gabung |

### Event

| Method | Rute | Keterangan |
|---|---|---|
| GET | `/events` | Filter: `communitySlug`, `sport`, `status`, `q`, `from`, `to` |
| POST | `/events` | Buat sesi |
| GET | `/events/{id}` | Detail, peserta, pertandingan |
| PATCH | `/events/{id}` | Ubah sesi, khusus organizer |
| POST | `/events/{id}/join` | Gabung, otomatis masuk waitlist kalau penuh |
| POST | `/events/{id}/leave` | Keluar, slot langsung terisi dari waitlist |
| POST | `/events/{id}/registrations/{userId}/check-in` | Absen, khusus organizer |
| POST | `/events/{id}/pairings` | Susun pasangan dari pemain yang sudah absen |
| POST | `/events/{id}/close` | Tutup sesi |
| GET | `/events/{id}/matches` | Daftar pertandingan |

### Skor

| Method | Rute | Keterangan |
|---|---|---|
| POST | `/matches/{id}/score` | Kirim skor per set |
| POST | `/matches/{id}/score/{scoreId}/confirm` | Lawan atau organizer konfirmasi |
| POST | `/matches/{id}/score/{scoreId}/dispute` | Ajukan sanggahan |

Rating hanya dihitung ulang setelah skor berstatus `confirmed`.

### Peringkat dan pemain

| Method | Rute | Keterangan |
|---|---|---|
| GET | `/leaderboard` | `kind` salah satu dari `skill`, `season`, `participation` |
| GET | `/players/{id}` | Profil dan statistik |
| GET | `/players/{id}/matches` | Riwayat pertandingan |

### Server-Sent Events

| Rute | Topik |
|---|---|
| `/api/v1/stream/events/{id}` | `registrations`, `checkin`, `match`, `score`, `event` |
| `/api/v1/stream/leaderboard?communitySlug=&sport=` | `leaderboard` |
| `/api/v1/stream/me` | `notification` |

Tiap koneksi mengirim heartbeat komentar tiap 25 detik supaya proxy tidak
memutus. Pesan berformat `event: <topik>\ndata: <json>\n\n`.

## Perintah umum

```bash
make help        # Daftar perintah
make lint        # go vet dan typecheck client
make test        # Test Go
make db-reset    # Buat ulang database dari nol
```
