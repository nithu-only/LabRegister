/**
 * controllers/settingsController.js
 * -----------------------------------------------------------------------------
 * Runtime configuration (branding, departments, years, sync interval, theme).
 * Persisted in the `settings` table so changes survive restarts without
 * editing .env. Falls back to .env defaults when a key is missing.
 *
 * Boundary validation (RULES.md §10): theme is an enum, syncInterval is clamped,
 * free-text is trimmed/capped. Invalid input throws a 400 before any write.
 * -----------------------------------------------------------------------------
 */
const settingModel = require('../models/settingModel');
const env = require('../config/env');

const TEXT_CAP = { universityName: 120, labName: 120, backupLocation: 200 };

function getAll() {
  return settingModel.getAll();
}

/** Persist admin-edited settings. Validates the boundary then sanitises. */
function update(req) {
  const map = {};
  const body = req.body || {};

  // theme — enum only (RULES §10).
  if (body.theme !== undefined) {
    if (body.theme !== 'light' && body.theme !== 'dark') {
      const e = new Error('theme must be "light" or "dark"');
      e.status = 400;
      throw e;
    }
    map.theme = body.theme;
  }

  // syncInterval — integer 5..3600 (RULES §10).
  if (body.syncInterval !== undefined) {
    const n = parseInt(body.syncInterval, 10);
    if (!Number.isFinite(n) || n < 5 || n > 3600) {
      const e = new Error('syncInterval must be an integer between 5 and 3600');
      e.status = 400;
      throw e;
    }
    map.syncInterval = String(n);
  }

  // Free-text fields — trim + length cap.
  for (const k of ['universityName', 'labName', 'backupLocation']) {
    if (body[k] !== undefined) {
      map[k] = typeof body[k] === 'string' ? body[k].trim().slice(0, TEXT_CAP[k]) : body[k];
    }
  }

  // Arrays — coerce to trimmed string list, filter empties, cap entries.
  if (Array.isArray(body.departments)) {
    const depts = body.departments.map((d) => String(d).trim()).filter(Boolean).slice(0, 50);
    map.departments = JSON.stringify(depts);
  }
  if (Array.isArray(body.years)) {
    const yrs = body.years.map((d) => String(d).trim()).filter(Boolean).slice(0, 50);
    map.years = JSON.stringify(yrs);
  }

  settingModel.setMany(map);
  return settingModel.getAll();
}

/** Convenience endpoint used by the Home screen to render branding. */
function publicBranding() {
  const s = settingModel.getAll();
  return {
    universityName: s.universityName,
    labName: s.labName,
    theme: s.theme,
    departments: JSON.parse(s.departments || '[]'),
    years: JSON.parse(s.years || '[]'),
  };
}

module.exports = { getAll, update, publicBranding };
