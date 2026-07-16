/**
 * sync/syncWorker.js
 * -----------------------------------------------------------------------------
 * Starts/stops the background sync scheduler.
 *
 * The sync interval is read from the runtime `syncInterval` setting (falling
 * back to env SYNC_INTERVAL_SECONDS) on EVERY pass, so an admin changing it in
 * Settings takes effect without a restart (FR-7.1 / Phase 9 "persisted live").
 *
 * The sync itself is a "fire and forget" background job — it must never block
 * the main request path, and failures are swallowed (logged, retried next pass).
 * -----------------------------------------------------------------------------
 */
const env = require('../config/env');
const settingModel = require('../models/settingModel');
const { syncOnce } = require('../services/syncService');
const { writeLog } = require('../services/logService');

let timer = null;

/** Current desired interval in ms, read live from settings (clamped 5–3600s). */
function readIntervalMs() {
  const raw = settingModel.get('syncInterval');
  const n = parseInt(raw, 10);
  const secs = Number.isFinite(n) && n >= 5 ? Math.min(n, 3600) : env.SYNC_INTERVAL_SECONDS;
  return Math.max(5, secs) * 1000;
}

/** Self-rescheduling loop: re-reads the interval before each wait. */
function scheduleNext() {
  const intervalMs = readIntervalMs();
  timer = setTimeout(() => {
    // Don't await — keep the loop non-blocking.
    syncOnce().catch((e) => writeLog('error', 'Sync pass threw', { error: e.message }));
    scheduleNext();
  }, intervalMs);
}

function start() {
  writeLog('info', `Sync scheduler started (interval read live from settings)`);
  // Kick one off shortly after boot (gives Mongo time to connect).
  setTimeout(() => syncOnce().catch(() => {}), 3000);
  scheduleNext();
}

function stop() {
  if (timer) clearTimeout(timer);
  timer = null;
}

module.exports = { start, stop };
