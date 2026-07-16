/**
 * routes/authRoutes.js
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.post('/login', asyncHandler(authController.login));
router.post('/logout', requireAuth, asyncHandler(authController.logout));
router.get('/me', asyncHandler(authController.me));
router.post('/change-password', requireAuth, asyncHandler(authController.changePassword));

module.exports = router;
