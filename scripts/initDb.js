/**
 * scripts/initDb.js
 * -----------------------------------------------------------------------------
 * Ensure the SQLite schema exists and is ready.
 *
 * Note: config/database.js already runs initSchema() the moment it is required,
 * so simply requiring it guarantees the tables exist. This script is a friendly
 * CLI wrapper that verifies the expected tables and reports readiness. Safe to
 * run any number of times.
 *
 *   npm run init-db
 * -----------------------------------------------------------------------------
 */
const { db } = require('../config/database');
const { writeLog } = require('../services/logService');

(async () => {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
    .all()
    .map((t) => t.name);

  const required = ['students', 'sessions', 'admins', 'settings'];
  const missing = required.filter((t) => !tables.includes(t));

  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error('❌ Missing tables:', missing.join(', '));
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('✅ Database initialised. Tables:', tables.join(', '));
  writeLog('event', 'initDb ran', { tables });
  process.exit(0);
})();
