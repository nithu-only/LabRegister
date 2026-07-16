/**
 * test/integration.test.js — Integration / API / edge / validation tests
 * (TESTING.md §3–§6). Boots the real server on an isolated port + SQLite file
 * and exercises endpoints over HTTP. Uses the built-in node:test runner.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { test, before, after } = require('node:test');
const assert = require('node:assert');

const PORT = process.env.PORT_TEST || 3499;
const BASE = `http://localhost:${PORT}`;
const DB = path.join(__dirname, '..', 'data', 'test-integration.db');
const env = require('../config/env');

let server;
let cookie = '';

function waitForServer(timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const r = await fetch(BASE + '/');
        if (r.ok) return resolve();
      } catch (e) { /* not up yet */ }
      if (Date.now() - start > timeoutMs) return reject(new Error('server did not start'));
      setTimeout(tick, 300);
    };
    tick();
  });
}

async function api(method, p, { body, ck } = {}) {
  const headers = {};
  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  if (ck) headers['Cookie'] = ck;
  const res = await fetch(BASE + p, { method, headers, body: payload });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (e) { /* non-JSON body */ }
  return { status: res.status, data, raw: text, headers: res.headers, contentType: res.headers.get('content-type') };
}

async function login() {
  const r = await api('POST', '/api/auth/login', { body: { username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD } });
  assert.strictEqual(r.status, 200, 'login should succeed');
  const sc = r.headers.get('set-cookie');
  cookie = sc ? sc.split(';')[0] : '';
  return cookie;
}

before(async () => {
  for (const f of [DB, DB + '-wal', DB + '-shm']) {
    try { fs.unlinkSync(f); } catch (e) { /* not present */ }
  }
  server = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), SQLITE_DB_PATH: DB, MONGODB_URI: '' },
    stdio: 'ignore',
  });
  await waitForServer();
  await login();
});

after(async () => {
  if (server) server.kill('SIGKILL');
  for (const f of [DB, DB + '-wal', DB + '-shm']) {
    try { fs.unlinkSync(f); } catch (e) { /* ignore */ }
  }
});

// A1 — auth: bad creds 401, good creds set cookie, /me works
test('A1 auth login 401 on bad creds; /me 200 with cookie', async () => {
  const bad = await api('POST', '/api/auth/login', { body: { username: env.ADMIN_USERNAME, password: 'wrong' } });
  assert.strictEqual(bad.status, 401);
  const me = await api('GET', '/api/auth/me', { ck: cookie });
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.data.admin.username, env.ADMIN_USERNAME);
});

// I3 / I4 — protected student list requires auth
test('I3/I4 students list 401 without auth, 200 with auth', async () => {
  const noAuth = await api('GET', '/api/students/');
  assert.strictEqual(noAuth.status, 401);
  const ok = await api('GET', '/api/students/', { ck: cookie });
  assert.strictEqual(ok.status, 200);
  assert.ok(Array.isArray(ok.data.rows));
  assert.ok(typeof ok.data.total === 'number');
});

// I1 — kiosk register creates a student + active session
test('I1 kiosk register creates student + active session', async () => {
  const rn = 'KIOSK' + Date.now();
  const r = await api('POST', '/api/students/register', {
    body: { registerNumber: rn, name: 'Kiosk User', department: 'CSE', year: '1st Year', systemNumber: 'SYS-K' },
  });
  assert.ok(r.status === 200 || r.status === 201);
  assert.strictEqual(r.data.action, 'login');
  const active = await api('GET', '/api/sessions/active', { ck: cookie });
  assert.ok(active.data.rows.some((s) => s.registerNumber === rn), 'session present in Active Now');
});

