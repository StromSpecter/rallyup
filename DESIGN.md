# RallyUp Design Direction

Sumber arah: berkas Figma `rallyup` (kunci `N1GJyp5mJ7HcAPsLsPvu3D`), disaring
lewat keputusan pemilik produk. Filter yang berlaku: `antislop.md` (core) +
`antislop-ui`, `antislop-copywriting`, `antislop-layoutmobile`, `antislop-code`.

## 1. Identity

RallyUp adalah platform pengelolaan fun match untuk komunitas padel, tenis,
badminton, dan basket di Indonesia. Pemakai utamanya adalah penyelenggara sesi
(organizer) dan pemain komunitas. Nada produk: lapangan, bukan korporat. Tegas,
cepat dibaca, banyak ruang lapang, dan foto orang bermain sebagai bukti.

Bahasa seluruh antarmuka: Bahasa Indonesia.

## 2. Dials

`ENERGY 3 / RHYTHM 3 / MOTION 2`

| Dial | Nilai | Konsekuensi |
|---|---|---|
| ENERGY | 3 | Judul kondensasi besar, bidang biru penuh lebar, aksen lime dipakai tajam dan jarang. |
| RHYTHM | 3 | Bagian bergantian latar putih dan abu `#F5F6F2`; satu bagian biru penuh sebagai jeda keras. Tanpa dua bagian dengan susunan sama. |
| MOTION | 2 | Reveal saat scroll, transisi halus saat data berubah. Zoom halus pada foto cabang saat kursor mendekat. Tanpa loop tanpa henti. |

## 3. Palet

Biru lapangan sebagai warna inti, navy sebagai dasar teks, lime sebagai satu
aksen. Nilai diambil apa adanya dari berkas Figma.

| Token | Nilai | Alasan |
|---|---|---|
| `--color-brand` | `#174BE0` | Biru lapangan. Warna inti: tombol utama, tautan, bidang penuh lebar. Tidak berubah di mode gelap. |
| `--color-ink` | `#101B30` | Navy tinta. Teks utama di mode terang, dasar kaki halaman, latar pilihan aktif. |
| `--color-rally` | `#D5FB59` | Lime pukulan. Satu aksen, hanya di momen kunci: ajakan utama, penanda bagian, panah wordmark di latar gelap. |
| `--secondary` | `#F5F6F2` | Abu kertas. Latar bagian selang-seling. |
| `--muted-foreground` | `#626B7A` | Teks pendukung, kontras 5,3:1 di atas putih. |
| `--border` | `#DADFD9` | Garis rambut. |

Aksen `--rally` dilarang tersebar. Satu layar maksimal dua tempat pemakaian.
Karena kontrasnya rendah di atas putih, lime hanya muncul sebagai bidang berisi
teks ink atau di atas latar gelap, tidak pernah sebagai garis tipis di latar
terang.

Mode gelap wajib berfungsi penuh: toggle nyata, kontras lolos di kedua mode.
Bidang biru penuh memakai `--color-brand` yang tetap, bukan `--primary` yang
berubah di mode gelap, supaya teks putih di atasnya selalu terbaca.

## 4. Tipografi

| Peran | Huruf | Alasan |
|---|---|---|
| Display | Barlow Condensed ExtraBold 800 | Kondensasi tinggi dan rapat, seperti papan skor dan headline olahraga. Hierarki lewat ukuran. |
| Teks & UI | Inter | Netral dan rapat di ukuran kecil; dipakai untuk isi, label, dan tombol. |
| Angka | Inter + `tabular-nums` | Skor, peringkat, dan rating harus sejajar kolom. |

Aturan: berat 800 adalah bawaan untuk kelas `font-display` dan bisa ditimpa
utilitas `font-*` bila sebuah elemen butuh bobot lain. Label kecil maksimal
empat kata, huruf besar, `tracking` tidak lebih dari `0.12em`. Paragraf tidak
pernah kapital semua.

## 5. Motif: foto lapangan dan garis rambut

Identitas dibawa oleh fotografi olahraga, bukan oleh ornamen gambar.

- Foto orang bermain dipakai full-bleed di hero dan di kartu cabang; setiap foto
  dekoratif ditandai `alt=""` supaya pembaca layar tidak membacanya dua kali.
- Garis rambut 1px (`--border`) memisahkan bagian, menggantikan border tebal.
- Penanda bagian: kotak kecil 7px, biru di latar terang, lime di latar gelap,
  selalu berpasangan dengan label bernomor.
- Panah `arrow-up-right` menandai setiap tautan yang membawa keluar dari bagian,
  bukan hiasan.

Berkas foto disimpan di `client/public/figma/` dan dipakai lewat jalur absolut.

## 6. Batasan yang dipegang

- Tanpa gradien biru ungu, tanpa orb, tanpa glow merata.
- Radius 4px (`rounded-sm`) untuk bidang, kartu, dan tombol. Pil penuh hanya
  untuk filter cabang dan avatar.
- Tanpa bayangan pada bidang datar; bayangan hanya untuk elemen yang benar-benar
  terangkat seperti dialog, dropdown, dan toast.
- Tidak ada statistik tanpa sumber. Angka yang tampil berasal dari data seed
  atau data nyata, bukan angka hiasan.
- Semua kontrol punya perilaku nyata. Tautan mati dilarang: bagian yang belum
  punya isi nyata (misalnya jurnal dan tautan sosial di berkas Figma) tidak
  dipasang sebagai tautan.
