/**
 * models/mongoModels.js
 * -----------------------------------------------------------------------------
 * Mongoose schemas for the CLOUD BACKUP (MongoDB Atlas).
 *
 * These mirror the SQLite tables. The background sync service reads pending
 * rows from SQLite and upserts them here keyed by `uuid` so re-syncs are
 * idempotent.
 * -----------------------------------------------------------------------------
 */
const { mongoose } = require('../config/mongoose');

const StudentSchema = new mongoose.Schema(
  {
    registerNumber: { type: String, required: true, unique: true, index: true },
    name: String,
    department: String,
    year: String,
    createdAt: Date,
  },
  { timestamps: true }
);

const SessionSchema = new mongoose.Schema(
  {
    uuid: { type: String, required: true, unique: true, index: true },
    registerNumber: { type: String, index: true },
    loginTime: Date,
    logoutTime: Date,
    duration: Number,
    date: String,
    status: String,
    systemNumber: String,
    syncStatus: Number,
    lastSyncedAt: Date,
    createdAt: Date,
  },
  { timestamps: true }
);

const StudentBackup = mongoose.model('StudentBackup', StudentSchema);
const SessionBackup = mongoose.model('SessionBackup', SessionSchema);

module.exports = { StudentBackup, SessionBackup };
