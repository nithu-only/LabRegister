/**
 * routes/settingsRoutes.js
 */
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/public', asyncHandler(async (req, res) => {
  res.json({ success: true, ...settingsController.publicBranding() });
}));
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, settings: settingsController.getAll() });
}));
router.put('/', requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, settings: settingsController.update(req) });
}));

module.exports = router;
