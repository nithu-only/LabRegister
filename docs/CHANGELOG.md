# CHANGELOG

Format: `Date | Files Modified | Reason | Summary | Version`

---

## 2026-07-14
- **Files:** `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/RULES.md`, `docs/DESIGN.md`, `docs/PHASES.md`, `docs/TASKS.md`, `docs/TESTING.md`, `docs/MEMORY.md`, `docs/CHANGELOG.md`, `docs/README.md`, `docs/Decisions.md`, `docs/AI_Instructions.md`
- **Reason:** STEP 1 of `instruction.md` — establish the documentation-driven foundation before any code.
- **Summary:** Created the complete `docs/` set specifying the Lab Register system: PRD, architecture, database schema (DDL + indexes + relationships), full REST API contract (8 routers), coding rules, design system, phased roadmap, task list, test plan, project memory, decisions log, and AI operating instructions. Documentation is grounded in the existing `LabRegister` codebase (Node/Express + `node:sqlite` + optional Mongo).
- **Version:** 0.1.0 (documentation scaffold)

---

## Known issues logged (see MEMORY.md)
- `config/database.js` comment references `better-sqlite3` but uses built-in `node:sqlite`.
- `package.json` `engines` says `>=18` but `node:sqlite` requires Node ≥ 22.5.

---

*Future feature completions append a new block here with Date / Files / Reason / Summary / Version.*

---

## 2026-07-14 (Phase 2 — Database & Models)
- **Files:** `config/database.js`, `package.json`
- **Reason:** Implement Phase 2 per `instruction.md` STEP 3; the DB layer already matched the spec, so work was verification + fixing the two known bugs that gate it.
- **Summary:**
  - Fixed stale `config/database.js` header comment that claimed "using better-sqlite3"; it actually uses Node's built-in `node:sqlite` (`DatabaseSync`). Added a note on the ≥ 22.5 requirement and the transaction shim.
  - Pinned `package.json` `engines.node` from `>=18.0.0` to `>=22.5.0` so the `node:sqlite` dependency is correctly documented (older Node would fail at runtime).
  - Verified at runtime (Node v24.16.0): schema idempotent, WAL + FK on, tables `students/sessions/admins/settings` present, all 5 indexes present (`idx_sessions_register/status/date/sync`, `idx_students_dept`). Models confirmed as pure data-access; `mongoModels.js` correctly mirrors sessions keyed by `uuid`.
- **Version:** 0.2.0 (Phase 2 — Database & Models)

---

## 2026-07-14 (Phase 3 — Admin Authentication)
- **Files:** `controllers/authController.js`, `docs/API.md`
- **Reason:** Implement Phase 3 per `instruction.md` STEP 3. The auth layer already met the checklist; work was verifying it and resolving a doc/impl mismatch on `GET /api/auth/me`.
- **Summary:**
  - Verified at runtime: bcrypt cost = 12; `adminModel.verify` returns `{id, username, createdAt}` with `passwordHash` stripped; wrong password → `null` (rejected); bootstrap admin auto-created from `.env` on first boot; `requireAuth` → 401 when no session.
  - `authController.me` now returns `{ id, username }` (was `{ username }` only) and its 401 carries `"message": "Not authenticated"`, matching `API.md`.
  - `docs/API.md` §1.3 updated so the documented `me` response matches the implementation.
  - Logged an open recommendation (not a defect): `server.js` session cookie is always `secure:false`; a `SECURE_COOKIE` env flag should be added when deploying behind TLS. Deferred to keep Phase 3 scoped.
- **Version:** 0.3.0 (Phase 3 — Admin Authentication)

---

