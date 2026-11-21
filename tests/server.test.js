const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

test('upload non-image ditolak dengan pesan jelas', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eleksi-srv-'));
  const port = 43210;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), ELEKSI_DB: path.join(dir, 'db.sqlite'), ADMIN_PASS: 'admin123', SESSION_SECRET: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    for (let i = 0; i < 50; i++) {
      try { const r = await fetch(`http://localhost:${port}/vote`); if (r.ok) break; } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
    const login = await fetch(`http://localhost:${port}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=admin&password=admin123',
      redirect: 'manual',
    });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const fd = new FormData();
    fd.append('number', '1');
    fd.append('name', 'Calon X');
    fd.append('description', 'x');
    fd.append('photo', new Blob(['not an image'], { type: 'text/plain' }), 'x.txt');
    await fetch(`http://localhost:${port}/admin/candidates`, { method: 'POST', headers: { Cookie: cookie }, body: fd, redirect: 'manual' });
    const dash = await fetch(`http://localhost:${port}/admin`, { headers: { Cookie: cookie } });
    const body = await dash.text();
    assert.match(body, /Format gambar tidak didukung/);
  } finally {
    child.kill('SIGKILL');
  }
});
