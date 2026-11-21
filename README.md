# Eleksi IPM

Sistem e-voting formatur Ikatan Pelajar Muhammadiyah. Satu server Node.js, satu file database SQLite, dua panel: admin dan pemilih (device bilik).

## Kebutuhan

- Node.js 22.5 atau lebih baru (memakai `node:sqlite` bawaan).
- Tablet/laptop yang bisa membuka browser dan terhubung ke jaringan yang sama dengan server.

## Instalasi

```bash
npm install
```

## Menjalankan

```bash
npm start
```

Lalu buka:

- Panel admin: `http://localhost:3000/admin`
- Panel pemilih: `http://localhost:3000/vote`

Server mendengar di `0.0.0.0:3000`. Device bilik di jaringan yang sama bisa membuka `http://IP-LAPTOP:3000/vote`. Ganti port lewat `PORT=8080`.

Admin awal: `admin` / `admin123` (atau set `ADMIN_USER` dan `ADMIN_PASS` sebelum first run). Ganti password setelah instalasi.

## Alur singkat

1. Login admin, isi DPT lewat "Tambah Satu" atau "Impor Massal" (`NIS,Nama` per baris).
2. Tambah calon beserta foto poster dan teks.
3. Atur kuota pilihan (jumlah calon per pemilih), status, dan kunci layar.
4. Klik **Generate Kode 6 Digit**, lalu **Cetak Kartu Kode** dan bagikan ke pemilih.
5. Buka pemungutan.
6. Di bilik: pemilih mengetik kode, memilih calon sesuai kuota, kirim. Kode hangus setelah dipakai.
7. Hasil bisa dilihat live. Pemetaan pemilih–pilihan hanya muncul setelah memasukkan password admin.

## Kunci layar bilik

Saat halaman pemilih dibuka, browser diminta fullscreen. Jika pemilih keluar dari fullscreen, berpindah tab, atau jendela kehilangan fokus, layar terkunci dan meminta password admin. Ini best-effort di browser; untuk penguncian penuh perlu mode kios karena OS (di luar aplikasi ini). Fitur bisa dimatikan dari panel admin.

## Backup

Database ada di `data/eleksi.sqlite`. Salin file itu saat pemungutan sedang tidak berjalan. Foto calon tersimpan di `public/uploads/`. Untuk memindah server, salin kedua direktori tersebut.

## Reset

Tombol reset di panel admin menghapus semua suara, mengubah semua kode, dan menutup pemungutan. DPT dan daftar calon tidak berubah.

## Variabel lingkungan

| Nama | Default | Fungsi |
|---|---|---|
| `PORT` | `3000` | Port HTTP |
| `ADMIN_USER` | `admin` | Username admin awal |
| `ADMIN_PASS` | `admin123` | Password admin awal |
| `ELECTION_STATUS` | `open` | Status awal pemungutan |
| `SESSION_SECRET` | warto_default | Rahasia sesi; ganti di produksi |
| `ELEKSI_DB` | `data/eleksi.sqlite` | Lokasi file database |

## Tes

```bash
npm test
```