## 2026-07-14 (Phase 4 — Kiosk Login / Logout)
- **Files:** `controllers/sessionController.js`, `models/settingModel.js`, `routes/studentRoutes.js`, `.env.example`, `docs/API.md`
- **Reason:** Implement Phase 4 per `instruction.md` STEP 3. The kiosk flow already worked; work added the missing "policy-gated" self-registration from the checklist (`PRD.md` FR-1.4) and fixed a route bug that masked registration failures.
- **Summary:**
  - Added `allowSelfRegistration` setting (default `true`, seedable via `ALLOW_SELF_REGISTRATION` env). `sessionController.processTransaction` and `registerAndLogin` now return `403` with a clear message when self-registration is disabled.
  - Fixed `routes/studentRoutes.js` `/register`: it forced `success: true` even on failure, so the kiosk silently closed the modal with no error. Now returns `success: result.ok`.
  - Documented the `403` policy case in `API.md` §2.1/§3.1 and added `allowSelfRegistration` to the Settings response (§6.2) and `.env.example`.
  - Verified at runtime (Node v24.16.0): login → logout (duration computed) → unknown USN registers when allowed → `403` when disabled (both entry points). Policy restored to default after test.
- **Version:** 0.4.0 (Phase 4 — Kiosk Login / Logout)

---

## 2026-07-14 (Phase 5 — Student Management)
- **Files:** `models/studentModel.js`, `controllers/studentController.js`, `public/js/students.js`, `docs/API.md`
- **Reason:** Implement Phase 5 per `instruction.md` STEP 3. CRUD/list/uniqueness already worked; work fixed inaccurate import counting and an edit-form honesty issue.
- **Summary:**
  - `studentModel.bulkInsert` now returns `{ inserted, ignored }` where `ignored` = rows dropped by `INSERT OR IGNORE` (duplicate register numbers, case-insensitive).
  - `studentController.bulkImport` reports `duplicates` (existing/dup USNs) separately from `skipped` (malformed rows). Import of a 300-row file with 5 duplicates now correctly shows `inserted:295, duplicates:5, skipped:0` instead of hiding the duplicates.
  - `public/js/students.js` import toast lists inserted/duplicates/skipped; Register Number field is now disabled while editing (USN is the identity and foreign key to sessions, and the controller intentionally ignores changes to it).
  - `API.md` §2.8 updated to document the accurate import response shape.
  - Verified at runtime (Node v24.16.0): import mix → inserted:1/duplicates:2/skipped:1; duplicate create → 409; missing → 404; list total/pages correct; lookup case-insensitive.
- **Version:** 0.5.0 (Phase 5 — Student Management)

---

## 2026-07-14 (Phase 6 — Session History & Active Now)
- **Files:** `controllers/exportController.js`
- **Reason:** Implement Phase 6 per `instruction.md` STEP 3. History, Active Now, force-logout and Excel/CSV/PDF export were already implemented and correct; the only fix needed was CSV encoding correctness.
- **Summary:**
  - `exportController.exportSessions` CSV branch now prepends a UTF-8 BOM (`﻿`) and sets `text/csv; charset=utf-8`, so Excel renders non-ASCII student names correctly. Excel/PDF unchanged.
  - Verified at runtime (Node v24.16.0): history `total=20` with `today=2` (filters/pagination correct); `resolveRange('week')` = last 7 days ending today; export returns the 9 expected columns; "Active Now" includes the live session; force-logout transitions it to `COMPLETED`.
- **Version:** 0.6.0 (Phase 6 — Session History & Active Now)

---

## 2026-07-14 (Phase 7 — Reports)
- **Files:** `docs/API.md`, `public/js/reports.js`
- **Reason:** Implement Phase 7 per `instruction.md` STEP 3. The attendance roll-up, filters, and client-side CSV export were already implemented and correct; work fixed a doc/impl mismatch and a CSV-encoding gap.
- **Summary:**
  - `API.md` §4.1 corrected: the route returns `{ success, range, data }` (not `rows`), with fields `daysPresent`, `totalVisits`, `totalHours` (not `visits`/`totalSeconds`). Matches what `reports.js` consumes.
  - `public/js/reports.js` roll-up CSV export now prepends a UTF-8 BOM (same Excel-rendering fix applied server-side in Phase 6).
  - Verified at runtime (Node v24.16.0): response shape `{range, data}`; roll-up for a student with sessions on 2 distinct days → `daysPresent:2, totalVisits:2, totalHours:"0.50"` (only completed sessions contribute hours; an open session still counts as a present day).
