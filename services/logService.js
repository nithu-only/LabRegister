/**
 * services/logService.js
 * -----------------------------------------------------------------------------
 * Lightweight file-based logger (no external dependency).
 *
 * Logs are written to logs/ with one file per day:
 *   logs/2026-07-11.log
 * Each line is a JSON object: { ts, level, message, meta }.
 *
 * Levels: info | warn | error | event (login/logout/sync/backup markers)
 * The same record is also echoed to the console in dev for visibility.
 * -----------------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '..', 'logs');

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Allow tests / atomic runs to avoid touching the clock twice.
function nowIso() {
  return new Date().toISOString();
}

function fileForDate(iso) {
  return iso.slice(0, 10); // YYYY-MM-DD
}

/**
 * Write a structured log entry.
 * @param {string} level  info|warn|error|event
 * @param {string} message
 * @param {object} [meta]
 */
function writeLog(level, message, meta = {}) {
  try {
    ensureDir();
    const ts = nowIso();
    const entry = { ts, level, message, meta };
    const line = JSON.stringify(entry) + '\n';
    const file = path.join(LOG_DIR, `${fileForDate(ts)}.log`);
    fs.appendFileSync(file, line);

    // Console echo (skipped for very noisy event logs in production).
    const tag = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'event' ? '📌' : 'ℹ️';
    if (process.env.NODE_ENV !== 'production' || level === 'error') {
      // eslint-disable-next-line no-console
      console.log(`${tag} [${level}] ${message}`, Object.keys(meta).length ? meta : '');
    }
    return entry;
  } catch (e) {
    // Never let logging crash the app.
    // eslint-disable-next-line no-console
    console.error('logService failed:', e.message);
  }
}

const logger = {
  info: (m, meta) => writeLog('info', m, meta),
  warn: (m, meta) => writeLog('warn', m, meta),
  error: (m, meta) => writeLog('error', m, meta),
  event: (m, meta) => writeLog('event', m, meta),
  writeLog,
};

module.exports = logger;
