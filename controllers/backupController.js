/**
 * controllers/backupController.js
 * -----------------------------------------------------------------------------
 * Manual backup actions exposed to the admin: list, backup-now, restore.
 * (Scheduled nightly backup is wired in server.js via node-cron.)
 * -----------------------------------------------------------------------------
 */
const backupService = require('../services/backupService');
const { writeLog } = require('../services/logService');

function list() {
  return backupService.listBackups().map((b) => ({
    name: b.name,
    sizeKb: Math.round(b.size / 1024),
    createdAt: b.createdAt,
  }));
}

function backupNow() {
  const result = backupService.createBackup();
  writeLog('event', 'Manual backup', { file: result.file });
  return result;
}

function restore(filename) {
  const result = backupService.restoreBackup(filename);
  writeLog('event', 'Restore requested', { filename });
  // Note: SQLite keeps the old handle; recommend restart via /api/admin/restart
  return result;
}

module.exports = { list, backupNow, restore };