// I2 — transaction login then logout; duration non-negative
test('I2 transaction logs in then out with duration >= 0', async () => {
  const rn = 'ADM' + Date.now();
  await api('POST', '/api/students', { body: { registerNumber: rn, name: 'Admin User', department: 'CSE', year: '1st Year' }, ck: cookie });
  const t1 = await api('POST', '/api/sessions/transaction', { body: { registerNumber: rn, systemNumber: 'SYS-A' } });
  assert.strictEqual(t1.data.action, 'login');
  const t2 = await api('POST', '/api/sessions/transaction', { body: { registerNumber: rn, systemNumber: 'SYS-A' } });
  assert.strictEqual(t2.data.action, 'logout');
  assert.ok(t2.data.durationSeconds >= 0, 'duration non-negative');
});

// I5 — manual backup now appears in the list
test('I5 backup-now creates a file listed afterwards', async () => {
  const now = await api('POST', '/api/backups/now', { ck: cookie });
  assert.strictEqual(now.status, 200);
  assert.ok(now.data.file);
  const list = await api('GET', '/api/backups/', { ck: cookie });
  assert.ok(list.data.backups.some((b) => b.name === now.data.file), 'backup present in list');
});

// A2 — import without file => 400
test('A2 students/import 400 when no file', async () => {
  const r = await api('POST', '/api/students/import', { ck: cookie });
  assert.strictEqual(r.status, 400);
});

// A3 — session export as CSV
test('A3 sessions export returns CSV', async () => {
  const r = await api('GET', '/api/sessions/export?format=csv', { ck: cookie });
  assert.strictEqual(r.status, 200);
  assert.match(r.contentType, /text\/csv/);
});

// A4 — attendance roll-up
test('A4 reports/attendance returns data array', async () => {
  const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const r = await api('GET', `/api/reports/attendance?dateFrom=${from}&dateTo=${to}`, { ck: cookie });
  assert.strictEqual(r.status, 200);
  assert.ok(Array.isArray(r.data.data), 'attendance data is an array');
});

// A5 — dashboard stats numeric
test('A5 dashboard/stats returns numeric stats', async () => {
  const r = await api('GET', '/api/dashboard/stats', { ck: cookie });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(typeof r.data.stats.totalStudents, 'number');
  assert.strictEqual(typeof r.data.stats.totalSessions, 'number');
});

// A6 — sync status shape
test('A6 sync/status returns online + pending', async () => {
  const r = await api('GET', '/api/sync/status');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(typeof r.data.online, 'boolean');
  assert.strictEqual(typeof r.data.pending, 'number');
});

// E6 — limit clamped to 500 (RULES §10)
test('E6 list limit clamped to <= 500', async () => {
  const r = await api('GET', '/api/students?limit=9999', { ck: cookie });
  assert.strictEqual(r.status, 200);
  assert.ok(r.data.limit <= 500, 'limit clamped');
});

// E8 — path traversal blocked on download
test('E8 backup download rejects path traversal', async () => {
  const r = await api('GET', '/api/backups/download/' + encodeURIComponent('../../etc/passwd'), { ck: cookie });
  assert.strictEqual(r.status, 400);
});

// E9 — empty public search returns []
test('E9 public-search with empty query returns []', async () => {
  const r = await api('GET', '/api/students/public-search?q=', { ck: cookie });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.data.rows, []);
});

// V3 — duplicate register number => 409
test('V3 duplicate student create returns 409', async () => {
  const rn = 'DUP' + Date.now();
  const first = await api('POST', '/api/students', { body: { registerNumber: rn, name: 'D', department: 'CSE', year: '1st Year' }, ck: cookie });
  assert.strictEqual(first.status, 201);
  const second = await api('POST', '/api/students', { body: { registerNumber: rn, name: 'D', department: 'CSE', year: '1st Year' }, ck: cookie });
  assert.strictEqual(second.status, 409);
});

// V4 — invalid theme rejected
test('V4 settings rejects invalid theme', async () => {
  const r = await api('PUT', '/api/settings', { body: { theme: 'neon' }, ck: cookie });
  assert.strictEqual(r.status, 400);
});
