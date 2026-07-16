/**
 * config/database.js
 * -----------------------------------------------------------------------------
 * SQLite connection (PRIMARY / OFFLINE database) using Node's built-in
 * `node:sqlite` module (DatabaseSync). No native compile step required.
 *
 * node:sqlite is synchronous, which keeps the transaction logic simple and
 * fast — perfect for a single-kiosk application where every login/logout must
 * be persisted immediately and the student must never wait on the network.
 *
 * The schema is created here on first run. No external migration tooling is
 * required.
 *
 * NOTE: `node:sqlite` requires Node >= 22.5. `package.json` `engines` is pinned
 * accordingly. The transaction shim below exists because node:sqlite lacks a
 * db.transaction() helper (unlike the third-party better-sqlite3 package).
 * -----------------------------------------------------------------------------
 */
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const env = require('./env');
const { writeLog } = require('../services/logService');

// Ensure the data directory exists.
const dbPath = path.resolve(env.SQLITE_DB_PATH);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

// WAL mode = better concurrency and crash safety for a kiosk that runs 24/7.
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/**
 * node:sqlite has no db.transaction() helper (unlike better-sqlite3).
 * Provide a compatible shim using explicit BEGIN/COMMIT/ROLLBACK so the
 * models can keep calling db.transaction(fn)(...args).
 */
db.transaction = function (fn) {
  return function (...args) {
    db.exec('BEGIN');
    try {
      const result = fn.apply(null, args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (e) { /* ignore */ }
      throw err;
    }
  };
};

/**
 * Create the application schema if it does not already exist.
 * Idempotent: safe to call on every boot.
 */
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      registerNumber  TEXT UNIQUE NOT NULL COLLATE NOCASE,
      name            TEXT NOT NULL,
      department      TEXT NOT NULL,
      year            TEXT NOT NULL,
      createdAt       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid          TEXT UNIQUE NOT NULL,
      registerNumber TEXT NOT NULL,
      loginTime     TEXT NOT NULL,
      logoutTime    TEXT,
      duration      INTEGER,               -- seconds
      date          TEXT NOT NULL,         -- YYYY-MM-DD
      systemNumber  TEXT,                  -- lab terminal/PC id captured at login
      status        TEXT NOT NULL,         -- ACTIVE | COMPLETED
      syncStatus    INTEGER DEFAULT 0,     -- 0 = pending, 1 = synced
      lastSyncedAt  TEXT,
      createdAt     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admins (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      key   TEXT UNIQUE NOT NULL,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_register  ON sessions(registerNumber);
    CREATE INDEX IF NOT EXISTS idx_sessions_status    ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_date      ON sessions(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_sync      ON sessions(syncStatus);
    CREATE INDEX IF NOT EXISTS idx_students_dept      ON students(department);
  `);
  writeLog('info', 'SQLite schema initialised', { db: dbPath });
}

initSchema();

// Safe migration for DBs created before systemNumber existed.
try { db.exec('ALTER TABLE sessions ADD COLUMN systemNumber TEXT'); }
catch (e) { /* column already present — ignore */ }

module.exports = { db, initSchema };
