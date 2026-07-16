/**
 * test/models.test.js — Unit tests for the data-access models (TESTING.md §2).
 * Runs against an isolated SQLite file (data/test-unit-<pid>.db) so it never
 * touches the real application database. Uses the built-in node:test runner.
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert');

const TEST_DB = path.join(__dirname, '..', 'data', `test-unit-${process.pid}.db`);
for (const f of [TEST_DB, TEST_DB + '-wal', TEST_DB + '-shm']) {
  try { fs.unlinkSync(f); } catch (e) { /* not present */ }
}
process.env.SQLITE_DB_PATH = TEST_DB;

const { db } = require('../config/database');
const studentModel = require('../models/studentModel');
const sessionModel = require('../models/sessionModel');
const adminModel = require('../models/adminModel');
const settingModel = require('../models/settingModel');
const env = require('../config/env');

function clean() {
  db.exec('DELETE FROM sessions');
  db.exec('DELETE FROM students');
  db.exec('DELETE FROM admins');
  db.exec('DELETE FROM settings');
}
beforeEach(clean);

after(() => {
  for (const f of [TEST_DB, TEST_DB + '-wal', TEST_DB + '-shm']) {
    try { fs.unlinkSync(f); } catch (e) { /* ignore */ }
  }
});

function today() { return new Date().toISOString().slice(0, 10); }

// U1 — create returns a row with id > 0
test('U1 studentModel.create returns persisted row', () => {
  const s = studentModel.create({ registerNumber: '1SU20CS001', name: 'Alice', department: 'CSE', year: '2nd Year' });
  assert.ok(s.id > 0);
  assert.strictEqual(s.name, 'Alice');
});

// U2 — case-insensitive lookup
test('U2 findByRegisterNumber is case-insensitive', () => {
  studentModel.create({ registerNumber: '1SU20CS001', name: 'Alice', department: 'CSE', year: '2nd Year' });
  const found = studentModel.findByRegisterNumber('1su20cs001');
  assert.ok(found);
  assert.strictEqual(found.registerNumber, '1SU20CS001');
});

// U3 — bulkInsert counts duplicates (295 inserted, 5 ignored of 300)
test('U3 bulkInsert reports inserted/ignored', () => {
  const items = [];
  for (let i = 1; i <= 295; i++) {
    items.push({ registerNumber: `U${i}`, name: `N${i}`, department: 'CSE', year: '1st Year' });
  }
  for (let i = 1; i <= 5; i++) {
    items.push({ registerNumber: `U${i}`, name: `N${i}`, department: 'CSE', year: '1st Year' }); // dup
  }
  const r = studentModel.bulkInsert(items);
  assert.strictEqual(r.inserted, 295);
  assert.strictEqual(r.ignored, 5);
});

// U4 — complete sets COMPLETED + duration
test('U4 sessionModel.complete marks COMPLETED with duration', () => {
  studentModel.create({ registerNumber: 'S4', name: 'Bob', department: 'CSE', year: '1st Year' });
  const s = sessionModel.create({ uuid: uuidv4(), registerNumber: 'S4', loginTime: new Date().toISOString(), date: today(), systemNumber: 'X1' });
  const done = sessionModel.complete(s.uuid, { logoutTime: new Date().toISOString(), duration: 42 });
  assert.strictEqual(done.status, 'COMPLETED');
  assert.strictEqual(done.duration, 42);
});

// U5 — forceComplete on active session computes duration
test('U5 sessionModel.forceComplete logs out an active session', () => {
  studentModel.create({ registerNumber: 'S5', name: 'Cara', department: 'CSE', year: '1st Year' });
  const s = sessionModel.create({ uuid: uuidv4(), registerNumber: 'S5', loginTime: new Date().toISOString(), date: today(), systemNumber: 'X2' });
  const done = sessionModel.forceComplete(s.uuid);
  assert.strictEqual(done.status, 'COMPLETED');
  assert.ok(done.duration >= 0);
});

// U6 — attendance roll-up: 2 visits same day => visits=2, daysPresent=1
test('U6 sessionModel.attendance rolls up visits and daysPresent', () => {
  studentModel.create({ registerNumber: 'ATT1', name: 'Dan', department: 'CSE', year: '1st Year' });
  const d = today();
  for (let i = 0; i < 2; i++) {
    const s = sessionModel.create({ uuid: uuidv4(), registerNumber: 'ATT1', loginTime: new Date(Date.now() - (i + 1) * 3600000).toISOString(), date: d, systemNumber: 'X' + i });
    sessionModel.complete(s.uuid, { logoutTime: new Date().toISOString(), duration: 10 });
  }
  const rows = sessionModel.attendance({ dateFrom: d, dateTo: d });
  const row = rows.find((r) => r.registerNumber === 'ATT1');
  assert.ok(row, 'attendance row present');
  assert.strictEqual(row.visits, 2);
  assert.strictEqual(row.daysPresent, 1);
});

// U7 — verify rejects wrong password
test('U7 adminModel.verify returns null for wrong password', async () => {
  await adminModel.ensureBootstrapAdmin();
  const r = await adminModel.verify(env.ADMIN_USERNAME, 'definitely-not-the-password');
  assert.strictEqual(r, null);
});

// U8 — verify returns admin without passwordHash
test('U8 adminModel.verify strips passwordHash', async () => {
  await adminModel.ensureBootstrapAdmin();
  const r = await adminModel.verify(env.ADMIN_USERNAME, env.ADMIN_PASSWORD);
  assert.ok(r);
  assert.strictEqual(r.username, env.ADMIN_USERNAME);
  assert.strictEqual(r.passwordHash, undefined);
});

// U9 — settingModel.setMany persists
test('U9 settingModel.setMany persists value', () => {
  settingModel.setMany({ theme: 'dark' });
  assert.strictEqual(settingModel.get('theme'), 'dark');
});
