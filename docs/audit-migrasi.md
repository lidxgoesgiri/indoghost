# Audit IndoGhost dan keputusan migrasi

## Sumber dan batas audit

Audit 19–20 November 2026 mencakup entry point, seluruh berkas JS dan CSS, aset lokal, ketiga permainan, jurnal, save, audio, kontrol, pengujian dan konfigurasi proyek. Dua dokumen pemilik dibaca sebelum migrasi.

| Dokumen | Bagian yang menentukan keputusan | SHA-256 berkas |
| --- | --- | --- |
| IndoGhost_PRD_Konsep_Awal_v0.2.md | §4–11 mengatur cerita, tiga mode, hubungan antar-malam dan pilihan horor. §12–15 membahas arsitektur, workflow dan penerimaan. | `4a69941a8c27a24dc5bc16d94236b6503f43441dd2483bf2eefa2e27596e092f` |
| IndoGhost_UI_UX_Design_Brief_v1.0.md | §2–6 memberi arah visual dan perjalanan pemain. §7–13 membahas motion, audio, performa, aksesibilitas dan Kiro. | `22ff3a1781305140ca4c8fa6643304429d905a420b622a946c966f1d352b568e` |

PRD v0.2 memperbarui nama menjadi IndoGhost dan mempertahankan Kalisepi sebagai nama desa. PRD menyebut pilihan teknologi sebagai arah awal. Brief menempatkan WebGL pada P1 dan Lenis sebagai opsi. Instruksi pemilik pada migrasi ini menetapkan semuanya sebagai bagian runtime. Kegiatan untuk kompetisi seperti publikasi, video dan playtest manusia memiliki ruang lingkup tersendiri.

## Temuan sebelum refactor

| Dampak | Bukti pada implementasi awal | Keputusan |
| --- | --- | --- |
| Tinggi · arsitektur | `package.json` hanya menjalankan server Node. `index.html` memuat lima skrip klasik dengan `defer`. Shell, tiga mesin dan kampanye berkomunikasi melalui properti `window`. | Ganti entry dengan Vite dan React. Periksa kontrak antar-modul dengan TypeScript strict di build produksi. |
| Tinggi · arahan visual | `village.js:showScene` mengganti URL gambar dan nama lokasi. Tombol sebelumnya/berikutnya bekerja, tetapi posisi scroll tidak menggerakkan kamera, narasi atau cahaya. | Susun empat adegan berurutan dengan kamera, kedalaman, cahaya, partikel dan navigasi bab. Pertahankan akses langsung ke permainan. |
| Tinggi · simulasi | `chase.js:start` memiliki RAF, keyboard global, gambar Canvas dan AI dalam satu closure. Risiko migrasi meliputi gerak dua kali, input tertahan dan tabrakan yang berubah. | Pindahkan waktu, scene, input dan render ke Phaser. Pertahankan grid, seed, BFS, kecepatan, lampion, tabrakan dan hadiah. |
| Tinggi · save | `campaign.js` memakai satu key preferensi dan tujuh key malam v1. Hanya awalan malam valid yang menentukan progres. Koin, delta nyala dan ID petunjuk ikut disimpan. Browser memisahkan save per origin. | Pakai kembali key dan bentuk data, urutan bab dan origin HTTP lokal. Uji save lama, reload, kerusakan sebagian, storage terblokir dan kemenangan ulang. |
| Sedang · sistem audio | Pada game lama satu oscillator drone dipilih berdasarkan mode, dengan cue pendek untuk koin, tegel, kemenangan dan defeat. Tidak ada lapisan musik yang mengikuti ancaman. | Pertahankan bunyi sintesis orisinal. Hubungkan intensitas musik dengan perilaku musuh, sertakan peredaman saat jeda dan prioritas preferensi pengguna. |
| Sedang · UI dan aksesibilitas | Dialog native, fokus awal/kembali, kontrol sentuh, grid DOM, dua bahasa dan tiga pilihan scare sudah bernilai. Efek defeat mengenali kuntilanak dan bisa dilewati. | Pertahankan semantik dan interaksi tersebut. Gunakan preferensi gerak pada landing, termasuk saat GPU gagal dan saat dialog terbuka. |
| Sedang · pengiriman | Seluruh skrip permainan dimuat saat masuk. Build lama mendukung klik ganda HTML. Seluruh gambar WebP, font WOFF2 dan lisensi font tersedia lokal. | Pisahkan engine per mode dan renderer 3D. Distribusikan hasil build statis lewat HTTP(S). Uji produksi tanpa CDN. |
| Tinggi · bukti regresi | Repo awal tidak memuat `.kiro/`, unit test, runner E2E atau lockfile. Bukti Chrome sebelumnya ada di luar repo. | Tambahkan Steering, Specs, test yang dapat diulang, lockfile dan laporan per tahap. |

