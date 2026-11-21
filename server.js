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
