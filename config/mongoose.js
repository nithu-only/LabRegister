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
const dns = require('dns');
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
    // Fix for Windows DNS: the default resolver (127.0.0.1) often can't resolve
    // SRV records needed by mongodb+srv:// URIs. Use Google DNS as fallback.
    if (env.MONGODB_URI.startsWith('mongodb+srv://')) {
      dns.setServers(['8.8.8.8', '8.8.4.4']);
    }

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
