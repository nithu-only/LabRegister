/**
 * routes/reportRoutes.js
 * -----------------------------------------------------------------------------
 * GET /attendance -> attendance roll-up (days present / hours / visits). [auth]
 * -----------------------------------------------------------------------------
 */
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/attendance', requireAuth, asyncHandler(async (req, res) => {
  const result = reportController.attendance(req);
  res.json({ success: true, ...result });
}));

module.exports = router;
