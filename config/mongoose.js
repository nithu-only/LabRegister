/**
 * config/mongoose.js
 * -----------------------------------------------------------------------------
 * MongoDB Atlas connection (CLOUD BACKUP database only).
 *
 * This connection is OPTIONAL. The app is fully functional offline. If
 * MONGODB_URI is empty or the connection fails, the system keeps running on
 * SQLite and the background sync service simply waits until connectivity
 * returns.
 * -----------------------------------------------------------------------------
 */
const mongoose = require('mongoose');
const env = require('./env');
const { writeLog } = require('../services/logService');

let isConnected = false;

/**
 * Attempt to connect to MongoDB Atlas. Never throws — failure is logged and
 * the app continues offline.
 */
async function connectMongo() {
  if (!env.MONGODB_URI) {
    writeLog('info', 'MONGODB_URI empty — running in offline-only mode (no cloud backup).');
    return false;
  }
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 5,
    });
    isConnected = true;
    writeLog('info', 'Connected to MongoDB Atlas (cloud backup ready).');
    return true;
  } catch (err) {
    isConnected = false;
    writeLog('error', 'MongoDB Atlas connection failed — continuing offline.', {
      error: err.message,
    });
    return false;
  }
}

function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectMongo, isMongoConnected, mongoose };
