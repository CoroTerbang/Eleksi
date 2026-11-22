# Eleksi Sekolah

Sistem e-voting untuk pemilihan formatur organisasi sekolah. Dibuat untuk bilik suara berbasis browser: satu device per bilik, pemilih mengetik kode kartu, memilih calon, lalu kode hangus.

Sistem ini ringan: satu proses Node.js, satu file database SQLite, tanpa server database terpisah dan tanpa native dependency.

## Fitur

- **Panel admin**
  - Kelola Daftar Pemilih Tetap (DPT): tambah satu atau impor massal `NIS,Nama`.
  - Kelola calon: nomor, nama, foto poster, teks/visi.
  - Atur kuota pilihan per pemilih (bisa 1 atau beberapa calon).
  - Generate kode 6 digit per pemilih dan cetak kartu kode.
  - Buka/tutup pemungutan, reset suara.
  - Hasil live per calon.
  - Pemetaan pemilih–pilihan hanya bisa dilihat setelah memasukkan password admin lagi.
- **Panel pemilih**
  - Login dengan kode 6 digit dari kartu.
  - Pilih calon sesuai kuota, submit, kode otomatis hangus.
  - Satu orang satu suara dijaga oleh database, bukan hanya UI.
  - Kunci layar browser: kalau fullscreen keluar atau tab pindah, layar terkunci dan butuh password admin.
- **Ramah perangkat sekolah**: jalan di tablet/laptop via LAN/WiFi, tanpa internet.

## Kebutuhan

- Node.js 22.5 atau lebih baru (memakai `node:sqlite` bawaan).
- Browser modern (Chrome/Edge/Firefox) di device bilik.
- Jaringan lokal yang menghubungkan device bilik ke laptop server.

## Mulai cepat

```bash
npm install
npm start
```

Buka:

- Panel admin: `http://localhost:3000/admin`
- Panel pemilih: `http://localhost:3000/vote`

Device bilik di jaringan yang sama membuka `http://IP-LAPTOP:3000/vote`. Ganti port dengan `PORT=8080 npm start`.

Admin awal: `admin` / `admin123` (bisa diubah lewat `ADMIN_USER` dan `ADMIN_PASS` sebelum first run). Ganti password sebelum dipakai nyata.

## Alur pemilihan

1. Admin isi DPT.
2. Admin tambah calon beserta foto dan teks.
3. Admin atur kuota pilihan, lalu **Generate Kode 6 Digit** dan **Cetak Kartu Kode**.
4. Admin buka pemungutan.
5. Di bilik, pemilih mengetik kode, memilih calon, kirim. Kode hangus.
6. Hasil terlihat live di panel admin.

## Kunci layar bilik

Halaman pemilih meminta fullscreen. Kalau pemilih keluar dari fullscreen, berpindah tab, atau jendela kehilangan fokus, layar terkunci dan menampilkan permintaan password admin. Ini perlindungan best-effort di browser; untuk kunci penuh perlu mode kios karena OS, yang berada di luar aplikasi ini. Fitur bisa dimatikan dari panel admin.

## Keamanan

- Kode pemilih unik, hanya sekali pakai.
- Batasan satu suara dipaksakan di transaksi database; pemilihan ganda ditolak.
- Pilihan divalidasi sebelum hak suara dikonsumsi, jadi error input tidak menghanguskan kode.
- Password admin di-hash dengan bcrypt.
- Session memakai cookie dengan `sameSite=lax` dan masa berlaku terbatas.
- Pemetaan pemilih–pilihan tersembunyi dari tampilan hasil biasa dan butuh re-auth password.

Catatan: server berjalan tanpa HTTPS. Gunakan di jaringan lokal yang dipercaya, atau pasang reverse proxy TLS di depannya untuk penggunaan yang lebih luas.

## Backup

Database ada di `data/eleksi.sqlite`. Salin file itu saat pemungutan tidak berjalan. Foto calon ada di `public/uploads/`. Untuk memindah server, salin kedua direktori itu.

## Reset

Reset menghapus semua suara, menandai ulang kode, dan menutup pemungutan. DPT dan daftar calon tidak berubah.

## Variabel lingkungan

| Nama | Default | Fungsi |
|---|---|---|
| `PORT` | `3000` | Port HTTP |
| `ADMIN_USER` | `admin` | Username admin awal |
| `ADMIN_PASS` | `admin123` | Password admin awal |
| `ELECTION_STATUS` | `open` | Status awal pemungutan |
| `SESSION_SECRET` | bawaan dev | Rahasia session; ganti di produksi |
| `ELEKSI_DB` | `data/eleksi.sqlite` | Lokasi file database |

## Struktur proyek

```text
server.js            # Express app, routes admin & pemilih
db.js                # Skema SQLite + helper data
views/               # Template EJS (admin, pemilih, partials)
public/              # CSS, kiosk.js, upload foto
tests/               # node:test
data/                # Database SQLite (dibuat saat first run)
```

## Tes

```bash
npm test
```

## Lisensi

Proyek ini berlisensi MIT.