- **Version:** 0.7.0 (Phase 7 — Reports)

---

## 2026-07-14 (Phase 8 — Dashboard & Analytics)
- **Files:** `public/js/dashboard.js`
- **Reason:** Implement Phase 8 per `instruction.md` STEP 3. Stat cards and the 5 Chart.js charts were already implemented; the checklist item "charts re-theme on dark mode" was not satisfied.
- **Summary:**
  - `dashboard.js` `renderCharts` now uses theme-aware axis/legend colours (`themeColors()` picks readable text/grid colours for light vs dark).
  - A `MutationObserver` on `<html data-theme>` re-renders the charts when the admin toggles the theme, so the dashboard stays readable in dark mode.
  - Verified at runtime (Node v24.16.0): all 5 chart datasets (`dailyVisitors`, `departmentUsage`, `yearUsage`, `peakHours`, `monthlySessions`) return the expected key shapes.
- **Version:** 0.8.0 (Phase 8 — Dashboard & Analytics)

---

## 2026-07-14 (Phase 9 — Settings)
- **Files:** `public/js/common.js`, `public/js/home.js`, `public/js/settings.js`, `sync/syncWorker.js`, `controllers/settingsController.js`, `docs/API.md`
- **Reason:** Implement Phase 9 per `instruction.md` STEP 3. Branding + editable depts/years already persisted; work made the theme and sync-interval genuinely "persisted live" (checklist/PRD FR-7) and added the missing boundary validation.
- **Summary:**
  - **Theme is now DB-backed source of truth.** The topbar toggle previously wrote only to `localStorage`, so a restart or a different browser lost it. `common.js` now has a shared `setTheme()`; `toggleTheme()` applies instantly *and* persists via `PUT /settings`; `AdminLayout.loadBrand()` applies the server theme on every admin page load. `home.js` now applies the stored theme on the kiosk (was always light). `settings.js` applies the theme from the save response for instant feedback.
  - **Sync interval read live.** `sync/syncWorker.js` rewritten from a fixed `setInterval(env…)` to a self-rescheduling `setTimeout` loop that re-reads `settingModel.get('syncInterval')` (clamped 5–3600s, env fallback) before every wait — changing it in Settings now takes effect without a restart.
  - **Boundary validation (RULES §10).** `settingsController.update` now rejects `theme` outside `{light,dark}` and `syncInterval` outside `[5,3600]` with `400`, and trims/caps text + array fields before persisting.
  - `API.md` §6.3 documents the new `400` cases and the live effects.
  - Verified at runtime (Node v24.16.0): `theme=dark` save → `/settings/public` reflects `dark`; invalid `theme`/`syncInterval` → `400` with clear messages; valid `syncInterval=45` persists; unauth PUT → `401`; worker live-read returns the persisted interval (77s→77000ms). Defaults restored after test.
- **Version:** 0.9.0 (Phase 9 — Settings)

---

