/**
 * middleware/auth.js
 * -----------------------------------------------------------------------------
 * Protects admin REST endpoints. Admin pages are static HTML, but every API
 * that mutates data requires a valid Express session created by /api/auth/login.
 * -----------------------------------------------------------------------------
 */
const { writeLog } = require('../services/logService');

function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) return next();
  writeLog('warn', 'Unauthorized admin API access', { path: req.path, ip: req.ip });
  return res.status(401).json({ success: false, message: 'Unauthorized' });
}

module.exports = { requireAuth };
