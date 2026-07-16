/**
 * models/studentModel.js
 * -----------------------------------------------------------------------------
 * Data-access layer for the `students` table (SQLite).
 * Pure CRUD + lookups. Business logic lives in the controllers.
 * -----------------------------------------------------------------------------
 */
const { db } = require('../config/database');

const studentModel = {
  /** Insert a student. Returns the created row. */
  create({ registerNumber, name, department, year }) {
    const createdAt = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO students (registerNumber, name, department, year, createdAt)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(registerNumber, name, department, year, createdAt);
    return this.findById(info.lastInsertRowid);
  },

  findById(id) {
    return db.prepare(`SELECT * FROM students WHERE id = ?`).get(id);
  },

  /** Case-insensitive lookup by register number. */
  findByRegisterNumber(registerNumber) {
    return db
      .prepare(`SELECT * FROM students WHERE registerNumber = ? COLLATE NOCASE`)
      .get(registerNumber);
  },

  list({ search = '', department = '', year = '', limit = 50, offset = 0 } = {}) {
    const where = [];
    const params = [];
    if (search) {
      where.push(`(registerNumber LIKE ? OR name LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }
    if (department) {
      where.push(`department = ?`);
      params.push(department);
    }
    if (year) {
      where.push(`year = ?`);
      params.push(year);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT * FROM students ${whereSql} ORDER BY name ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);
    const total = db
      .prepare(`SELECT COUNT(*) AS c FROM students ${whereSql}`)
      .get(...params).c;
    return { rows, total };
  },

  count() {
    return db.prepare(`SELECT COUNT(*) AS c FROM students`).get().c;
  },

  /** Public, kiosk-safe search: returns only registerNumber/name/department. */
  publicSearch(q = '', limit = 8) {
    const term = (q || '').toString().trim();
    if (!term) return [];
    return db
      .prepare(
        `SELECT registerNumber, name, department
         FROM students
         WHERE registerNumber LIKE ? OR name LIKE ?
         ORDER BY name ASC LIMIT ?`
      )
      .all(`%${term}%`, `%${term}%`, limit);
  },

  update(id, fields) {
    const allowed = ['registerNumber', 'name', 'department', 'year'];
    const sets = [];
    const params = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(fields[key]);
      }
    }
    if (!sets.length) return this.findById(id);
    params.push(id);
    db.prepare(`UPDATE students SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  },

  remove(id) {
    return db.prepare(`DELETE FROM students WHERE id = ?`).run(id);
  },

  /** Bulk insert from Excel import. Each item: {registerNumber,name,department,year}.
   *  Returns { inserted, ignored } where `ignored` = rows dropped by
   *  INSERT OR IGNORE (duplicate register numbers, case-insensitive). */
  bulkInsert(items) {
    const insert = db.prepare(
      `INSERT OR IGNORE INTO students (registerNumber, name, department, year, createdAt)
       VALUES (@registerNumber, @name, @department, @year, @createdAt)`
    );
    const createdAt = new Date().toISOString();
    const tx = db.transaction((list) => {
      let inserted = 0;
      for (const it of list) {
        const res = insert.run({
          registerNumber: it.registerNumber,
          name: it.name,
          department: it.department,
          year: it.year,
          createdAt,
        });
        if (res.changes) inserted++;
      }
      return { inserted, ignored: list.length - inserted };
    });
    return tx(items);
  },
};

module.exports = studentModel;
