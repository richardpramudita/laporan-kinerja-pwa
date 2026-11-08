# Aplikasi Laporan Kinerja Bulanan (PWA)

## Isi paket
- `index.html`, `app.js`, `manifest.webmanifest`, `sw.js`, `icon.svg`: frontend PWA untuk GitHub Pages.
- `Code.gs`: backend Google Apps Script.
- Tiga format pilihan: Pelindungan Masyarakat, Penegakan Perda/Perkada, dan Trantibum.
- Foto diperkecil di perangkat sebelum dikirim ke Google Drive.
- Backend menyimpan metadata dan foto ke folder Drive, lalu mengekspor Word (.docx) dan PDF.

## Penting tentang tahap awal
Paket ini adalah kerangka aplikasi fungsional awal. Bagian isi pendahuluan, landasan hukum, kesimpulan, dan tata letak dokumen hasil dibuat sebagai susunan dasar berdasarkan tiga contoh yang diberikan; belum menyalin seluruh halaman template asli secara identik. Sebelum dipakai sebagai laporan kedinasan final, lengkapi teks baku/landasan hukum dan validasi hasil ekspor Word/PDF terhadap dokumen resmi.

## 1. Siapkan Google Drive
1. Buat satu folder khusus, misalnya `Arsip Laporan Kinerja`.
2. Salin ID folder dari URL Drive.
3. Buka [script.google.com](https://script.google.com), buat project baru.
4. Tempel isi `Code.gs`.
5. Ganti `GANTI_DENGAN_ID_FOLDER_GOOGLE_DRIVE` dengan ID folder.
6. Di Apps Script, buka **Services (+)** lalu tambahkan **Drive API** (Advanced Google service).
7. Pada Google Cloud project yang terhubung, pastikan Google Drive API aktif.
8. Jalankan fungsi `doGet` atau `setup`? Untuk pertama kali, jalankan fungsi `setup` dari editor dan izinkan akses Drive.
9. Deploy > New deployment > Web app. Execute as: **Me**. Who has access: jangan ubah menjadi publik untuk data nyata. Deployment saat ini dilaporkan memakai **Only myself**; browser GitHub Pages kemungkinan tidak dapat memanggilnya tanpa autentikasi yang dirancang khusus. Gunakan hanya untuk uji koneksi awal, dan jangan simpan data sensitif.
10. Salin URL `/exec`.

## 2. Pasang frontend di GitHub Pages
1. Buat repository GitHub baru.
2. Unggah lima file frontend: `index.html`, `app.js`, `manifest.webmanifest`, `sw.js`, `icon.svg`.
3. Settings > Pages > Deploy from branch > pilih `main` dan `/root`.
4. Buka URL GitHub Pages.
5. URL backend pada paket ini sudah diisi otomatis dengan alamat deployment yang diberikan. Buka Pengaturan koneksi, klik Simpan koneksi, lalu Uji koneksi.
6. Dari Chrome Android, menu ⋮ > Tambahkan ke layar utama.

## 3. Uji
- Pilih satu format.
- Isi bulan, kategori, uraian, foto.
- Simpan kegiatan.
- Periksa folder Drive.
- Pilih Buat laporan Word + PDF dan periksa kedua hasil.

## Catatan teknis dan keamanan
- Endpoint Apps Script di contoh ini menerima permintaan dari frontend tanpa autentikasi pengguna tambahan. Gunakan hanya untuk uji awal dengan data non-rahasia. Untuk penggunaan kedinasan yang memuat data pribadi, perlu ditambahkan autentikasi/otorisasi yang sesuai dan pembatasan akses; jangan membagikan URL Web App secara terbuka.
- Jangan mengunggah foto atau uraian yang memuat data pribadi sensitif sebelum kontrol akses diterapkan.
- Ekspor DOCX/PDF memerlukan Advanced Drive API.
- Folder output akan dibuat per proses pembuatan laporan.
- Penyimpanan lokal browser hanya dipakai untuk daftar ringkas di tampilan; sumber data utama berada di Drive.
