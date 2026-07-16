/**
 * routes/backupRoutes.js
 */
const express = require('express');
const fs = require('fs');
const router = express.Router();
const backupController = require('../controllers/backupController');
const backupService = require('../services/backupService');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, backups: backupController.list() });
}));
router.post('/now', requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, ...backupController.backupNow() });
}));
router.post('/restore', requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, ...backupController.restore(req.body.filename) });
}));
router.get('/download/:filename', requireAuth, asyncHandler(async (req, res) => {
  const file = backupService.resolveBackupFile(req.params.filename);
  if (!fs.existsSync(file)) return res.status(404).json({ success: false });
  res.download(file);
}));

module.exports = router;
