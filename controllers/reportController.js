/**
 * controllers/reportController.js
 * -----------------------------------------------------------------------------
 * Attendance reports + exports (Excel / CSV / PDF).
 * Reports are derived directly from login/logout sessions.
 * -----------------------------------------------------------------------------
 */
const sessionModel = require('../models/sessionModel');
const { writeLog } = require('../services/logService');
const env = require('../config/env');

/** Resolve a preset ("today","yesterday","week","month") to a date range. */
function resolveRange(preset, dateFrom, dateTo) {
  const now = new Date();
  // Local-date string (NOT toISOString, which is UTC and shifts the day in
  // non-UTC timezones). The date math above is all local, so stay consistent.
  const iso = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  if (dateFrom && dateTo) return { dateFrom, dateTo };
  switch (preset) {
    case 'today':
      return { dateFrom: iso(now), dateTo: iso(now) };
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { dateFrom: iso(y), dateTo: iso(y) };
    }
    case 'week': {
      const start = new Date(now); start.setDate(start.getDate() - 6);
      return { dateFrom: iso(start), dateTo: iso(now) };
    }
    case 'month': {
      const start = new Date(now); start.setDate(start.getDate() - 29);
      return { dateFrom: iso(start), dateTo: iso(now) };
    }
    case 'weekly': {                       // current calendar week, Mon–Sun
      const d = new Date(now);
      const dow = (d.getDay() + 6) % 7;    // 0 = Monday
      d.setDate(d.getDate() - dow);
      return { dateFrom: iso(d), dateTo: iso(now) };
    }
    case 'monthly': {                      // current calendar month
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: iso(start), dateTo: iso(now) };
    }
    default:
      return { dateFrom: iso(now), dateTo: iso(now) };
  }
}

function attendance(req) {
  const { preset = 'today', dateFrom, dateTo, department = '', year = '', registerNumber = '' } = req.query;
  const range = resolveRange(preset, dateFrom, dateTo);
  const rows = sessionModel.attendance({ ...range, department, year, registerNumber });
  // Human-readable totals
  const data = rows.map((r) => ({
    registerNumber: r.registerNumber,
    name: r.name,
    department: r.department,
    year: r.year,
    daysPresent: r.daysPresent,
    totalVisits: r.visits,
    totalHours: (r.totalSeconds / 3600).toFixed(2),
  }));
  return { range, data };
}

function formatDuration(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

/** Raw session rows for export (Excel/CSV/PDF). */
function exportSessions(req) {
  const { preset = 'today', dateFrom, dateTo, department = '', year = '', status = '', search = '', registerNumber = '' } = req.query;
  const range = resolveRange(preset, dateFrom, dateTo);
  const { rows } = sessionModel.list({
    filters: {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      department,
      year,
      status,
      search,
      registerNumber,
    },
    limit: 100000,
    offset: 0,
  });
  const data = rows.map((s) => ({
    registerNumber: s.registerNumber,
    name: s.name,
    department: s.department,
    year: s.year,
    systemNumber: s.systemNumber || '',
    loginTime: s.loginTime,
    logoutTime: s.logoutTime || '',
    duration: s.duration ? formatDuration(s.duration) : '',
    status: s.status,
    date: s.date,
  }));
  return { range, data };
}

module.exports = { attendance, exportSessions, resolveRange };
