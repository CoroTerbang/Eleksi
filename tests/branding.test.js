const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(md|ejs|js|json|css|html)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test('branding tidak memakai nama IPM dan memakai organisasi sekolah', () => {
  const root = path.join(__dirname, '..');
  const files = ['README.md', 'package.json'].map(f => path.join(root, f))
    .concat(walk(path.join(root, 'views')))
    .concat(walk(path.join(root, 'public')))
    .concat(walk(path.join(root, 'docs')));
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(text, /IPM|Muhammadiyah/i, `IPM ditemukan di ${path.relative(root, f)}`);
  }
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /Organisasi Sekolah/i);
});
