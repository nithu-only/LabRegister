/**
 * config/env.js
 * -----------------------------------------------------------------------------
 * Centralised access to environment variables. All modules read configuration
 * from here instead of calling process.env directly, so defaults live in one
 * place and are easy to audit.
 * -----------------------------------------------------------------------------
 */
require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret-change-me',

  // When "true", the session cookie gets the Secure attribute (HTTPS-only).
  // Leave "false" for the offline/local kiosk (default). Set "true" only when
  // serving behind TLS (RULES §9 / PRD risk: session cookie theft in prod).
  SECURE_COOKIE: (process.env.SECURE_COOKIE || 'false').toLowerCase() === 'true',

  UNIVERSITY_NAME: process.env.UNIVERSITY_NAME || 'Srinivas University',
  LAB_NAME: process.env.LAB_NAME || 'Computer Laboratory Register',

  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',

  SQLITE_DB_PATH: process.env.SQLITE_DB_PATH || './data/labregister.db',
  MONGODB_URI: process.env.MONGODB_URI || '',

  SYNC_INTERVAL_SECONDS: parseInt(process.env.SYNC_INTERVAL_SECONDS, 10) || 30,

  BACKUP_TIME: process.env.BACKUP_TIME || '23:55',
  BACKUP_KEEP: parseInt(process.env.BACKUP_KEEP, 10) || 30,

  INTERNET_CHECK_URL:
    process.env.INTERNET_CHECK_URL || 'https://www.google.com/generated_404_probe',

  DEFAULT_THEME: process.env.DEFAULT_THEME || 'light',
};

module.exports = env;
