/**
 * middleware/errorHandler.js
 * -----------------------------------------------------------------------------
 * Centralised error handling. Converts thrown errors into clean JSON and logs
 * them. Mounted last in server.js.
 * -----------------------------------------------------------------------------
 */
const { writeLog } = require('../services/logService');

function errorHandler(err, req, res, next) {
  writeLog('error', 'Request error', { message: err.message, stack: err.stack, path: req.path });
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal server error' : err.message,
  });
}

/** Wrap async route handlers so thrown/rejected promises hit errorHandler. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
