/**
 * middleware/validate.js
 * -----------------------------------------------------------------------------
 * Small, dependency-free input validation + sanitisation helpers.
 * Used by controllers for SERVER-SIDE validation (client-side validation also
 * exists in the UI). Always validate on the server — never trust the client.
 * -----------------------------------------------------------------------------
 */

/** Trim + collapse whitespace; return null for empty. */
function clean(str) {
  if (str === undefined || str === null) return '';
  return String(str).trim().replace(/\s+/g, ' ');
}

/** Register numbers: allow letters, digits, dash, underscore. Upper-cased. */
function sanitizeRegisterNumber(raw) {
  const s = clean(raw).toUpperCase();
  return /^[A-Z0-9\-_]{4,20}$/.test(s) ? s : null;
}

function sanitizeName(raw) {
  const s = clean(raw);
  return /^[A-Za-z .\-']{1,100}$/.test(s) ? s : null;
}

function sanitizeText(raw, max = 100) {
  const s = clean(raw);
  return s.length <= max ? s : null;
}

function sanitizeYear(raw) {
  const s = clean(raw);
  return s.length <= 30 ? s : null;
}

/** Express middleware factory: validates a register number in body/query. */
function validateRegisterNumber(field = 'registerNumber') {
  return (req, res, next) => {
    const value = sanitizeRegisterNumber(req.body[field] || req.query[field]);
    if (!value) {
      return res.status(400).json({
        success: false,
        message: 'Invalid register number (use 4-20 letters/digits/-/_).',
      });
    }
    req[field] = value;
    next();
  };
}

module.exports = {
  clean,
  sanitizeRegisterNumber,
  sanitizeName,
  sanitizeText,
  sanitizeYear,
  validateRegisterNumber,
};
