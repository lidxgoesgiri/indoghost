# Desain pembuka

IVRESS menampilkan angka pemuatan sebelum mengundang satu gesture untuk memasuki prolog. IndoGhost mengadaptasi ritmenya menggunakan ilustrasi joglo dan kayon yang sudah dimiliki proyek. Lapisan gambar ini memakai titik cahaya lampion sebagai arah masuk. [Referensi IVRESS](https://brand.ivress.co.jp/)

Urutan interaksi ialah **memuat → siap atau pemulihan → masuk → desa**. Dialog native berada di atas poster desa. Peramban menyediakan modalitas keyboard dan sentuh. Renderer Three.js, ambience bab dan putaran animasi cerita ditangguhkan selagi gerbang aktif. Pembuka memakai timeline GSAP dan komposit CSS, sehingga pemuatan atau pemulihan WebGL bisa berlangsung terpisah setelah masuk.

Manifest menunggu hasil decode ilustrasi gerbang dan kayon, serta hasil pemuatan Cormorant Garamond reguler, Cormorant Garamond miring dan Plus Jakarta Sans. Satu aset berhasil bernilai 20 persen. Penghitung memiliki denominator tetap, termasuk ketika satu aset gagal. Tombol lewati tersedia sejak awal. Tenggat delapan detik membuka pilihan untuk lanjut saat masih ada permintaan tertunda.

Pilihan suara ditahan di dialog sampai pengguna memasuki desa. Gesture memanggil mixer kampanye yang sudah ada. Penanda masuk menggunakan kunci `indoghost.opening.v1` pada sessionStorage. Jika penyimpanan dibatasi, flag dalam memori dan entri riwayat menyediakan jalur cadangan. Penanda terpisah dari jurnal tujuh malam.
