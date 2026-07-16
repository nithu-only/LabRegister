/**
 * routes/studentRoutes.js
 * -----------------------------------------------------------------------------
 * POST /register        -> Kiosk: create student + auto-open a login session.
 * POST /                -> Admin: add student (no auto-login).  [auth]
 * GET  /                -> List / search / filter.              [auth]
 * GET  /:id             -> Get one.                             [auth]
 * PUT  /:id             -> Edit.                                [auth]
 * DELETE /:id           -> Delete.                              [auth]
 * POST /import          -> Excel import.                        [auth]
 *
 * NOTE: studentController methods RETURN data; the route is responsible for
 * sending it via res.json in the shape the front-end expects.
 * -----------------------------------------------------------------------------
 */
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const sessionController = require('../controllers/sessionController');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateRegisterNumber } = require('../middleware/validate');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// Kiosk registration + immediate login (no auth — it's the public flow).
router.post(
  '/register',
  validateRegisterNumber('registerNumber'),
  asyncHandler((req, res) => {
    const result = sessionController.registerAndLogin(req.body);
    res.status(result.status || 200).json({ success: result.ok, ...result });
  })
);

// Admin: add a student.
router.post(
  '/',
  requireAuth,
  validateRegisterNumber('registerNumber'),
  asyncHandler((req, res) => {
    res.status(201).json({ success: true, student: studentController.create(req) });
  })
);

router.get('/', requireAuth, asyncHandler((req, res) => {
  res.json({ success: true, ...studentController.list(req) });
}));

// Public kiosk search (register number / name) — minimal fields only.
router.get('/public-search', asyncHandler(async (req, res) => {
  res.json({ success: true, rows: studentController.publicSearch(req.query.q || '') });
}));

router.get('/:id', requireAuth, asyncHandler((req, res) => {
  res.json(studentController.get(req));
}));

router.put('/:id', requireAuth, asyncHandler((req, res) => {
  res.json({ success: true, student: studentController.update(req) });
}));

router.delete('/:id', requireAuth, asyncHandler((req, res) => {
  res.json({ success: true, ...studentController.remove(req) });
}));

router.post(
  '/import',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const XLSX = require('xlsx');
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const result = studentController.bulkImport(rows);
    res.json({ success: true, ...result });
  })
);

module.exports = router;
