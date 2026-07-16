/**
 * services/syncService.js
 * -----------------------------------------------------------------------------
 * OFFLINE-FIRST background synchronisation.
 *
 * Every SYNC_INTERVAL_SECONDS the sync loop:
 *   1. Probes internet.
 *   2. If offline -> do nothing (data already safe in SQLite).
 *   3. If online  -> read sessions with syncStatus = 0, upsert them (and their
 *                    students) into MongoDB Atlas, then mark syncStatus = 1.
 *
 * The student NEVER waits for this. Login/logout is always committed to SQLite
 * first; the cloud push happens in the background.
 * -----------------------------------------------------------------------------
 */
const { isMongoConnected } = require('../config/mongoose');
const { StudentBackup, SessionBackup } = require('../models/mongoModels');
const sessionModel = require('../models/sessionModel');
const studentModel = require('../models/studentModel');
const { isOnline } = require('./internetService');
const { writeLog } = require('./logService');
const env = require('../config/env');

let isRunning = false;

/**
 * Run a single synchronisation pass. Safe to call manually ("Sync Now") or
 * from the scheduler.
 * @returns {Promise<{online:boolean, synced:number, pending:number, error:string|null}>}
 */
async function syncOnce() {
  if (isRunning) return { online: await isOnline(), synced: 0, pending: sessionModel.pendingCount(), error: 'already-running' };
  isRunning = true;
  const result = { online: false, synced: 0, pending: 0, error: null };
  try {
    const online = await isOnline();
    result.online = online;
    if (!online) {
      writeLog('warn', 'Sync skipped — offline.');
      return result;
    }
    if (!isMongoConnected()) {
      result.error = 'mongo-not-connected';
      writeLog('warn', 'Sync skipped — MongoDB not connected.');
      return result;
    }

    const pending = sessionModel.pendingSync();
    result.pending = pending.length;
    if (!pending.length) {
      writeLog('info', 'Sync pass — nothing pending.');
      return result;
    }

    const lastSyncedAt = new Date().toISOString();
    const studentIds = new Set();

    for (const s of pending) {
      // Make sure the student exists in the cloud (so name/dept are present).
      const student = studentModel.findByRegisterNumber(s.registerNumber);
      if (student) {
        studentIds.add(student.registerNumber);
        await StudentBackup.updateOne(
          { registerNumber: student.registerNumber },
          {
            $set: {
              registerNumber: student.registerNumber,
              name: student.name,
              department: student.department,
              year: student.year,
              createdAt: student.createdAt,
            },
          },
          { upsert: true }
        );
      }

      // Upsert the session keyed by uuid (idempotent re-sync).
      await SessionBackup.updateOne(
        { uuid: s.uuid },
        {
          $set: {
            uuid: s.uuid,
            registerNumber: s.registerNumber,
            loginTime: s.loginTime,
            logoutTime: s.logoutTime || null,
            duration: s.duration || 0,
            date: s.date,
            status: s.status,
            systemNumber: s.systemNumber || null,
            syncStatus: 1,
            lastSyncedAt: new Date(lastSyncedAt),
            createdAt: s.createdAt,
          },
        },
        { upsert: true }
      );
    }

    // Mark all uploaded rows as synced in SQLite.
    sessionModel.markSynced(
      pending.map((s) => s.id),
      lastSyncedAt
    );
    result.synced = pending.length;
    writeLog('event', 'Sync completed', { synced: pending.length });
  } catch (err) {
    result.error = err.message;
    writeLog('error', 'Sync failed', { error: err.message });
  } finally {
    isRunning = false;
  }
  return result;
}

/** Returns a lightweight status snapshot for the UI. */
async function status() {
  return {
    online: await isOnline(),
    mongoConfigured: !!env.MONGODB_URI,
    mongoConnected: isMongoConnected(),
    pending: sessionModel.pendingCount(),
    lastSyncedAt: sessionModel.lastSyncedAt(),
    synced: sessionModel.count() - sessionModel.pendingCount(),
    total: sessionModel.count(),
  };
}

module.exports = { syncOnce, status };
