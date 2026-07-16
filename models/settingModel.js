/**
 * models/settingModel.js
 * -----------------------------------------------------------------------------
 * Key/value settings persisted in SQLite so the admin can change branding,
 * departments, years, sync interval and theme at runtime without editing .env.
 * -----------------------------------------------------------------------------
 */
const { db } = require('../config/database');

const DEFAULTS = {
  universityName: process.env.UNIVERSITY_NAME || 'Srinivas University',
  labName: process.env.LAB_NAME || 'Computer Laboratory Register',
  departments: JSON.stringify(['CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CIVIL', 'AIML', 'AI&DS']),
  years: JSON.stringify(['1st Year', '2nd Year', '3rd Year', '4th Year']),
  syncInterval: process.env.SYNC_INTERVAL_SECONDS || '30',
  theme: process.env.DEFAULT_THEME || 'light',
  backupLocation: './backups',
  allowSelfRegistration: process.env.ALLOW_SELF_REGISTRATION || 'true',
};

const settingModel = {
  defaults: DEFAULTS,

  get(key) {
    const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
    return row ? row.value : (DEFAULTS[key] ?? null);
  },

  getAll() {
    const rows = db.prepare(`SELECT key, value FROM settings`).all();
    const out = { ...DEFAULTS };
    for (const r of rows) out[r.key] = r.value;
    return out;
  },

  set(key, value) {
    db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(key, String(value));
    return this.get(key);
  },

  setMany(map) {
    const setOne = db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    );
    const tx = db.transaction((m) => {
      for (const [k, v] of Object.entries(m)) setOne.run(k, String(v));
    });
    tx(map);
  },
};

module.exports = settingModel;
