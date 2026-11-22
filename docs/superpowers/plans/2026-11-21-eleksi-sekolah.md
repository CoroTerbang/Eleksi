# Eleksi Organisasi Sekolah Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sistem e-voting formatur Organisasi Sekolah di sekolah: panel admin + panel pemilih (device bilik) dengan kode 6 digit, kunci layar browser, dan hasil live.

**Architecture:** Satu proses Node.js (Express) + SQLite file. Server-rendered EJS. Admin auth via session. Pemilih mengetik kode 6 digit; kode hangus setelah submit. Kunci layar via Fullscreen API + deteksi visibility.

**Tech Stack:** Node.js >=22.5, Express 5, EJS, node:sqlite, bcryptjs, multer, express-session.

**Spec:** `docs/superpowers/specs/2026-11-21-eleksi-sekolah-design.md`

## Global Constraints

- Node >= 22.5.0 (node:sqlite).
- Tanpa native dependency.
- Upload foto max 2MB, format jpg/jpeg/png/webp/gif.
- Satu orang satu suara (kode sekali pakai + DB constraint).
- Kuota pilihan default 1, wajib tepat.
- Admin melihat hasil live; pemetaan pemilih–pilihan hanya setelah re-auth password.
- Server bind 0.0.0.0.

## Review Focus

- Input kosong/whitespace pada NIS, kode, nama calon → harus ditolak, bukan crash.
- Submit ganda (double click / dua device) → hanya satu suara tersimpan.
- candidateId tidak valid / tidak ada → ditolak, pemilih tidak kehilangan hak.
- Upload non-gambar atau >2MB → ditolak dengan pesan jelas.
- Pemungutan ditutup saat pemilih sedang di bilik → submit ditolak, hak suara tetap.

---

### Task 1: Scaffold proyek

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md` (placeholder)

**Interfaces:**
- Produces: scripts `start`, `dev`, `test`.

- [ ] **Step 1: Tulis package.json** dengan dependencies dan scripts.
- [ ] **Step 2: Buat .gitignore** (node_modules, data/, public/uploads/).
- [ ] **Step 3: Commit.**

---

### Task 2: Database & helper

**Files:**
- Create: `db.js`
- Create: `tests/db.test.js`

**Interfaces:**
- Produces: `isOpen()`, `candidates()`, `candidate(id)`, `addCandidate(...)`, `updateCandidate(...)`, `deleteCandidate(id)`, `voters()`, `voter(id)`, `voterByNis(nis)`, `addVoter(name,nis)`, `addVotersBulk(text)`, `deleteVoter(id)`, `castVote(voterId,candidateId)`, `resetVotes()`, `stats()`, `results()`, `getSetting(key)`, `setSetting(key,value)`, `generateCodes()`.

- [ ] **Step 1: Tulis test gagal** `tests/db.test.js`: seed voter + candidate, `castVote` sukses, panggil ulang → throw, votes count = 1.
- [ ] **Step 2: Run test** → FAIL.
- [ ] **Step 3: Implementasi db.js** (schema + seed admin + helpers + transaksi castVote).
- [ ] **Step 4: Run test** → PASS.
- [ ] **Step 5: Commit.**

---

### Task 3: Admin auth + login

**Files:**
- Create: `server.js` (bootstrap, session, multer, routes)
- Create: `views/partials/header.ejs`, `footer.ejs`
- Create: `views/admin/login.ejs`

**Interfaces:**
- Consumes: `db` helpers.
- Produces: middleware `requireAdmin`, routes `/admin/login`, `/admin/logout`.

- [ ] **Step 1: Implementasi server.js** bootstrap + session + multer + requireAdmin + login routes.
- [ ] **Step 2: Buat views login.**
- [ ] **Step 3: Smoke test manual** (node server.js, buka /admin/login).
- [ ] **Step 4: Commit.**

---

### Task 4: Panel admin dashboard

**Files:**
- Create: `views/admin/dashboard.ejs`
- Modify: `server.js` (route GET /admin, flash helper)

**Interfaces:**
- Produces: flash messages `ok`/`err`.

- [ ] **Step 1: Route GET /admin** render dashboard dengan data.
- [ ] **Step 2: View dashboard** (statistik, status, calon, DPT, hasil, form).
- [ ] **Step 3: Commit.**

---

### Task 5: CRUD calon + upload

**Files:**
- Modify: `server.js` (routes candidates add/edit/delete)
- Modify: `views/admin/dashboard.ejs`

- [ ] **Step 1: Routes POST candidates** (upload.single, validasi, safeUnlink).
- [ ] **Step 2: Test upload non-image & >2MB** → pesan error.
- [ ] **Step 3: Commit.**

---

### Task 6: DPT + kode cetak

**Files:**
- Modify: `server.js` (voters add/bulk/delete, code generation, print route)
- Modify: `views/admin/dashboard.ejs`

**Interfaces:**
- Produces: `generateCodes()` mengisi kolom `code` (6 digit) untuk voter yang belum punya; route `/admin/codes/print`.

- [ ] **Step 1: Tambah kolom code di voters** (migration IF NOT EXISTS).
- [ ] **Step 2: generateCodes()** + route cetak HTML.
- [ ] **Step 3: Bulk import parser.**
- [ ] **Step 4: Commit.**

---

### Task 7: Pengaturan & reset

**Files:**
- Modify: `server.js` (status toggle, reset, kuota setting)
- Modify: `views/admin/dashboard.ejs`

- [ ] **Step 1: Routes status/kuota/reset.**
- [ ] **Step 2: Reset transaksi** (votes delete + has_voted reset + code regen + status closed).
- [ ] **Step 3: Commit.**

---

### Task 8: Alur pemilih

**Files:**
- Create: `views/vote/login.ejs`, `ballot.ejs`, `success.ejs`, `closed.ejs`
- Modify: `server.js` (routes /vote/*)

- [ ] **Step 1: Routes verify, ballot, cast** dengan validasi kuota.
- [ ] **Step 2: Test castVote double** (sudah di Task 2).
- [ ] **Step 3: Commit.**

---

### Task 9: Kunci layar (kiosk)

**Files:**
- Create: `public/kiosk.js`
- Modify: `views/vote/ballot.ejs` (include script)

- [ ] **Step 1: Implementasi kiosk.js** (requestFullscreen, deteksi exit/visibility, overlay kunci, kode operator).
- [ ] **Step 2: Setting aktif/nonaktif dari admin.**
- [ ] **Step 3: Commit.**

---

### Task 10: Hasil live + re-auth pemetaan

**Files:**
- Modify: `views/admin/dashboard.ejs`
- Modify: `server.js` (route POST /admin/reveal dengan password)

- [ ] **Step 1: Hasil agregat live di dashboard.**
- [ ] **Step 2: Re-auth password** untuk tampilkan pemetaan pemilih–pilihan (read-only).
- [ ] **Step 3: Commit.**

---

### Task 11: Styling standar & aksesibilitas

**Files:**
- Create: `public/style.css`
- Modify: views (aria, focus states)

- [ ] **Step 1: CSS design tokens** (warna, spacing, typography) + responsive.
- [ ] **Step 2: Aksesibilitas** (focus visible, kontras, label, keyboard).
- [ ] **Step 3: Commit.**

---

### Task 12: README & finalisasi

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Instruksi install/run/backup.**
- [ ] **Step 2: Run full test** `npm test`.
- [ ] **Step 3: Commit.**
