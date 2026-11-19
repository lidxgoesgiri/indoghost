# Persyaratan migrasi sinematik IndoGhost

Sebagai penjaga ronda baru, pemain dapat menjelajahi Desa Kalisepi lewat cerita visual dan menyelesaikan kampanye dengan progres lama tetap terbaca.

| ID | Kriteria penerimaan |
| --- | --- |
| R1 | Ketika aplikasi dibangun, Vite menghasilkan entry React dari TypeScript strict. Impor modul normal dan lazy import menggantikan registry game di window. |
| R2 | Ketika pemain menggulir maju atau mundur, ScrollTrigger menyelaraskan posisi kamera perspektif, kedalaman lapisan, cahaya, transisi adegan dan teks di empat lokasi. Lenis mengoordinasikan scroll dengan ticker GSAP. |
| R3 | Ketika pointer bergerak, partikel dan cahaya memberikan respons yang terlihat. Ketika WebGL tidak tersedia, poster dan cerita tetap dapat dibaca serta tombol main berfungsi. |
| R4 | Saat reduced motion aktif, kamera dekoratif, parallax dan animasi partikel berhenti. Tab tersembunyi atau dialog terbuka menghentikan pekerjaan dekoratif yang berjalan. Keyboard, sentuh, skip dan fokus dialog tetap berfungsi. |
| R5 | Saat sebuah Chase dimainkan, Phaser mengelola scene real-time. Saat pemain membuka puzzle dan rumah, aturan tetangga dan patroli menghasilkan konsekuensi yang sama seperti baseline. |
| R6 | Ketika save HTTP v1 sudah ada, Continue, bahasa, pilihan horor, saldo nyala, petunjuk dan epilog dipulihkan. Setelah menang, hadiah hanya diberikan sekali. Latihan tidak memajukan kampanye. |
| R7 | Ketika ancaman berubah, musik beradaptasi. Audio dimulai setelah interaksi. Jeda, mute, skip dan No Jumpscare berlaku juga pada sting defeat. |
| R8 | Ketika pemain mengakses menu atau HUD pada ponsel dan desktop, isi EN/ID terbaca, kontrol dapat dijangkau dan halaman tidak meluap secara horizontal. |
| R9 | Setelah setiap tahap, jalankan pemeriksaan sesuai lapisannya. Sebelum menyerahkan build, buktikan perjalanan awal hingga epilog, pemeriksaan aksesibilitas, fallback dan pemuatan aset produksi. |
