# Tahap implementasi dan bukti

- [x] 0. Baca PRD v0.2 dan brief v1.0, periksa baseline, catat kontrak gameplay, sumber aset dan benchmark di audit. Tulis requirements, design dan steering sebelum mengubah aplikasi.
- [x] 1. Pasang runtime dan lockfile, buat entry Vite/React, periksa kontrak TypeScript dan build fondasi. R1. Build awal lulus dengan Vite 7.3.8 dan tsc strict. Baseline asli juga lulus pengujian ulang Chrome pada 320, 375, 768 dan 1440 piksel.
- [x] 2. Migrasikan simulasi dan lifecycle engine. Sebelas unit test mesin lulus. Pembandingan dengan baseline mencakup 14 konfigurasi Chase, 1.500 deduksi Sweeper dan 11.452 transisi Escape. Kontrol sentuh, keyboard dan waktu perlindungan saat jeda diuji melalui Phaser. R5.
- [x] 3. Migrasikan kampanye, save, mixer dan scare director. Sembilan unit test kampanye lulus. Chrome menamatkan tujuh malam, menampilkan epilog setelah reload, memindahkan jurnal berkas lama, serta menguji volume, musik adaptif, tiga intensitas dan retry. R6–R7.
- [x] 4. Bangun cerita empat lokasi, kamera, parallax, partikel, pencahayaan dan transisi. Lima skenario Playwright memeriksa narasi dua arah, keyboard, landscape, WebGL absen atau hilang, serta kegagalan unduh modul 3D. Hasil render diperiksa secara visual. R2–R4.
- [x] 5. Integrasikan build produksi dan uji ulang. TypeScript strict, 20 unit test dan 19 skenario Playwright lulus. Uji silang Firefox dan WebKit mencakup save v1, kemenangan, reload dan fallback. Kondisi pengukuran dan batas perangkat dicatat di [laporan pengujian](../../../docs/pengujian-migrasi.md). R8–R9.
