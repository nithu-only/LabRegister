/**
 * services/autoLogoutService.js
 * -----------------------------------------------------------------------------
 * Auto-logout scheduler: automatically logs out all active students at a
 * configured time each day (default 4:50 PM / 16:50).
 *
 * This ensures students who forget to logout are automatically logged out
 * at end of day, closing their session and recording the duration.
 * -----------------------------------------------------------------------------
 */
const cron = require('node-cron');
const sessionModel = require('../models/sessionModel');
const { writeLog } = require('./logService');

let cronJob = null;

/**
 * Start the auto-logout scheduler.
 * Runs at the configured AUTO_LOGOUT_TIME each day.
 */
function start(autoLogoutTime) {
  if (cronJob) {
    writeLog('warn', 'Auto-logout scheduler already running');
    return;
  }

  const [hours, minutes] = (autoLogoutTime || '16:50').split(':').map(Number);
  const cronExpr = `${minutes} ${hours} * * *`; // Run at HH:MM every day

  if (!cron.validate(cronExpr)) {
    writeLog('error', 'Invalid AUTO_LOGOUT_TIME format', { value: autoLogoutTime });
    return;
  }

  cronJob = cron.schedule(cronExpr, () => {
    try {
      autoLogoutAllStudents();
    } catch (e) {
      writeLog('error', 'Auto-logout job failed', { error: e.message });
    }
  });

  writeLog('info', `Auto-logout scheduler started at ${autoLogoutTime} (${cronExpr})`);
}

/**
 * Stop the auto-logout scheduler.
 */
function stop() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    writeLog('info', 'Auto-logout scheduler stopped');
  }
}

/**
 * Force logout all active sessions (called by the scheduled job).
 */
function autoLogoutAllStudents() {
  const active = sessionModel.activeList();
  if (!active.length) {
    writeLog('info', 'Auto-logout: no active sessions to close');
    return;
  }

  let loggedOut = 0;
  for (const session of active) {
    try {
      sessionModel.forceComplete(session.uuid);
      loggedOut++;
    } catch (e) {
      writeLog('error', 'Failed to auto-logout session', { uuid: session.uuid, error: e.message });
    }
  }

  writeLog('event', 'Daily auto-logout completed', {
    totalLoggedOut: loggedOut,
    time: new Date().toISOString(),
  });
}

module.exports = { start, stop, autoLogoutAllStudents };
