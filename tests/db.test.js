const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eleksi-'));
process.env.ELEKSI_DB = path.join(tmp, 'test.sqlite');
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASS = 'admin123';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');

test('castVote sukses lalu tolak vote kedua', () => {
  const cid = db.addCandidate({ number: 1, name: 'Calon A', photo: null, description: 'desc' });
  assert.ok(db.addVoter('Budi', '123'));
  const voter = db.voterByNis('123');
  db.castVote(voter.id, cid);
  assert.throws(() => db.castVote(voter.id, cid), /sudah/);
  assert.equal(db.stats().voted, 1);
  const totalVotes = db.results().reduce((a, r) => a + r.votes, 0);
  assert.equal(totalVotes, 1);
});

test('castVote menolak calon tidak valid tanpa kehilangan hak', () => {
  assert.ok(db.addVoter('Ani', '456'));
  const voter = db.voterByNis('456');
  assert.throws(() => db.castVote(voter.id, 9999), /Calon/);
  assert.equal(db.voter(voter.id).has_voted, 0);
});
