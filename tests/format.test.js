const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatCandidateText } = require('../format');

test('formatCandidateText renders paragraphs, bold, italic, lists', () => {
  const out = formatCandidateText('Halo **dunia**\nbaris kedua\n\n- item satu\n- item *dua*');
  assert.match(out, /<p>Halo <strong>dunia<\/strong><br>baris kedua<\/p>/);
  assert.match(out, /<ul><li>item satu<\/li><li>item <em>dua<\/em><\/li><\/ul>/);
});

test('formatCandidateText escapes HTML', () => {
  const out = formatCandidateText('<script>alert(1)</script>');
  assert.doesNotMatch(out, /<script>/);
  assert.match(out, /&lt;script&gt;/);
});

test('formatCandidateText returns empty for empty input', () => {
  assert.equal(formatCandidateText(''), '');
  assert.equal(formatCandidateText(null), '');
});
