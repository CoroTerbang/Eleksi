const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const db = require('./db');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const publicDir = path.join(__dirname, 'public');
const uploadDir = path.join(publicDir, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (!allowed.includes(ext)) return cb(new Error('Format gambar tidak didukung'));
    cb(null, `candidate-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)) });

app.use(session({
  secret: process.env.SESSION_SECRET || 'eleksi-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4, sameSite: 'lax' },
}));

function setFlash(req, type, text) { req.session.flash = { type, text }; }
function takeFlash(req) { const f = req.session.flash; delete req.session.flash; return f; }

function requireAdmin(req, res, next) {
  if (req.session.adminId) return next();
  res.redirect('/admin/login');
}

function safeUnlink(rel) {
  try {
    const full = path.join(publicDir, String(rel || '').replace(/^\/+/, ''));
    if (full.startsWith(publicDir)) fs.unlinkSync(full);
  } catch {}
}

app.get('/', (req, res) => res.redirect('/vote'));

// ---------- Admin auth ----------
app.get('/admin/login', (req, res) => {
  res.render('admin/login', { title: 'Login Admin', error: null });
});
app.post('/admin/login', (req, res) => {
  const admin = db.db.prepare('SELECT * FROM admins WHERE username=?').get(String(req.body.username || '').trim());
  if (!admin || !bcrypt.compareSync(String(req.body.password || ''), admin.password_hash)) {
    return res.render('admin/login', { title: 'Login Admin', error: 'Username atau password salah.' });
  }
  req.session.adminId = admin.id;
  req.session.adminName = admin.username;
  res.redirect('/admin');
});
app.get('/admin/logout', (req, res) => {
  delete req.session.adminId; delete req.session.adminName;
  res.redirect('/admin/login');
});

// placeholder routes to be filled in later tasks
app.get('/admin', requireAdmin, (req, res) => {
  res.render('admin/dashboard', {
    title: 'Panel Admin',
    admin: req.session.adminName,
    flash: takeFlash(req),
    status: db.getSetting('election_status'),
    quota: db.quota(),
    kiosk: db.getSetting('kiosk_enabled'),
    stats: db.stats(),
    candidates: db.candidates(),
    voters: db.voters(),
    results: db.results(),
  });
});

// ---------- Admin: calon ----------
app.post('/admin/candidates', requireAdmin, upload.single('photo'), (req, res) => {
  try {
    const { number, name, description } = req.body;
    if (!name || !String(name).trim()) throw new Error('Nama calon wajib diisi.');
    const photo = req.file ? `/uploads/${req.file.filename}` : null;
    db.addCandidate({ number: number || (db.candidates().length + 1), name: String(name).trim(), photo, description });
    setFlash(req, 'ok', 'Calon ditambahkan.');
  } catch (e) { setFlash(req, 'err', e.message); }
  res.redirect('/admin');
});
app.post('/admin/candidates/:id/edit', requireAdmin, upload.single('photo'), (req, res) => {
  try {
    const id = Number(req.params.id);
    const { number, name, description } = req.body;
    if (!name || !String(name).trim()) throw new Error('Nama calon wajib diisi.');
    const photo = req.file ? `/uploads/${req.file.filename}` : null;
    if (photo) { const old = db.candidate(id); if (old && old.photo) safeUnlink(old.photo); }
    db.updateCandidate(id, { number: number || 0, name: String(name).trim(), photo, description });
    setFlash(req, 'ok', 'Calon diperbarui.');
  } catch (e) { setFlash(req, 'err', e.message); }
  res.redirect('/admin');
});
app.post('/admin/candidates/:id/delete', requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const old = db.candidate(id);
    if (old && old.photo) safeUnlink(old.photo);
    db.deleteCandidate(id);
    setFlash(req, 'ok', 'Calon dihapus.');
  } catch (e) { setFlash(req, 'err', e.message); }
  res.redirect('/admin');
});

// ---------- Admin: DPT & kode ----------
app.post('/admin/voters', requireAdmin, (req, res) => {
  try {
    const { name, nis } = req.body;
    if (!name || !String(name).trim() || !nis || !String(nis).trim()) throw new Error('Nama dan NIS wajib diisi.');
    if (!db.addVoter(String(name).trim(), String(nis).trim())) throw new Error('NIS sudah terdaftar.');
    setFlash(req, 'ok', 'Pemilih ditambahkan.');
  } catch (e) { setFlash(req, 'err', e.message); }
  res.redirect('/admin');
});
app.post('/admin/voters/bulk', requireAdmin, (req, res) => {
  try {
    const r = db.addVotersBulk(req.body.bulk);
    setFlash(req, 'ok', `Ditambahkan ${r.added} pemilih, dilewati ${r.skipped}.`);
  } catch (e) { setFlash(req, 'err', e.message); }
  res.redirect('/admin');
});
app.post('/admin/voters/:id/delete', requireAdmin, (req, res) => {
  try {
    db.deleteVoter(Number(req.params.id));
    setFlash(req, 'ok', 'Pemilih dihapus.');
  } catch (e) { setFlash(req, 'err', e.message); }
  res.redirect('/admin');
});
app.post('/admin/codes/generate', requireAdmin, (req, res) => {
  try {
    const n = db.generateCodes();
    setFlash(req, 'ok', `Generate kode untuk ${n} pemilih.`);
  } catch (e) { setFlash(req, 'err', e.message); }
  res.redirect('/admin');
});
app.get('/admin/codes/print', requireAdmin, (req, res) => {
  res.render('admin/codes-print', { title: 'Cetak Kode', voters: db.voters() });
});

// ---------- Admin: pengaturan & reset ----------
app.post('/admin/status', requireAdmin, (req, res) => {
  db.setSetting('election_status', req.body.status === 'open' ? 'open' : 'closed');
  setFlash(req, 'ok', req.body.status === 'open' ? 'Pemungutan dibuka.' : 'Pemungutan ditutup.');
  res.redirect('/admin');
});
app.post('/admin/quota', requireAdmin, (req, res) => {
  const n = Number(req.body.quota);
  if (!Number.isInteger(n) || n < 1) { setFlash(req, 'err', 'Kuota tidak valid.'); return res.redirect('/admin'); }
  db.setSetting('quiz_quota', String(n));
  setFlash(req, 'ok', 'Kuota disimpan.');
  res.redirect('/admin');
});
app.post('/admin/kiosk', requireAdmin, (req, res) => {
  db.setSetting('kiosk_enabled', req.body.enabled === '1' ? '1' : '0');
  setFlash(req, 'ok', 'Pengaturan kunci layar disimpan.');
  res.redirect('/admin');
});
app.post('/admin/reset', requireAdmin, (req, res) => {
  if (req.body.confirm !== 'YA') { setFlash(req, 'err', 'Konfirmasi tidak valid.'); return res.redirect('/admin'); }
  try {
    db.resetVotes();
    db.generateCodes();
    setFlash(req, 'ok', 'Semua suara direset dan kode digenerate ulang.');
  } catch (e) { setFlash(req, 'err', e.message); }
  res.redirect('/admin');
});

// ---------- Panel pemilih ----------
app.get('/vote', (req, res) => {
  res.render('vote/login', { title: 'Panel Pemilih', error: null, info: null });
});
app.post('/vote/verify', (req, res) => {
  const code = String(req.body.code || '').trim();
  const voter = db.voterByCode(code);
  if (!db.isOpen()) return res.render('vote/login', { title: 'Panel Pemilih', error: 'Pemungutan suara sedang ditutup.', info: null });
  if (!voter) return res.render('vote/login', { title: 'Panel Pemilih', error: `Kode "${code}" tidak valid.`, info: null });
  if (voter.has_voted) return res.render('vote/login', { title: 'Panel Pemilih', error: `${voter.name} sudah menggunakan hak pilih.`, info: null });
  req.session.voterId = voter.id;
  res.redirect('/vote/ballot');
});
app.get('/vote/ballot', (req, res) => {
  if (!db.isOpen()) { delete req.session.voterId; return res.render('vote/closed', { title: 'Pemungutan Ditutup' }); }
  if (!req.session.voterId) return res.redirect('/vote');
  const voter = db.voter(req.session.voterId);
  if (!voter || voter.has_voted) { delete req.session.voterId; return res.redirect('/vote'); }
  res.render('vote/ballot', { title: 'Pilih Calon', candidates: db.candidates(), voter, quota: db.quota(), kioskEnabled: db.getSetting('kiosk_enabled'), error: null });
});
app.post('/vote/cast', (req, res) => {
  if (!req.session.voterId) return res.redirect('/vote');
  const voter = db.voter(req.session.voterId);
  if (!voter || voter.has_voted) { delete req.session.voterId; return res.redirect('/vote'); }
  const raw = req.body.candidateId;
  const ids = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  let chosen = [];
  try {
    db.castVote(req.session.voterId, ids);
    chosen = ids.map(id => db.candidate(Number(id))).name);
  } catch (e) {
    return res.render('vote/ballot', { title: 'Pilih Calon', candidates: db.candidates(), voter, quota: db.quota(), kioskEnabled: db.getSetting('kiosk_enabled'), error: e.message });
  }
  delete req.session.voterId;
  res.render('vote/success', { title: 'Terima Kasih', voter, chosen });
});
app.get('/vote/cancel', (req, res) => { delete req.session.voterId; res.redirect('/vote'); });

app.post('/vote/unlock', (req, res) => {
  const password = String(req.body.password || '');
  const admins = db.db.prepare('SELECT password_hash FROM admins').all();
  const ok = admins.some(a => bcrypt.compareSync(password, a.password_hash));
  res.json({ ok });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/admin')) {
    setFlash(req, 'err', err.message || 'Terjadi kesalahan.');
    return res.redirect('/admin');
  }
  res.status(500).send('Terjadi kesalahan server.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[eleksi] http://localhost:${port}`);
  console.log(`[eleksi] panel pemilih: http://localhost:${port}/vote`);
  console.log(`[eleksi] panel admin:   http://localhost:${port}/admin`);
});
