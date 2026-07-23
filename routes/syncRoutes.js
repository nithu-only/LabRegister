/**
 * routes/syncRoutes.js
 * -----------------------------------------------------------------------------
 * GET  /status -> current online/pending/last-sync snapshot (home + admin).
 * POST /now    -> manual "Sync Now" trigger (admin).
 * -----------------------------------------------------------------------------
 */
const express = require('express');
const router = express.Router();
const syncService = require('../services/syncService');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/status', asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await syncService.status()) });
}));
router.post('/now', requireAuth, asyncHandler(async (req, res) => {
  const result = await syncService.syncOnce();
  res.json({ success: true, ...result });
}));
router.post('/pull', requireAuth, asyncHandler(async (req, res) => {
  const result = await syncService.pullFromCloud();
  res.json({ success: true, ...result });
}));

module.exports = router;