### Mekanik yang menjadi acuan

| Mode | Perilaku yang wajib bertahan |
| --- | --- |
| Chase | Empat malam dengan 5, 6, 7 dan 8 koin. Musuh berpatroli dan mengejar memakai jarak grid. Lampion mengusir selama empat detik. Petunjuk membuka jalur pada malam ketujuh. |
| Sweeper | Tiga lantai terkurasi termasuk latihan lanjutan. Dua kesempatan. Deduksi berdasarkan tetangga dan total tuyul. Petunjuk Mbah Ronda menyertakan alasan. Penggunaan nyala bersifat opsional. |
| Escape | Sembilan ruang. Mendengarkan meramalkan patroli. Lantai berderit dan ketukan memengaruhi arah kuntilanak. Ambil kunci dan pemukul kentongan, lalu pulang ke serambi. |
| Kampanye | Urutan aktual Chase, Sweeper, Chase, Sweeper, Chase, Escape, Chase. Tiga petunjuk terhubung ke jurnal dan epilog. Percobaan dan latihan tidak menggandakan hadiah. |

Beberapa gagasan konsep berbeda dari permainan yang sudah dikirim. Malam 3–5 menggunakan urutan pada tabel. Escape berbasis giliran memakai bunyi dan perlindungan ruangan. Puzzle memakai lantai terkurasi dan aturan hitung global. Tugas migrasi menjaga level yang telah dimainkan dan save yang sesuai dengannya. Remap kontrol penuh, archive entitas tambahan, generator level baru, dan perubahan urutan kampanye memerlukan pekerjaan produk terpisah.

## Benchmark dan arah seni

IVRESS memberi akses melalui gesture awal, lalu menandai perjalanan dengan sembilan bab, navigasi bernomor, kontrol suara, ajakan melanjutkan scroll dan interaksi kontekstual. Pola ini dipakai untuk ritme narasi, komposisi tipografi dan petunjuk navigasi. Detail kamera dan shader IndoGhost merupakan keputusan desain proyek. [IVRESS — Spin a Tale](https://brand.ivress.co.jp/)

Saat diuji langsung di browser, klik pembuka menampilkan prolog dengan figur jauh di koridor batu. Gulir ke bab *Encounter* membawa karakter ke depan kamera, mengubah warna dominan dan mengganti narasi. IndoGhost menerapkan ritme perpindahan itu dengan gerak mendekati rumah, pergeseran elemen pada kedalaman berbeda dan bukaan cahaya yang memperlihatkan tempat berikutnya. [Pembukaan IVRESS yang diuji](https://brand.ivress.co.jp/en/)

Urutan IndoGhost dimulai di gerbang joglo, menyusuri gang koin, membaca jejak di tegel, lalu tiba di pendopo. Gerakan kamera mengikuti perjalanan mata antara lokasi, cahaya lampion menuntun perhatian dan partikel bereaksi terhadap penunjuk. Semua visual tetap memakai aset Kalisepi. Pemain dapat melompat ke suatu bab, melewati cerita atau mulai ronda dari adegan pertama.

Rencana implementasi dan kriteria uji tercatat di [desain migrasi](../.kiro/specs/migrasi-sinematik/design.md) dan [daftar tugas](../.kiro/specs/migrasi-sinematik/tasks.md).

## Hasil migrasi

Kode aktif kini masuk lewat `src/main.tsx`. Di versi HTTP, HTML menyediakan titik mount React. Jika dibuka melalui alamat berkas lama, halaman itu juga dapat mengekspor jurnal lokal. Seluruh aturan permainan, UI dan renderer aktif berada di modul TypeScript. Sebelas berkas JS, CSS dan server lama diarsipkan setelah hash SHA-256 masing-masing cocok dengan cadangan sebelum migrasi.

Perspektif 3D dipakai pada perjalanan desa. Phaser mengelola pengejaran real-time. Papan deduksi dan rumah patroli memakai tombol React agar posisi pemain, status tegel dan aksi tetap dapat dioperasikan lewat keyboard dan dibaca teknologi bantu. Musik memakai tiga lapisan sintesis dengan tempo, kekuatan denyut dan disonansi yang berubah mengikuti ancaman. Hasil pemeriksaan dapat diulang dari [laporan pengujian](pengujian-migrasi.md).
