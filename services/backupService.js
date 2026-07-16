/**
 * services/backupService.js
 * -----------------------------------------------------------------------------
 * Nightly SQLite backup + retention management.
 *
 * A backup is a plain file copy of the live SQLite database (after a WAL
 * checkpoint so all data is flushed). Backups are stored in backups/ with the
 * name YYYY-MM-DD-labregister.db. We keep only the most recent N backups and
 * delete the rest.
 * -----------------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');
const env = require('../config/env');
const { writeLog } = require('./logService');

const BACKUP_DIR = path.resolve(__dirname, '..', 'backups');

function ensureDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Create a point-in-time backup of the SQLite database.
 * @returns {{file:string, size:number}}
 */
function createBackup(label = 'labregister') {
  ensureDir();
  // Flush WAL into the main db file so the copy is complete & consistent.
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch (e) {
    writeLog('warn', 'wal_checkpoint before backup failed', { error: e.message });
  }
  const src = path.resolve(env.SQLITE_DB_PATH);
  const file = path.join(BACKUP_DIR, `${dateStamp()}-${label}.db`);
  fs.copyFileSync(src, file);
  writeLog('event', 'Backup created', { file });
  enforceRetention();
  return { file: path.basename(file), size: fs.statSync(file).size };
}

/** List backups sorted newest-first. */
function listBackups() {
  ensureDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { name: f, size: stat.size, createdAt: stat.birthtime };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Keep only the newest `BACKUP_KEEP` backups. */
function enforceRetention() {
  const keep = env.BACKUP_KEEP || 30;
  const all = listBackups();
  if (all.length <= keep) return;
  const toDelete = all.slice(keep);
  for (const b of toDelete) {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, b.name));
      writeLog('info', 'Old backup deleted', { name: b.name });
    } catch (e) {
      writeLog('error', 'Failed to delete old backup', { name: b.name, error: e.message });
    }
  }
}

/**
 * Resolve a backup filename to an absolute path confined to BACKUP_DIR.
 * Throws (status 400) on any path-traversal attempt (separators, "..", etc).
 * Centralises the guard used by both restore and download (RULES §9).
 */
function resolveBackupFile(filename) {
  if (typeof filename !== 'string' || !filename) {
    const e = new Error('Invalid backup filename.'); e.status = 400; throw e;
  }
  // A bare filename must equal its own basename (no dir separators / dot-segments).
  if (path.basename(filename) !== filename) {
    const e = new Error('Invalid backup filename.'); e.status = 400; throw e;
  }
  const abs = path.resolve(BACKUP_DIR, filename);
  if (!abs.startsWith(BACKUP_DIR + path.sep)) {
    const e = new Error('Invalid backup filename.'); e.status = 400; throw e;
  }
  return abs;
}

/**
 * Restore a backup by copying it over the live database.
 * A safety backup of the current DB is taken first. Note: SQLite keeps the
 * old handle, so restart the server afterwards for the restore to fully apply.
 */
function restoreBackup(filename) {
  ensureDir();
  const src = resolveBackupFile(filename);
  if (!fs.existsSync(src)) {
    const e = new Error('Backup file not found: ' + filename); e.status = 404; throw e;
  }
  // Safety snapshot of current state.
  createBackup('pre-restore');
  const dest = path.resolve(env.SQLITE_DB_PATH);
  fs.copyFileSync(src, dest);
  writeLog('event', 'Backup restored', { from: filename });
  return { restored: filename };
}

function backupDir() {
  return BACKUP_DIR;
}

module.exports = { createBackup, listBackups, restoreBackup, backupDir, enforceRetention, resolveBackupFile };
