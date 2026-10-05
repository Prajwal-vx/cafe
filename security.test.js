const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { escapeHtml, safeCafeId, safeCafeImage, validFavorites } = require('./security.js');

test('HTML output encodes markup and attribute delimiters', () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert('x')">`), '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;');
});

test('only simple cafe keys are accepted for inline action arguments', () => {
  assert.equal(safeCafeId('birt-brikshya'), 'birt-brikshya');
  assert.equal(safeCafeId("');alert(1)//"), '');
});

test('cafe image URLs reject script and off-domain schemes', () => {
  assert.equal(safeCafeImage('javascript:alert(1)'), safeCafeImage('invalid'));
  assert.equal(safeCafeImage('https://attacker.example/image.png'), safeCafeImage('invalid'));
  assert.match(safeCafeImage('https://images.unsplash.com/photo.jpg'), /^https:\/\/images\.unsplash\.com\//);
});

test('saved favorites retain only known string ids and remove duplicates', () => {
  const validIds = new Set(['birt-brikshya', 'dharan-dbest']);
  assert.deepEqual(validFavorites(['birt-brikshya', 'unknown', 'birt-brikshya', {}, 4], validIds), ['birt-brikshya']);
  assert.deepEqual(validFavorites({ id: 'birt-brikshya' }, validIds), []);
});

test('pages use a strict CSP and contain no inline handlers or styles', () => {
  for (const file of ['index.html', 'privacy.html', 'app.js']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\son[a-z]+\s*=/i, `${file} has an inline event handler`);
    assert.doesNotMatch(source, /\sstyle\s*=/i, `${file} has an inline style attribute`);
  }
  const page = fs.readFileSync('index.html', 'utf8');
  assert.match(page, /script-src 'self'/);
  assert.doesNotMatch(page, /script-src[^;]*unsafe-inline/);
  const headers = fs.readFileSync('_headers', 'utf8');
  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(headers, /Strict-Transport-Security/);
  assert.doesNotMatch(page, /unpkg\.com/);
});

test('cafe catalogue has unique safe ids and HTTPS image sources', () => {
  const source = fs.readFileSync('data.js', 'utf8');
  const { cafes } = vm.runInNewContext(`${source}; ({ cafes: KOSHI_CAFES })`);
  const ids = cafes.map((cafe) => cafe.id);
  assert.equal(cafes.length, 51);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => safeCafeId(id) === id));
  assert.ok(cafes.every((cafe) => safeCafeImage(cafe.image) === new URL(cafe.image).href));
  assert.equal(new Set(cafes.map((cafe) => cafe.district)).size, 14);
});
