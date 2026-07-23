/**
 * controllers/studentController.js
 * -----------------------------------------------------------------------------
 * Student CRUD + Excel import/export. All inputs are sanitised server-side.
 * -----------------------------------------------------------------------------
 */
const studentModel = require('../models/studentModel');
const { writeLog } = require('../services/logService');
const {
  sanitizeRegisterNumber,
  sanitizeName,
  sanitizeText,
  sanitizeYear,
} = require('../middleware/validate');

function list(req) {
  const { search = '', department = '', year = '' } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(500, parseInt(req.query.limit, 10) || 50);
  const { rows, total } = studentModel.list({
    search,
    department,
    year,
    limit,
    offset: (page - 1) * limit,
  });
  return { rows, total, page, limit, pages: Math.ceil(total / limit) };
}

function get(req) {
  const student = studentModel.findById(req.params.id);
  if (!student) {
    const e = new Error('Student not found');
    e.status = 404;
    throw e;
  }
  return student;
}

function create(req) {
  const registerNumber = sanitizeRegisterNumber(req.body.registerNumber);
  const name = sanitizeName(req.body.name);
  const department = sanitizeText(req.body.department, 60);
  const year = sanitizeYear(req.body.year);

  if (!registerNumber) throw Object.assign(new Error('Invalid register number.'), { status: 400 });
  if (!name) throw Object.assign(new Error('Invalid name.'), { status: 400 });
  if (!department) throw Object.assign(new Error('Invalid department.'), { status: 400 });
  if (!year) throw Object.assign(new Error('Invalid year.'), { status: 400 });

  if (studentModel.findByRegisterNumber(registerNumber)) {
    throw Object.assign(new Error('Register number already exists.'), { status: 409 });
  }

  const student = studentModel.create({ registerNumber, name, department, year });
  writeLog('event', 'Student added', { registerNumber });
  return student;
}

function update(req) {
  const id = req.params.id;
  if (!studentModel.findById(id)) {
    throw Object.assign(new Error('Student not found'), { status: 404 });
  }
  const fields = {};
  if (req.body.name !== undefined) {
    const name = sanitizeName(req.body.name);
    if (!name) throw Object.assign(new Error('Invalid name.'), { status: 400 });
    fields.name = name;
  }
  if (req.body.department !== undefined) {
    const department = sanitizeText(req.body.department, 60);
    if (!department) throw Object.assign(new Error('Invalid department.'), { status: 400 });
    fields.department = department;
  }
  if (req.body.year !== undefined) {
    const year = sanitizeYear(req.body.year);
    if (!year) throw Object.assign(new Error('Invalid year.'), { status: 400 });
    fields.year = year;
  }
  const updated = studentModel.update(id, fields);
  writeLog('event', 'Student updated', { id });
  return updated;
}

function remove(req) {
  const id = req.params.id;
  if (!studentModel.findById(id)) {
    throw Object.assign(new Error('Student not found'), { status: 404 });
  }
  studentModel.remove(id);
  writeLog('event', 'Student deleted', { id });
  return { deleted: true };
}

/** Bulk insert parsed rows from an Excel file. */
function bulkImport(rows) {
  const cleaned = [];
  const errors = [];
  for (const r of rows) {
    // Flexible column mapping — supports various casing/aliases.
    const registerNumber = sanitizeRegisterNumber(r.registerNumber || r.RegisterNumber || r['Register Number'] || r.USN);
    const name = sanitizeName(r.name || r.Name);
    const department = sanitizeText(r.department || r.Department, 60);
    const year = sanitizeYear(r.year || r.Year);
    if (registerNumber && name && department && year) {
      cleaned.push({ registerNumber, name, department, year });
    } else {
      errors.push(r);
    }
  }
  const { inserted, ignored } = studentModel.bulkInsert(cleaned);
  writeLog('event', 'Student import', { inserted, duplicates: ignored, skipped: errors.length });
  return { inserted, duplicates: ignored, skipped: errors.length };
}

/** Public, kiosk-safe search (no PII beyond what a kiosk screen shows). */
function publicSearch(q) {
  return studentModel.publicSearch(q, 8);
}

/** Check if a register number already exists (for live duplicate warning). */
function findByRegisterNumber(reg) {
  if (!reg) return null;
  return studentModel.findByRegisterNumber(reg);
}

module.exports = { list, get, create, update, remove, bulkImport, publicSearch, findByRegisterNumber };
