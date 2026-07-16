/**
 * models/adminModel.js
 * -----------------------------------------------------------------------------
 * Admin accounts persisted in SQLite and protected with bcrypt.
 * The bootstrap admin (username/password from .env) is created on first boot
 * if no admin exists. Passwords are NEVER stored in plaintext.
 * -----------------------------------------------------------------------------
 */
const { db } = require('../config/database');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { writeLog } = require('../services/logService');

const adminModel = {
  /** Ensure a bootstrap admin exists (called once at startup). */
  async ensureBootstrapAdmin() {
    const existing = db.prepare(`SELECT COUNT(*) AS c FROM admins`).get().c;
    if (existing > 0) return;
    const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    db.prepare(`INSERT INTO admins (username, passwordHash, createdAt) VALUES (?, ?, ?)`).run(
      env.ADMIN_USERNAME,
      hash,
      new Date().toISOString()
    );
    writeLog('info', `Bootstrap admin '${env.ADMIN_USERNAME}' created.`);
  },

  findByUsername(username) {
    return db.prepare(`SELECT * FROM admins WHERE username = ?`).get(username);
  },

  /** Verify credentials. Returns the admin row (without hash) or null. */
  async verify(username, password) {
    const admin = this.findByUsername(username);
    if (!admin) return null;
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return null;
    const { passwordHash, ...safe } = admin;
    return safe;
  },

  async updatePassword(username, newPlain) {
    const hash = await bcrypt.hash(newPlain, 12);
    db.prepare(`UPDATE admins SET passwordHash = ? WHERE username = ?`).run(hash, username);
    return true;
  },
};

module.exports = adminModel;
