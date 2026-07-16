/**
 * controllers/sessionController.js
 * -----------------------------------------------------------------------------
 * The heart of the kiosk: the auto login/logout transaction.
 *
 * processTransaction(registerNumber):
 *   - Student unknown   -> { action: 'register' }   (UI opens the form)
 *   - Student known
 *       - has ACTIVE session -> logout, compute duration -> { action: 'logout' }
 *       - no active session  -> login                 -> { action: 'login' }
 *
 * Every state change is committed to SQLite FIRST (offline-first). The cloud
 * push happens later in the background.
 * -----------------------------------------------------------------------------
 */
const { v4: uuidv4 } = require('uuid');
const sessionModel = require('../models/sessionModel');
const studentModel = require('../models/studentModel');
const settingModel = require('../models/settingModel');
const { writeLog } = require('../services/logService');
const { sanitizeRegisterNumber } = require('../middleware/validate');

/** Format a seconds value as "1h 23m 4s". */
function formatDuration(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : '', `${s}s`].filter(Boolean).join(' ') || '0s';
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Whether the kiosk may register brand-new students (admin-configurable). */
function selfRegistrationAllowed() {
  return settingModel.get('allowSelfRegistration') !== 'false';
}

/**
 * Decide login vs logout vs register for a register number.
 */
function processTransaction(registerNumberRaw, systemNumberRaw) {
  const registerNumber = sanitizeRegisterNumber(registerNumberRaw);
  if (!registerNumber) {
    return { ok: false, status: 400, error: 'Invalid register number.' };
  }
  const systemNumber = (systemNumberRaw || '').toString().trim() || null;

  const student = studentModel.findByRegisterNumber(registerNumber);
  if (!student) {
    if (!selfRegistrationAllowed()) {
      writeLog('warn', 'Self-registration blocked (disabled by policy)', { registerNumber });
      return { ok: false, status: 403, error: 'Self-registration is disabled. Contact the lab admin.' };
    }
    writeLog('event', 'Unknown student — registration required', { registerNumber });
    return { ok: true, status: 200, action: 'register', registerNumber };
  }

  const active = sessionModel.findActive(registerNumber);
  if (active) {
    // Already logged in: do NOT auto-logout. Return the active session so the
    // kiosk can ask the user (Yes = logout, No = stay logged in).
    writeLog('event', 'Already logged in — confirmation required', { registerNumber });
    return {
      ok: true,
      status: 200,
      action: 'already-in',
      student,
      session: active,
    };
  }

  if (!systemNumber) {
    return { ok: false, status: 400, error: 'System number is required to log in.' };
  }

  // Login
  const loginTime = new Date().toISOString();
  const created = sessionModel.create({
    uuid: uuidv4(),
    registerNumber,
    loginTime,
    date: todayStr(),
    systemNumber,
  });
  writeLog('event', 'Login', { registerNumber, systemNumber });
  return { ok: true, status: 200, action: 'login', student, session: created };
}

/**
 * Register a brand-new student AND immediately open a login session.
 * (Matches the spec: after saving the student, auto create a login session.)
 */
function registerAndLogin({ registerNumber, name, department, year, systemNumber: systemNumberRaw }) {
  const existing = studentModel.findByRegisterNumber(registerNumber);
  if (existing) {
    // Shouldn't normally happen, but guard against duplicates.
    return processTransaction(registerNumber, systemNumberRaw);
  }
  if (!selfRegistrationAllowed()) {
    return { ok: false, status: 403, error: 'Self-registration is disabled. Contact the lab admin.' };
  }
  const systemNumber = (systemNumberRaw || '').toString().trim() || null;
  if (!systemNumber) {
    return { ok: false, status: 400, error: 'System number is required to log in.' };
  }
  const student = studentModel.create({ registerNumber, name, department, year });
  const loginTime = new Date().toISOString();
  const session = sessionModel.create({
    uuid: uuidv4(),
    registerNumber,
    loginTime,
    date: todayStr(),
    systemNumber,
  });
  writeLog('event', 'New student registered + login', { registerNumber, systemNumber });
  return { ok: true, status: 201, action: 'login', student, session };
}

function activeList() {
  return sessionModel.activeList().map((s) => ({
    ...s,
    currentDurationSeconds: Math.floor((Date.now() - new Date(s.loginTime)) / 1000),
    currentDurationText: formatDuration((Date.now() - new Date(s.loginTime)) / 1000),
  }));
}

function forceLogout(uuid) {
  const completed = sessionModel.forceComplete(uuid);
  if (completed) writeLog('event', 'Force logout', { uuid });
  return completed;
}

/** Public, kiosk-facing instant logout by session uuid (no admin auth). */
function kioskLogout(uuid) {
  const s = sessionModel.findByUuid(uuid);
  if (!s) return { ok: false, status: 404, error: 'Session not found.' };
  if (s.status !== 'ACTIVE') return { ok: false, status: 400, error: 'Already logged out.' };
  const completed = sessionModel.forceComplete(uuid);
  return {
    ok: true,
    status: 200,
    action: 'logout',
    session: completed,
    durationSeconds: completed.duration,
    durationText: formatDuration(completed.duration),
  };
}

module.exports = {
  processTransaction,
  registerAndLogin,
  kioskLogout,
  activeList,
  forceLogout,
  formatDuration,
};
