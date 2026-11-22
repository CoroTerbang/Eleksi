const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

const dbPath = process.env.ELEKSI_DB || path.join(__dirname, 'data', 'eleksi.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  photo TEXT,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS voters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  nis TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  has_voted INTEGER NOT NULL DEFAULT 0,
  voted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_id INTEGER NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (voter_id, candidate_id)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

const seedSetting = db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');
seedSetting.run('election_status', process.env.ELECTION_STATUS || 'open');
seedSetting.run('quiz_quota', process.env.QUIZ_QUOTA || '1');
seedSetting.run('kiosk_enabled', process.env.KIOSK_ENABLED || '1');

if (!db.prepare('SELECT 1 FROM admins').get()) {
  const username = process.env.ADMIN_USER || 'admin';
  const password = process.env.ADMIN_PASS || 'admin123';
  db.prepare('INSERT INTO admins (username,password_hash) VALUES (?,?)').run(
    username, bcrypt.hashSync(password, 10)
  );
  console.log(`[eleksi] admin seeded: ${username} / ${password} (ganti segera)`);
}

const stmts = {
  candidates: db.prepare('SELECT * FROM candidates ORDER BY number, order_index, id'),
  candidate: db.prepare('SELECT * FROM candidates WHERE id=?'),
  voters: db.prepare('SELECT * FROM voters ORDER BY name'),
  voter: db.prepare('SELECT * FROM voters WHERE id=?'),
  voterByNis: db.prepare('SELECT * FROM voters WHERE nis=?'),
  voterByCode: db.prepare('SELECT * FROM voters WHERE code=?'),
  candidatesCount: db.prepare('SELECT COUNT(*) AS n FROM candidates'),
  totalVoters: db.prepare('SELECT COUNT(*) AS n FROM voters'),
  voted: db.prepare('SELECT COUNT(*) AS n FROM voters WHERE has_voted=1'),
  results: db.prepare(`
    SELECT c.id, c.number, c.name, c.photo, COUNT(v.id) AS votes
    FROM candidates c LEFT JOIN votes v ON v.candidate_id=c.id
    GROUP BY c.id ORDER BY c.number, c.id
  `),
  audit: db.prepare(`
    SELECT v.name, v.nis, v.code, c.number AS candidate_number, c.name AS candidate_name, v.voted_at
    FROM votes vt
    JOIN voters v ON v.id=vt.voter_id
    JOIN candidates c ON c.id=vt.candidate_id
    ORDER BY v.voted_at DESC, v.name
  `),
  setting: db.prepare('SELECT value FROM settings WHERE key=?'),
  setSetting: db.prepare('UPDATE settings SET value=? WHERE key=?'),
  insertVoter: db.prepare('INSERT OR IGNORE INTO voters (name,nis) VALUES (?,?)'),
  insertVote: db.prepare('INSERT INTO votes (voter_id,candidate_id) VALUES (?,?)'),
  markVoted: db.prepare("UPDATE voters SET has_voted=1, voted_at=datetime('now') WHERE id=?"),
  voteByVoter: db.prepare('SELECT * FROM votes WHERE voter_id=?'),
};

function getSetting(key) { const r = stmts.setting.get(key); return r ? r.value : null; }
function setSetting(key, value) { stmts.setSetting.run(String(value), key); }
function isOpen() { return getSetting('election_status') === 'open'; }
function quota() { const n = Number(getSetting('quiz_quota')); return Number.isInteger(n) && n > 0 ? n : 1; }

function addCandidate({ number, name, photo, description }) {
  const r = db.prepare('INSERT INTO candidates (number,name,photo,description) VALUES (?,?,?,?)')
    .run(Number(number), name, photo || null, description || null);
  return Number(r.lastInsertRowid);
}
function updateCandidate(id, { number, name, photo, description }) {
  if (photo) {
    db.prepare('UPDATE candidates SET number=?,name=?,photo=?,description=? WHERE id=?')
      .run(Number(number), name, photo, description || null, id);
  } else {
    db.prepare('UPDATE candidates SET number=?,name=?,description=? WHERE id=?')
      .run(Number(number), name, description || null, id);
  }
}
function deleteCandidate(id) { db.prepare('DELETE FROM candidates WHERE id=?').run(id); }

function addVoter(name, nis) { return stmts.insertVoter.run(name, nis).changes > 0; }
function addVotersBulk(text) {
  let added = 0, skipped = 0;
  for (const line of String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
    const parts = line.split(/[,;\t]/).map(s => (s || '').trim());
    if (parts.length < 2 || !parts[0] || !parts[1]) { skipped++; continue; }
    if (addVoter(parts[1], parts[0])) added++; else skipped++;
  }
  return { added, skipped };
}
function deleteVoter(id) { db.prepare('DELETE FROM voters WHERE id=?').run(id); }

function generateCodes() {
  const rows = db.prepare('SELECT id FROM voters WHERE code IS NULL').all();
  const stmt = db.prepare('UPDATE voters SET code=? WHERE id=?');
  for (const row of rows) {
    let code;
    do { code = String(crypto.randomInt(0, 1000000)).padStart(6, '0'); }
    while (db.prepare('SELECT 1 FROM voters WHERE code=?').get(code));
    stmt.run(code, row.id);
  }
  return rows.length;
}

function castVote(voterId, candidateIds) {
  const ids = [...new Set((Array.isArray(candidateIds) ? candidateIds : [candidateIds]).map(Number))];
  const need = quota();
  if (ids.some(id => !Number.isInteger(id))) throw new Error('Pilihan tidak valid');
  if (ids.length !== need) throw new Error(`Pilih tepat ${need} calon`);
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!isOpen()) throw new Error('Pemungutan sedang ditutup');
    const voter = db.prepare('SELECT has_voted FROM voters WHERE id=?').get(voterId);
    if (!voter) throw new Error('Pemilih tidak ditemukan');
    if (voter.has_voted) throw new Error('Pemilih sudah menggunakan hak pilih');
    for (const id of ids) {
      if (!db.prepare('SELECT 1 FROM candidates WHERE id=?').get(id)) throw new Error('Calon tidak ditemukan');
    }
    for (const id of ids) stmts.insertVote.run(voterId, id);
    stmts.markVoted.run(voterId);
    db.exec('COMMIT');
  } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
}

function resetVotes() {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM votes').run();
    db.prepare('UPDATE voters SET has_voted=0, voted_at=NULL').run();
    db.prepare('UPDATE voters SET code=NULL').run();
    setSetting('election_status', 'closed');
    db.exec('COMMIT');
  } catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
}

function stats() { return { totalVoters: stmts.totalVoters.get().n, voted: stmts.voted.get().n }; }
function results() { return stmts.results.all(); }

module.exports = {
  db,
  isOpen, getSetting, setSetting, quota,
  candidates: () => stmts.candidates.all(),
  candidate: (id) => stmts.candidate.get(id),
  voter: (id) => stmts.voter.get(id),
  voterByNis: (nis) => stmts.voterByNis.get(nis),
  voterByCode: (code) => stmts.voterByCode.get(code),
  votesFor: (voterId) => stmts.voteByVoter.get(voterId),
  candidatesCount: () => stmts.candidatesCount.get().n,
  voters: () => stmts.voters.all(),
  addCandidate, updateCandidate, deleteCandidate,
  addVoter, addVotersBulk, deleteVoter, generateCodes,
  castVote, resetVotes, stats, results, audit: () => stmts.audit.all(),
};