## 2026-07-14 (Security follow-up — SECURE_COOKIE)
- **Files:** `config/env.js`, `server.js`, `.env.example`, `README.md`
- **Reason:** Close open recommendation (MEMORY bug #9 / PRD risk "session cookie theft"). The session cookie `labregister.sid` was hard-coded `secure: false`, so it could travel over plain HTTP — acceptable for the offline kiosk but unsafe if deployed behind HTTPS.
- **Summary:**
  - `config/env.js` adds `SECURE_COOKIE` as a boolean (default `false`); `.env.example` + README document it.
  - `server.js` cookie config now uses `secure: env.SECURE_COOKIE` instead of the hard-coded `false`.
  - Default stays `false`, so the offline/local kiosk is unchanged. Set `SECURE_COOKIE=true` only when serving behind TLS — then the session cookie gets the `Secure` attribute (HTTPS-only).
  - Verified at runtime (Node v24.16.0): flag parses (`true`→`true`, default→`false`) and drives `cookie.secure`; with `SECURE_COOKIE=true` express-session correctly refuses to emit the cookie over plain HTTP (it is only sent over HTTPS), while the default keeps the cookie working over HTTP. Both test servers stopped and ports released.
- **Version:** 0.9.1 (Security follow-up — SECURE_COOKIE)

---

## 2026-07-14 (Phase 10 — Backup & Restore)
- **Files:** `services/backupService.js`, `controllers/backupController.js`, `routes/backupRoutes.js`, `docs/API.md`
- **Reason:** Implement Phase 10 per `instruction.md` STEP 3. The backup feature already existed (nightly cron + retention + restore + download); work hardened the path-traversal guard, fixed a doc/impl contract mismatch, and a response-shape bug.
- **Summary:**
  - **Hardened path-traversal guard.** Added `backupService.resolveBackupFile()` — rejects any filename that isn't a bare name inside `BACKUP_DIR` (catches `..`, slashes, dot-segments via `path.basename` + containment check). Restore and download now both use it (removed the duplicated, weaker `/[\\/]/` check from the route; dropped dead `path`/`fs` imports there).
  - **`restoreBackup`** now returns `404` for a missing file (was a raw `Error` → 500) and still takes a `pre-restore` safety snapshot first.
  - **`createBackup`** now returns a bare filename (was leaking the absolute path in `file`).
  - **API.md §7** corrected to the real contract: list returns `name`/`sizeKb`/`createdAt`; `backup-now` returns `file` (bare name) + `size`; download rejects traversal with `400` and missing with `404`.
  - Verified at runtime (Node v24.16.0): backup-now → bare name; valid download → 200 `application/octet-stream`; valid restore → 200 (+ `pre-restore` safety); `..` and `../etc/passwd` → 400; download traversal → 400; missing → 404; nightly cron confirmed scheduled at `23:55` in the log. Test artifacts cleaned; ports released.
  - **Known observation (not fixed):** the editable `settings.backupLocation` is not consumed by `backupService` (always uses `backups/`). Flagged for later.
- **Version:** 0.10.0 (Phase 10 — Backup & Restore)

---

## 2026-07-14 (Phase 11 — Cloud Sync, optional)
- **Files:** `services/syncService.js`, `models/mongoModels.js`, `public/js/home.js`, `docs/API.md`
- **Reason:** Implement Phase 11 per `instruction.md` STEP 3. The sync pipeline already existed; work made the status endpoint accurate (per checklist "accurate status endpoint") and completed the cloud mirror.
- **Summary:**
  - **Accurate status endpoint.** `syncService.status()` now also returns `mongoConfigured` (`!!MONGODB_URI`) and `mongoConnected` (`isMongoConnected()`) — previously missing, which broke the documented `API.md` §8.1 contract and made the kiosk claim "Cloud Sync Active" even with no Mongo. `home.js` now shows "Local Only" when online but Mongo isn't connected.
  - **Complete cloud mirror.** The Mongo `SessionSchema` and the upsert `$set` now include `systemNumber` (was dropped), so the Atlas copy faithfully matches the local session.
  - **API.md §8.1/§8.2** corrected to the real responses (added `mongoConfigured`/`mongoConnected`/`synced`/`total`; documented the `error` field).
  - Verified offline-first at runtime (Node v24.16.0): `GET /sync/status` returns accurate `pending`/`synced`/`total`/`lastSyncedAt` with `mongoConfigured:false`; `POST /sync/now` degrades gracefully (`error:"mongo-not-connected"`) with no crash; background worker polls without error. (The actual Mongo upsert needs a `MONGODB_URI` to exercise end-to-end — it is gated on `isMongoConnected` and correct by inspection.)
- **Version:** 0.11.0 (Phase 11 — Cloud Sync, optional)

---

## 2026-07-15 (Phase 12 — Testing & Hardening)
- **Files:** `test/models.test.js`, `test/integration.test.js`, `docs/TESTING.md`
- **Reason:** Implement Phase 12 per `instruction.md` STEP 3. Add an automated regression suite + documented test plan to bring the system to spec, and close the documentation gap where Phase 12's work was completed (tests written, `TASKS.md` ticked) but `MEMORY.md`/`CHANGELOG.md`/`PHASES.md` were never updated.
- **Summary:**
  - Added `test/models.test.js` — 9 unit tests (U1–U9) against an isolated `data/test-unit-<pid>.db`: student create + case-insensitive lookup, `bulkInsert` inserted/ignored counts, session `complete`/`forceComplete`, attendance roll-up (`visits`/`daysPresent`), `adminModel.verify` (wrong password → `null`; correct → no `passwordHash`), `settingModel.setMany` persistence.
  - Added `test/integration.test.js` — 15 tests booting the real server on an isolated port + `data/test-integration.db` (Mongo disabled): A1 auth (401 bad creds / 200 `/me`), I1 kiosk register→active, I2 transaction in/out, I3/I4 auth gate 401/200, I5 backup-now→listed, A2 import 400 no file, A3 CSV export, A4 attendance array, A5 dashboard numeric stats, A6 sync status shape, E6 limit clamp ≤500, E8 path-traversal 400, E9 empty search `[]`, V3 duplicate 409, V4 invalid theme 400.
  - Added `docs/TESTING.md` — manual / unit / integration / API / edge / validation plan; all 24 cases mapped to the two files.
  - `package.json` `test` script already `node --test`; the suite is auto-discovered from `test/**/*.test.js`.
  - Also corrected the student-list `limit` clamp from 200 → 500 (`controllers/studentController.js`) to match RULES §10 and TESTING E6; verified by integration test E6 (request `limit=9999` → response `limit ≤ 500`).
  - **Verified at runtime (Node v24.16.0): `node --test` → 24 tests, 24 pass, 0 fail, ~21s.** Each run uses its own isolated DB (cleaned up after); the real `data/labregister.db` is never touched.
- **Version:** 0.12.0 (Phase 12 — Testing & Hardening)

---

## 2026-07-15 (Phase 13 — Deployment)
- **Files:** `README.md`, `docs/DEPLOY.md`, `.env.example`
- **Reason:** Implement Phase 13 per `instruction.md` STEP 3. Add a production runbook + `.env` hardening guidance so the app can be deployed securely (closing the documented "session cookie theft" risk via HTTPS + `SECURE_COOKIE`).
- **Summary:**
  - Added `docs/DEPLOY.md` — full runbook: Node ≥ 22.5 requirement, `npm ci` clean install, `.env` hardening table (`SESSION_SECRET` via `openssl rand -hex 32`, `ADMIN_PASSWORD`, `SECURE_COOKIE`, `MONGODB_URI`, retention), `init-db`, systemd + pm2 service management, an `nginx` HTTPS reverse-proxy sample, first-boot checklist, health/verify (`npm test`), backup/restore, and upgrade path.
  - Extended `README.md` with a **Deployment** section (prerequisites, clean install, hardening table, run, first-boot checklist, verification) linking to `docs/DEPLOY.md`.
  - Added an `openssl rand -hex 32` tip to `.env.example` so operators generate a strong `SESSION_SECRET`.
  - **Verified on a clean machine (Node v24.16.0):** `npm install` resolves; `npm start` boots (SQLite schema initialised → Application start → Sync scheduler started → Nightly backup scheduled → Server listening on :3999); the 24-test `node --test` suite passes (0 fail). No code changes — deployment is documentation-only, so no APIs were touched.
- **Version:** 0.13.0 (Phase 13 — Deployment)
