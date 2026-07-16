/**
 * scripts/backup.js
 * -----------------------------------------------------------------------------
 * One-shot manual backup of the live SQLite database. The same logic runs on the
 * nightly cron schedule (see server.js); this is for on-demand use:
 *
 *   npm run backup
 * -----------------------------------------------------------------------------
 */
const backupService = require('../services/backupService');
const { writeLog } = require('../services/logService');

(async () => {
  const r = backupService.createBackup();
  // eslint-disable-next-line no-console
  console.log(`✅ Backup created: ${r.file} (${(r.size / 1024).toFixed(1)} KB)`);
  writeLog('event', 'manual backup via script', { file: r.file });
  process.exit(0);
})();
