# RallyUp Design Direction

Sumber arah: keputusan pemilik produk, ditranskripsikan dari jawaban brief.
Filter yang berlaku: `antislop.md` (core) + `antislop-ui`, `antislop-copywriting`,
`antislop-code`.

## 1. Identity

RallyUp adalah platform pengelolaan fun match untuk komunitas padel dan tenis di
Indonesia. Pemakai utamanya adalah penyelenggara sesi (organizer) dan pemain
komunitas. Nada produk: lapangan, bukan korporat. Tegas, cepat dibaca, sedikit
berisik seperti halaman olahraga di koran cetak.

Bahasa seluruh antarmuka: Bahasa Indonesia.

## 2. Dials

`ENERGY 3 / RHYTHM 3 / MOTION 2`

| Dial | Nilai | Konsekuensi |
|---|---|---|
| ENERGY | 3 | Judul berat, kontras tinggi, aksen dipakai tajam dan jarang. Halaman menyapa keras di layar pertama. |
| RHYTHM | 3 | Komposisi tiap bagian berbeda: ada blok asimetris, pita data full-bleed, daftar rapat, tabel lebar. Tidak ada dua bagian dengan susunan sama. |
| MOTION | 2 | Reveal saat scroll, transisi halus saat data berubah, angka leaderboard bergerak saat SSE masuk. Tanpa loop tanpa henti. |

## 3. Palet

Tiga warna inti plus satu aksen. Netral hitam/putih tidak dihitung sebagai warna inti.

| Token | Nilai | Alasan |
|---|---|---|
| `--ink` | `#0C0C0D` | Tinta editorial. Dasar teks di mode terang, dasar halaman di mode gelap. |
| `--paper` | `#F4F1E9` | Kertas koran hangat. Latar mode terang, teks di mode gelap. |
| `--court` | `#0E4D3A` | Hijau lapangan. Warna inti ketiga untuk data, status sah, dan bidang olahraga. |
| `--rally` | `#FFD100` | Kuning pukulan. Satu aksen, hanya di momen kunci: CTA utama, peringkat 1, penanda siaran langsung. |

Aksen `--rally` dilarang tersebar. Satu layar maksimal dua tempat pemakaian.

Mode gelap wajib berfungsi penuh: toggle nyata, kontras lolos di kedua mode.

## 4. Tipografi

| Peran | Huruf | Alasan |
|---|---|---|
| Display | Archivo Black | Bobot tunggal yang berat, seperti kepala berita olahraga cetak. Satu berat memaksa hierarki lewat ukuran, bukan lewat banyak varian. |
| Teks & UI | Archivo | Superfamily yang sama, jadi judul dan teks menyatu. Variabel, ringan di muat. |
| Angka | Archivo + `tabular-nums` | Skor, peringkat, dan rating harus sejajar kolom. |

Aturan: huruf kapital berlebar hanya untuk angka papan skor dan label pendek
maksimal empat huruf. Paragraf tidak pernah kapital semua.

## 5. Identity motif: garis lapangan

Satu motif yang diulang: garis lapangan. Pemakaian motif ini harus menjawab
alasan berikut.

- Rule horizontal tipis memisahkan bagian (bukan dekorasi, pengganti border).
- Titik tengah dan garis servis dipakai pada hero sebagai pembagi komposisi.
- Baris tabel peringkat diberi keyline vertikal tipis seperti garis lapangan.

Motif ini yang membuat RallyUp terlihat miliknya sendiri, bukan milik produk
orang lain.

## 6. Batasan yang dipegang

- Tanpa gradien biru ungu, tanpa orb, tanpa glow merata.
- Radius kecil dan konsisten; tombol utama bukan pil penuh.
- Bayangan hanya untuk elemen yang benar-benar terangkat.
- Tidak ada statistik tanpa sumber. Angka yang tampil berasal dari data seed
  atau data nyata, bukan angka hiasan.
- Semua kontrol punya perilaku nyata. Tautan mati dilarang.
- Setiap layar punya status kosong, memuat, dan gagal.
