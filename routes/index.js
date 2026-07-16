/**
 * routes/index.js
 * -----------------------------------------------------------------------------
 * Mounts all API routers under /api. Keeping this in one place makes server.js
 * small and makes the API surface easy to review.
 * -----------------------------------------------------------------------------
 */
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const studentRoutes = require('./studentRoutes');
const sessionRoutes = require('./sessionRoutes');
const reportRoutes = require('./reportRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const settingsRoutes = require('./settingsRoutes');
const backupRoutes = require('./backupRoutes');
const syncRoutes = require('./syncRoutes');

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/sessions', sessionRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/backups', backupRoutes);
router.use('/sync', syncRoutes);

module.exports = router;
