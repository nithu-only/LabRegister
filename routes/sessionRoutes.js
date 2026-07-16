/**
 * routes/sessionRoutes.js
 * -----------------------------------------------------------------------------
 * POST /transaction            -> Core kiosk action (login/logout/register).
 * GET  /                       -> List sessions (filters/pagination). [auth]
 * GET  /active                 -> Students currently inside.          [auth]
 * POST /:uuid/force-logout     -> Admin force logout.                 [auth]
 * GET  /export                 -> Excel/CSV/PDF export.               [auth]
 * -----------------------------------------------------------------------------
 */
const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const sessionModel = require('../models/sessionModel');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateRegisterNumber } = require('../middleware/validate');
const exportController = require('../controllers/exportController');

// Core kiosk transaction (public).
router.post(
  '/transaction',
  validateRegisterNumber('registerNumber'),
  asyncHandler((req, res) => {
    const result = sessionController.processTransaction(req.body.registerNumber, req.body.systemNumber);
    res.status(result.status || 200).json({ success: result.ok, ...result });
  })
);

// Public kiosk logout by session uuid (physical kiosk — no admin auth).
router.post('/logout', asyncHandler((req, res) => {
  const result = sessionController.kioskLogout(req.body.uuid);
  res.status(result.status || 200).json({ success: result.ok, ...result });
}));

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(500, parseInt(req.query.limit, 10) || 50);
  const { preset, dateFrom, dateTo } = require('../controllers/reportController').resolveRange(
    req.query.preset || 'today', req.query.dateFrom, req.query.dateTo
  );
  const { rows, total } = sessionModel.list({
    filters: {
      dateFrom, dateTo,
      department: req.query.department || '',
      year: req.query.year || '',
      status: req.query.status || '',
      search: req.query.search || '',
      registerNumber: req.query.registerNumber || '',
    },
    limit, offset: (page - 1) * limit,
  });
  res.json({ success: true, rows, total, page, limit, pages: Math.ceil(total / limit), range: { dateFrom, dateTo } });
}));

router.get('/active', requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, rows: sessionController.activeList() });
}));

router.post('/:uuid/force-logout', requireAuth, asyncHandler(async (req, res) => {
  const completed = sessionController.forceLogout(req.params.uuid);
  if (!completed) return res.status(404).json({ success: false, message: 'Session not found.' });
  res.json({ success: true, session: completed });
}));

router.get('/export', requireAuth, asyncHandler(exportController.exportSessions));

module.exports = router;
