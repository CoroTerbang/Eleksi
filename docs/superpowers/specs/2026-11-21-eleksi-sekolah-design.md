# Design: Eleksi Organisasi Sekolah — Sistem E-Voting Formatur

## Intent

Pemilihan formatur organisasi sekolah di sekolah. Bilik suara berisi device (tablet/laptop) yang membuka website; pemilih memasukkan kode unik 6 digit dari kartu, memilih calon, lalu kode hangus. Admin mengelola DPT, calon, pemungutan, dan melihat hasil live.

## Goals

- Panel admin: DPT, calon (foto poster + teks), pemungutan buka/tutup, hasil live, reset.
- Panel pemilih (device bilik): fullscreen, input kode, pilih calon, submit, sukses.
- Kunci layar otomatis saat fullscreen/tab keluar, butuh kode operator.
- Satu orang satu suara, dijaga di DB (kode sekali pakai + constraint).
- Kuota pilihan bisa diatur (1 atau N calon).

## Non-goals

- Tidak butuh kamera/QR/scanner.
- Tidak butuh kios OS; kunci layar cukup best-effort di browser.
- Tidak ada multi-tenant; satu pemilihan saja.
- Tidak ada audit log tingkat lanjut (cukup tabel votes).
- Tidak ada email/notifikasi.

## Anti-goals

- Admin tidak boleh melihat pilihan individu tanpa memasukkan password lagi.
- Pemilih tidak boleh memilih dua kali, walaupun ganti device.
- Kode yang sudah dipakai tidak bisa dipakai ulang.

## Constraints

- Node.js >= 22.5 (node:sqlite). Tanpa native dependency.
- SQLite file lokal. Server jalan di satu laptop sekolah, akses via LAN/WiFi.
- ~70 pemilih. Upload foto max 2MB.

## Decided parts

- Stack: Express + EJS + node:sqlite + bcryptjs + multer + express-session.
- Auth admin: username/password, session cookie.
- DPT: nama + NIS. Kode 6 digit acak per pemilih, dicetak dari admin.
- Calon: nomor, nama, foto, deskripsi/teks.
- Voting: pemilih mengetik kode; web validasi; tampilkan calon sesuai kuota; submit dalam transaksi.
- Kuota: setting admin (default 1).
- Hasil: admin bisa lihat live.
- Kunci: fullscreen request; deteksi exit/tab hidden; overlay kunci + kode operator; setting aktif/nonaktif.

## What's left to builder

- Detail UI, CSS, responsive.
- Format cetak kartu kode (HTML print).
- Validasi input di trust boundary.
- Test: double-vote ditolak.

## Calls made (mine, please check)

- Kuota default 1, dan pemilih wajib memilih tepat sejumlah kuota (tidak boleh kurang).
- Kode operator kunci = password admin (tidak ada kode terpisah).
- Hasil live ditampilkan sebagai jumlah per calon + persentase dari total pilihan, tanpa identitas pemilih.
- Reset suara: hapus semua votes, hapus status pemakaian kode, generate ulang semua kode, set status pemungutan ke closed. DPT dan calon tidak berubah.
- Tabel votes menyimpan voter_id (kode pemilih) dan candidate_id. Admin dapat melihat pemetaan pemilih–pilihan secara read-only setelah memasukkan password admin lagi (re-auth). Agregat hasil tetap terlihat tanpa re-auth.- Admin awal: seed username/password dari env `ADMIN_USER`/`ADMIN_PASS`, default `admin`/`admin123`, dicetak di console saat first run.
- Server bind 0.0.0.0 agar bisa diakses LAN.
