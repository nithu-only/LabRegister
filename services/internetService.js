/**
 * services/internetService.js
 * -----------------------------------------------------------------------------
 * Internet connectivity probe used by the sync service.
 *
 * Strategy: fire a cheap HEAD/GET request to a reliable endpoint with a short
 * timeout. We treat any completed response (even 404) as "online" because the
 * goal is to know whether the network path exists, not whether a specific
 * resource exists.
 * -----------------------------------------------------------------------------
 */
const axios = require('axios');
const env = require('../config/env');
const { writeLog } = require('./logService');

let cachedOnline = false;
let lastCheckedAt = null;

/**
 * Probe connectivity. Returns boolean. Result is cached for a few seconds so
 * the sync loop doesn't spam the network.
 */
async function checkInternet() {
  // Cache for 5s to avoid hammering the probe URL.
  if (lastCheckedAt && Date.now() - lastCheckedAt < 5000) return cachedOnline;
  try {
    await axios.get(env.INTERNET_CHECK_URL, {
      timeout: 4000,
      validateStatus: () => true, // any status = we have a route
    });
    cachedOnline = true;
  } catch (err) {
    cachedOnline = false;
  }
  lastCheckedAt = Date.now();
  return cachedOnline;
}

// Force a fresh check (used by "Sync Now" button / debug).
async function isOnline() {
  lastCheckedAt = null;
  return checkInternet();
}

module.exports = { checkInternet, isOnline };
