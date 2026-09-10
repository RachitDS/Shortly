import assert from 'node:assert/strict';
const base = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const code = `test-${Date.now()}`;
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
let created = false;
try {
  let r = await fetch(`${base}/api/health`); assert.equal(r.status, 200);
  r = await fetch(`${base}/shorten`, json('POST', { url: 'javascript:alert(1)' })); assert.equal(r.status, 400);
  r = await fetch(`${base}/shorten`, { method: 'POST', body: '{bad' }); assert.equal(r.status, 400);
  r = await fetch(`${base}/shorten`, json('POST', { url: 'https://example.com/original', title: 'API smoke test', shortCode: code })); assert.equal(r.status, 201); created = true;
  const link = await r.json(); assert.equal(link.shortCode, code); assert.equal(link.accessCount, 0);
  r = await fetch(`${base}/shorten`, json('POST', { url: 'https://example.com', shortCode: code })); assert.equal(r.status, 409);
  r = await fetch(`${base}/shorten/${code}`); assert.equal(r.status, 200); assert.equal((await r.json()).url, 'https://example.com/original');
  r = await fetch(`${base}/shorten/${code}/stats`); assert.equal((await r.json()).accessCount, 1);
  r = await fetch(`${base}/shorten/${code}`, json('PUT', { url: 'https://example.com/updated', title: 'Updated test' })); assert.equal(r.status, 200); assert.equal((await r.json()).title, 'Updated test');
  r = await fetch(`${base}/shorten/${code}`, json('PUT', { url: 'not-a-url' })); assert.equal(r.status, 400);
  r = await fetch(`${base}/s/${code}`, { redirect: 'manual' }); assert.equal(r.status, 302); assert.equal(r.headers.get('location'), 'https://example.com/updated');
  await Promise.all(Array.from({ length: 5 }, () => fetch(`${base}/s/${code}`, { redirect: 'manual' })));
  r = await fetch(`${base}/shorten/${code}/stats`); assert.equal((await r.json()).accessCount, 7, 'Concurrent visits must increment atomically');
  r = await fetch(`${base}/shorten/${code}`, json('PUT', { archived: true })); assert.equal(r.status, 200);
  r = await fetch(`${base}/s/${code}`, { redirect: 'manual' }); assert.equal(r.status, 404);
  r = await fetch(`${base}/shorten/${code}/stats`); assert.equal((await r.json()).accessCount, 7);
  r = await fetch(`${base}/shorten/${code}`, json('PUT', { archived: false })); assert.equal(r.status, 200);
  r = await fetch(`${base}/shorten`); assert.equal(r.status, 200); assert.ok((await r.json()).links.some(l => l.shortCode === code));
  r = await fetch(`${base}/shorten/${code}`, { method: 'DELETE' }); assert.equal(r.status, 204); created = false;
  for (const suffix of ['', '/stats']) { r = await fetch(`${base}/shorten/${code}${suffix}`); assert.equal(r.status, 404); }
  r = await fetch(`${base}/shorten/${code}`, { method: 'DELETE' }); assert.equal(r.status, 404);
  r = await fetch(`${base}/shorten/${code}`, json('PUT', { url: 'https://example.com' })); assert.equal(r.status, 404);
  console.log('PASS: health, validation, creation, uniqueness, retrieval, update, redirects, atomic click counts, statistics, archive/reactivate, listing, deletion, and missing-link responses.');
} finally {
  if (created) await fetch(`${base}/shorten/${code}`, { method: 'DELETE' });
}
