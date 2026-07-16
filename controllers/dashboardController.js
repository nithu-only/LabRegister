/**
 * controllers/dashboardController.js
 * -----------------------------------------------------------------------------
 * Aggregates the statistic cards shown on the admin dashboard.
 * -----------------------------------------------------------------------------
 */
const sessionModel = require('../models/sessionModel');
const studentModel = require('../models/studentModel');
const { status: syncStatus } = require('../services/syncService');
const { isOnline } = require('../services/internetService');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function stats() {
  const today = todayStr();
  const studentCount = studentModel.count();
  const sessionCount = sessionModel.count();
  const inside = sessionModel.activeCount();
  const completed = sessionCount - inside;
  const pending = sessionModel.pendingCount();
  const net = await isOnline();
  const sync = await syncStatus();

  return {
    todayVisitors: sessionModel.countByDate(today),
    studentsInside: inside,
    completedSessions: completed,
    pendingSync: pending,
    internet: net ? 'online' : 'offline',
    lastSync: sync.lastSyncedAt,
    totalStudents: studentCount,
    totalSessions: sessionCount,
  };
}

/** Chart datasets. */
function charts() {
  return {
    dailyVisitors: sessionModel.dailyVisitors(30),
    departmentUsage: sessionModel.departmentUsage(),
    yearUsage: sessionModel.yearUsage(),
    peakHours: sessionModel.peakHours(),
    monthlySessions: sessionModel.monthlySessions(12),
  };
}

module.exports = { stats, charts };
