/**
 * routes/dashboardRoutes.js
 */
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, stats: await dashboardController.stats() });
}));
router.get('/charts', requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, charts: dashboardController.charts() });
}));

module.exports = router;
