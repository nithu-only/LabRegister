/**
 * models/sessionModel.js
 * -----------------------------------------------------------------------------
 * Data-access layer for the `sessions` table (SQLite).
 * A session is OPEN (status='ACTIVE') from login until logout.
 * -----------------------------------------------------------------------------
 */
const { db } = require('../config/database');

const sessionModel = {
  create({ uuid, registerNumber, loginTime, date, systemNumber = null }) {
    const createdAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO sessions (uuid, registerNumber, loginTime, date, systemNumber, status, syncStatus, createdAt)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', 0, ?)`
    ).run(uuid, registerNumber, loginTime, date, systemNumber, createdAt);
    return this.findByUuid(uuid);
  },

  findByUuid(uuid) {
    return db.prepare(`SELECT * FROM sessions WHERE uuid = ?`).get(uuid);
  },

  /** Find the open (ACTIVE) session for a student, if any. */
  findActive(registerNumber) {
    return db
      .prepare(`SELECT * FROM sessions WHERE registerNumber = ? AND status = 'ACTIVE'`)
      .get(registerNumber);
  },

  /** Complete an active session (logout). duration in seconds. */
  complete(uuid, { logoutTime, duration }) {
    db.prepare(
      `UPDATE sessions SET logoutTime = ?, duration = ?, status = 'COMPLETED' WHERE uuid = ?`
    ).run(logoutTime, duration, uuid);
    return this.findByUuid(uuid);
  },

  /** Force-logout a still-active session (admin action). */
  forceComplete(uuid) {
    const s = this.findByUuid(uuid);
    if (!s || s.status !== 'ACTIVE') return s;
    const logoutTime = new Date().toISOString();
    const duration = Math.max(0, Math.floor((new Date(logoutTime) - new Date(s.loginTime)) / 1000));
    return this.complete(uuid, { logoutTime, duration });
  },

  list({ filters = {}, limit = 50, offset = 0 } = {}) {
    const where = [];
    const params = [];
    const { dateFrom, dateTo, department, year, status, search, registerNumber } = filters;

    if (dateFrom && dateTo) {
      where.push(`s.date BETWEEN ? AND ?`);
      params.push(dateFrom, dateTo);
    } else if (dateFrom) {
      where.push(`s.date >= ?`);
      params.push(dateFrom);
    } else if (dateTo) {
      where.push(`s.date <= ?`);
      params.push(dateTo);
    }
    if (status) {
      where.push(`s.status = ?`);
      params.push(status);
    }
    if (department) {
      where.push(`st.department = ?`);
      params.push(department);
    }
    if (year) {
      where.push(`st.year = ?`);
      params.push(year);
    }
    if (registerNumber) {
      where.push(`s.registerNumber = ?`);
      params.push(registerNumber);
    }
    if (search) {
      where.push(`(s.registerNumber LIKE ? OR st.name LIKE ? OR st.department LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = db
      .prepare(
        `SELECT s.*, st.name, st.department, st.year
         FROM sessions s
         LEFT JOIN students st ON st.registerNumber = s.registerNumber
         ${whereSql}
         ORDER BY s.loginTime DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);
    const total = db
      .prepare(
        `SELECT COUNT(*) AS c FROM sessions s
         LEFT JOIN students st ON st.registerNumber = s.registerNumber ${whereSql}`
      )
      .get(...params).c;
    return { rows, total };
  },

  count() {
    return db.prepare(`SELECT COUNT(*) AS c FROM sessions`).get().c;
  },

  /** Sessions completed/started on a given date (for daily dashboard). */
  countByDate(date) {
    return db.prepare(`SELECT COUNT(*) AS c FROM sessions WHERE date = ?`).get(date).c;
  },

  /** Currently open sessions (students inside the lab right now). */
  activeList() {
    return db
      .prepare(
        `SELECT s.*, st.name, st.department, st.year
         FROM sessions s
         LEFT JOIN students st ON st.registerNumber = s.registerNumber
         WHERE s.status = 'ACTIVE'
         ORDER BY s.loginTime ASC`
      )
      .all();
  },

  activeCount() {
    return db.prepare(`SELECT COUNT(*) AS c FROM sessions WHERE status = 'ACTIVE'`).get().c;
  },

  /** Records not yet pushed to the cloud. */
  pendingSync() {
    return db.prepare(`SELECT * FROM sessions WHERE syncStatus = 0`).all();
  },

  pendingCount() {
    return db.prepare(`SELECT COUNT(*) AS c FROM sessions WHERE syncStatus = 0`).get().c;
  },

  markSynced(ids, lastSyncedAt) {
    const update = db.prepare(`UPDATE sessions SET syncStatus = 1, lastSyncedAt = ? WHERE id = ?`);
    const tx = db.transaction((list) => {
      for (const id of list) update.run(lastSyncedAt, id);
    });
    tx(ids);
  },

  lastSyncedAt() {
    const row = db
      .prepare(`SELECT MAX(lastSyncedAt) AS t FROM sessions WHERE syncStatus = 1`)
      .get();
    return row.t || null;
  },

  /** Aggregate helpers used by reports & charts. */
  dailyVisitors(days = 30) {
    return db
      .prepare(
        `SELECT date, COUNT(*) AS count FROM sessions
         WHERE date >= date('now', ?)
         GROUP BY date ORDER BY date ASC`
      )
      .all(`-${days - 1} days`);
  },

  departmentUsage() {
    return db
      .prepare(
        `SELECT st.department AS department, COUNT(*) AS count
         FROM sessions s JOIN students st ON st.registerNumber = s.registerNumber
         GROUP BY st.department ORDER BY count DESC`
      )
      .all();
  },

  yearUsage() {
    return db
      .prepare(
        `SELECT st.year AS year, COUNT(*) AS count
         FROM sessions s JOIN students st ON st.registerNumber = s.registerNumber
         GROUP BY st.year ORDER BY year ASC`
      )
      .all();
  },

  peakHours() {
    return db
      .prepare(
        `SELECT CAST(strftime('%H', loginTime) AS INTEGER) AS hour, COUNT(*) AS count
         FROM sessions GROUP BY hour ORDER BY hour ASC`
      )
      .all();
  },

  monthlySessions(months = 12) {
    return db
      .prepare(
        `SELECT strftime('%Y-%m', loginTime) AS month, COUNT(*) AS count
         FROM sessions
         WHERE loginTime >= date('now', ?)
         GROUP BY month ORDER BY month ASC`
      )
      .all(`-${months} months`);
  },

  /** Attendance roll-up for a date range. */
  attendance({ dateFrom, dateTo, department = '', year = '', registerNumber = '' }) {
    const where = [`s.date BETWEEN ? AND ?`];
    const params = [dateFrom, dateTo];
    if (department) { where.push(`st.department = ?`); params.push(department); }
    if (year) { where.push(`st.year = ?`); params.push(year); }
    if (registerNumber) { where.push(`s.registerNumber = ?`); params.push(registerNumber); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    return db
      .prepare(
        `SELECT s.registerNumber,
                st.name AS name,
                st.department AS department,
                st.year AS year,
                COUNT(*) AS visits,
                COALESCE(SUM(s.duration), 0) AS totalSeconds,
                COUNT(DISTINCT s.date) AS daysPresent
         FROM sessions s
         LEFT JOIN students st ON st.registerNumber = s.registerNumber
         ${whereSql}
         GROUP BY s.registerNumber
         ORDER BY daysPresent DESC, visits DESC`
      )
      .all(...params);
  },
};

module.exports = sessionModel;
