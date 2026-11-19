# IndoGhost

Jalani tujuh malam sebagai penjaga ronda di Desa Kalisepi. Jelajahi gerbang, gang koin, serambi tegel, dan pendopo melalui cerita berbasis scroll. Pilih **Mulai ronda** untuk kampanye. Tiga mode latihan dapat dimainkan tanpa mengubah jurnal.

## Menjalankan game

Gunakan Node.js 22.12 atau lebih baru yang didukung Vite, lalu jalankan dari folder proyek.

```sh
npm ci
npm start
```

Buka [pratinjau lokal](http://127.0.0.1:4173/). Seluruh gambar, font, musik sintesis dan pustaka runtime tersedia dari aplikasi. Setelah dependensi dipasang, game bisa dijalankan di komputer tanpa internet. Untuk hosting statis, jalankan `npm run build` dan layani isi direktori `dist/` melalui HTTP(S).

## Membawa progres lama

Save v1 dibaca otomatis jika browser, profil, protokol, nama host dan port sama. Alamat `localhost` dan `127.0.0.1` memiliki penyimpanan masing-masing.

Jika dahulu bermain dengan klik ganda, buka kembali **index.html di lokasi berkas dan profil browser yang sama**, unduh jurnal lama, kemudian impor berkas JSON dari **Jurnal** di versi web. Pemindahan ini menggunakan unduhan lokal.

## Kontrol

| Mode | Cara bermain |
| --- | --- |
| Tuyul Chase | Bergerak dengan panah, WASD atau D-pad. Ambil seluruh koin, nyalakan lampion dengan Spasi, lalu capai gerbang. |
| Tuyul Sweeper | Pilih tegel dengan sentuhan atau panah. Enter memakai alat, F memasang kurungan dan H meminta petunjuk. |
| Lolos dari Kuntilanak | Sentuh ruangan terhubung atau gunakan panah/WASD. Dengarkan patroli, ambil kunci dan pemukul kentongan, lalu kembali ke serambi. |

Esc menjeda permainan. Preferensi gerak, intensitas horor, bahasa dan suara dapat diubah melalui pengaturan.

## Arsitektur dan verifikasi

React dan TypeScript mengelola antarmuka dan kampanye. Phaser menjalankan simulasi pengejaran. Solver dan patroli rumah memiliki modul aturan mandiri. GSAP, ScrollTrigger dan Lenis menyelaraskan narasi dengan gulir. React Three Fiber dan Three.js merender kamera, pencahayaan dan partikel. Aset sinematik memiliki fallback poster.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Pengujian browser menjalankan preview build produksi pada port 4185 dengan profil terpisah. Jika Chrome sudah terpasang, set variabel lingkungan `PW_CHANNEL=chrome` untuk menggunakannya. Di PowerShell gunakan `$env:PW_CHANNEL = 'chrome'`.

Baca [audit dan keputusan migrasi](docs/audit-migrasi.md), [desain Kiro](.kiro/specs/migrasi-sinematik/design.md), [daftar tugas Kiro](.kiro/specs/migrasi-sinematik/tasks.md), [hasil pengujian dan tangkapan layar](docs/pengujian-migrasi.md), serta [asal aset](public/assets/ASSET_LICENSES.md).
