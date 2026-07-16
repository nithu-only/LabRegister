# MEMORY — Project Memory

> **This is the most important file.** Read it FIRST whenever the project is reopened. Never ask what was being worked on if this file already answers it.

**Project:** Lab Register — Offline-first Computer Lab Student Login & Attendance System
**Last Updated:** 2026-07-15

---

## Current Phase
**Phase 13 (Deployment) — COMPLETE.** All 13 phases are now done and documented. Added a production runbook (`docs/DEPLOY.md`) + a Deployment section in `README.md`, and a `SESSION_SECRET` generation tip in `.env.example`. Verified on a clean machine: `npm install` resolves, `npm start` boots (schema + sync scheduler + backup cron + HTTP listener), `node -v` = v24.16.0 (≥ 22.5), and the 24-test suite passes. **No phases remain — project complete.**

## Files Modified (this session)
- **Phase 9:** `public/js/common.js` (shared `setTheme()`; toggle persists to DB; `loadBrand` applies server theme), `public/js/home.js` (kiosk applies stored theme), `public/js/settings.js` (apply theme from save response), `sync/syncWorker.js` (self-rescheduling loop reads `syncInterval` live), `controllers/settingsController.js` (boundary validation: theme enum + syncInterval 5–3600 + trim/cap), `docs/API.md` (§6.3 400 cases + live effects).
- **SECURE_COOKIE (bug #9):** `config/env.js` (added `SECURE_COOKIE` boolean flag, default `false`), `server.js` (`cookie.secure: env.SECURE_COOKIE`), `.env.example` + `README.md` (documented). Default `false` keeps the offline kiosk working unchanged.
- **Phase 10:** `services/backupService.js` (added `resolveBackupFile()` — centralised path-traversal guard rejecting non-bare filenames + verifying containment; `restoreBackup` now returns 404 for missing + takes a `pre-restore` safety snapshot; `createBackup` returns a bare filename), `controllers/backupController.js` (restore delegates guarding to the service), `routes/backupRoutes.js` (download reuses `resolveBackupFile`, dropped dead `path`/`fs` imports), `docs/API.md` (§7 contract corrected to actual field names `name`/`sizeKb`/`file`).
- **Phase 11:** `services/syncService.js` (`status()` now returns `mongoConfigured` + `mongoConnected`; session upsert mirrors `systemNumber`), `models/mongoModels.js` (`SessionSchema` adds `systemNumber`), `public/js/home.js` (kiosk pill shows "Local Only" when online but Mongo not connected), `docs/API.md` (§8.1/§8.2 corrected to real response).
- **Phase 12 (Testing & Hardening):** `test/models.test.js` (9 unit tests U1–U9: student/session/admin/setting models), `test/integration.test.js` (15 integration/API/edge/validation tests booting the real server on an isolated port + DB), `docs/TESTING.md` (full plan; 24 cases documented + passing), `controllers/studentController.js` (student-list `limit` clamp raised 200 → 500 to satisfy RULES §10 / TESTING E6). `package.json` `test` script already `node --test`.
- **Phase 13 (Deployment):** `README.md` (added Deployment section: prereqs, clean install, `.env` hardening table, run, first-boot checklist, verify), `docs/DEPLOY.md` (new production runbook: requirements, `npm ci`, hardening, systemd/pm2, nginx HTTPS reverse proxy, backup/restore, upgrade), `.env.example` (added `openssl rand -hex 32` secret-generation tip). No application code changed.
- Created `docs/*` (14 files) — STEP 1.
- Edited `config/database.js` — fixed stale `better-sqlite3` header comment; documented Node ≥ 22.5 requirement.
- Edited `package.json` — pinned `engines.node` to `>=22.5.0`.
- Edited `controllers/authController.js` — `me` returns `{id, username}` + 401 message.
- Edited `docs/API.md` — §1.3 `me`; §2.1/§3.1 `403` policy; §2.8 import counts; `allowSelfRegistration`.
- Edited `controllers/sessionController.js` — `allowSelfRegistration` policy gate.
- Edited `models/settingModel.js` — added `allowSelfRegistration` default.
- Edited `routes/studentRoutes.js` — `/register` now returns `success: result.ok`.
- Edited `.env.example` — documented `ALLOW_SELF_REGISTRATION`.
- Edited `models/studentModel.js` — `bulkInsert` returns `{inserted, ignored}`.
- Edited `controllers/studentController.js` — `bulkImport` reports `duplicates` + `skipped`.
- Edited `public/js/students.js` — honest import toast; Register Number disabled on edit.
- Edited `controllers/exportController.js` — CSV export now prepends a UTF-8 BOM (correct Excel rendering of non-ASCII names).
- Edited `public/js/reports.js` — client-side roll-up CSV export prepends a UTF-8 BOM.
- Edited `docs/API.md` — §4.1 attendance response aligned to actual `{range, data}` with `totalVisits`/`totalHours`.
- Edited `public/js/dashboard.js` — charts now theme-aware (axis/legend colours) and re-render on `data-theme` change.

## Completed Features
- Full documentation set (`docs/`) — 14 files, no placeholders.
- **Phase 2 — Database & Models:** schema idempotent (WAL + FK on), 5 indexes, 4 tables, pure data-access models.
- **Phase 3 — Admin Authentication:** bcrypt cost 12, hash never returned, `requireAuth` → 401, bootstrap admin from `.env`.
- **Phase 4 — Kiosk Login / Logout:** auto login/logout + duration; typeahead + Enter-to-submit; toast; policy-gated self-registration.
- **Phase 5 — Student Management:** CRUD (create→409 on dup, get→404 missing); list search/filter/pagination; import with `inserted`/`duplicates`/`skipped`; case-insensitive uniqueness.
- **Phase 6 — Session History & Active Now:** history filters + pagination with correct `total`/`pages`; `resolveRange` presets (today/yesterday/week/month); Live "Active Now" board with per-second duration tick; force-logout (→ `COMPLETED`); Excel/CSV/PDF export honouring the same filters. Verified at runtime: history total=20/today=2; week range = last 7 days; export columns correct; active list includes live session; force-logout completes it.
- **Phase 7 — Reports:** attendance roll-up (`daysPresent`, `totalVisits`, `totalHours`); date-range (presets) + department/year/USN filters; client-side CSV export of the roll-up (BOM). Verified at runtime: response `{range, data}`; roll-up for a 2-day student → daysPresent:2, totalVisits:2, totalHours:"0.50" (only completed sessions contribute hours).
- **Phase 8 — Dashboard & Analytics:** 6 stat cards (total students, inside now, completed sessions, today's visitors, pending sync, cloud connection) + 5 Chart.js charts (daily visitors, department usage, year usage, peak hours, monthly sessions). Charts now re-theme on dark mode (axis/legend colours) via a `data-theme` MutationObserver. Verified at runtime: all 5 chart datasets return correct keys.
- **Phase 9 — Settings:** Runtime branding (university/lab name), editable departments + years lists, `backupLocation` all persisted to the `settings` table (no `.env` edit). **Theme is now DB-backed** — the topbar toggle applies instantly and persists to the server; admin pages and the kiosk apply the stored theme on load (was localStorage-only / always-light on kiosk). **Sync interval is read live** by `syncWorker` (self-rescheduling loop re-reads `syncInterval` each pass, clamped 5–3600s) so a Settings change takes effect without restart. `settingsController.update` validates the boundary: `theme ∈ {light,dark}` and `syncInterval ∈ [5,3600]` return `400`; text/array fields trimmed + capped. Verified at runtime: theme save reflects in `/settings/public`; invalid theme/syncInterval → 400; valid save persists; unauth → 401.
- **Phase 10 — Backup & Restore:** Nightly cron backup at `BACKUP_TIME` (verified scheduled in log), retention prune to `BACKUP_KEEP`, manual backup + list + download + restore. **Path-traversal guard hardened** — `resolveBackupFile()` in `backupService` rejects any non-bare filename (`..`, separators) and verifies the resolved path stays inside `BACKUP_DIR`; reused by both restore and download. `restoreBackup` takes a `pre-restore` safety snapshot first. `createBackup` returns a bare filename. `API.md` §7 corrected to the real response shapes (`name`/`sizeKb`/`file`). Verified at runtime: backup-now returns bare name; valid download → 200 octet-stream; valid restore → 200 (+ pre-restore); `..` and `../etc/passwd` → 400; download traversal → 400; missing → 404.
- **Phase 11 — Cloud Sync (optional):** Background worker pushes `syncStatus=0` sessions (and their students) to MongoDB Atlas, idempotent upsert keyed by `uuid`, then marks them synced. **Online probe before every pass** (`internetService`, 5s cached) and **non-blocking** (fire-and-forget `setTimeout` in `syncWorker`, live interval). Restored the accurate status endpoint: `syncService.status()` now also returns `mongoConfigured` + `mongoConnected` (was missing, breaking the documented contract + the kiosk "Cloud Sync Active" pill); the Mongo `SessionSchema` + upsert now include `systemNumber` so the cloud mirror is complete. `home.js` pill now shows "Local Only" when online but Mongo not connected. `API.md` §8.1/§8.2 corrected to the real response. Verified offline-first at runtime: status returns accurate `pending`/`synced`/`total`/`lastSyncedAt`; `sync/now` degrades gracefully (`error:"mongo-not-connected"`) with no crash; background worker polls without error. (Full Mongo upsert path needs a `MONGODB_URI` to exercise — gated and correct by inspection.)
- **Phase 12 — Testing & Hardening:** Automated `node:test` suite (no extra deps). `test/models.test.js` covers unit cases U1–U9 (create, case-insensitive lookup, `bulkInsert` inserted/ignored counts, session `complete`/`forceComplete`, attendance roll-up `visits`/`daysPresent`, `adminModel.verify` wrong→null / correct→no `passwordHash`, `settingModel.setMany` persist). `test/integration.test.js` boots the real server on an isolated port + `data/test-integration.db` (Mongo disabled) and covers I1/I2 (kiosk transaction), I3/I4 (auth gate 401/200), I5 (backup), A1–A6 (auth/reports/dashboard/sync), E6/E8/E9 (limit clamp, path-traversal, empty search), V3/V4 (409 dup, invalid theme 400). `TESTING.md` documents all 24 cases. **Verified at runtime (Node v24.16.0): `node --test` → 24 pass, 0 fail (~21s); real `data/labregister.db` untouched.**
- **Phase 13 — Deployment:** Production runbook + `.env` hardening guidance (documentation-only — no API changes). `docs/DEPLOY.md` documents clean install (`npm ci`), secret generation, systemd/pm2 process management, an HTTPS `nginx` reverse proxy (with `SECURE_COOKIE=true`), first-boot checklist, backup/restore, and upgrade path. `README.md` gained a Deployment section linking to it; `.env.example` shows how to generate a strong `SESSION_SECRET`. **Verified on a clean machine (Node v24.16.0): `npm install` resolves, `npm start` boots and listens, 24/24 tests pass.**
- The **pre-existing** codebase (settings, backups, sync, services) is already implemented and matches the spec; it is treated as the reference implementation.

## Pending Features
- **None.** All 13 phases (1–13) are complete and documented. Further work is by explicit request only (e.g., future enhancements from PRD §11).

## Known Bugs / Tech Debt
1. ~~`config/database.js` comment stale (said better-sqlite3).~~ **FIXED in Phase 2.**
2. ~~`package.json` `engines` `>=18` wrong for `node:sqlite`.~~ **FIXED in Phase 2 (`>=22.5.0`).**
3. ~~`GET /api/auth/me` doc/impl mismatch.~~ **FIXED in Phase 3.**
4. ~~`/students/register` returned `success:true` even on failure.~~ **FIXED in Phase 4.**
5. ~~Import "skipped" silently hid duplicate USNs.~~ **FIXED in Phase 5.**
6. ~~CSV (sessions) export mis-rendered non-ASCII names (no BOM).~~ **FIXED in Phase 6.**
7. ~~`API.md` §4.1 documented wrong response (`rows`/`visits`/`totalSeconds`); roll-up CSV had no BOM.~~ **FIXED in Phase 7** — `API.md` §4.1 aligned to `{range,data}` with `totalVisits`/`totalHours`; roll-up CSV now has a BOM.
8. ~~Charts did not re-theme on dark mode (unreadable axis/legend text).~~ **FIXED in Phase 8** — `dashboard.js` uses theme-aware axis/legend colours and re-renders on `data-theme` change.
9. ~~`server.js` session cookie always `secure: false`; add `SECURE_COOKIE` env flag when deploying behind TLS.~~ **FIXED** — `config/env.js` adds `SECURE_COOKIE` (boolean, default `false`); `server.js` now sets `cookie.secure: env.SECURE_COOKIE`. Documented in `.env.example` + README. Default stays `false` so the offline kiosk is unchanged; set `true` only behind HTTPS.
10. ~~Theme toggle wrote only to `localStorage` (lost on restart / other browser); kiosk ignored stored theme; sync worker read `syncInterval` only at startup.~~ **FIXED in Phase 9** — theme is DB-backed (persists + applied on kiosk/admin); `syncWorker` reads `syncInterval` live each pass; `settingsController` validates `theme`/`syncInterval` at the boundary.
11. (Open observation, not blocking) The `settings.backupLocation` value (editable in Settings, default `./backups`) is **not** consumed by `backupService` — backups always go to the hard-coded `backups/` dir. Out of scope for Phase 10; flag if wiring it up is wanted.

## Important Decisions
- Stack: Node.js + Express 4 (CommonJS), **built-in `node:sqlite`** (zero native compile), optional MongoDB Atlas mirror.
- No frontend framework; vanilla HTML/CSS/JS + Chart.js.
- Sessions auth via `express-session` (cookie `labregister.sid`, httpOnly, 12h).
- See `Decisions.md` for the dated decision log.

## Libraries Installed (from package.json)
`axios, bcryptjs, body-parser, cors, dotenv, exceljs, express, express-session, mongoose, multer, node-cron, pdfkit, uuid, xlsx` + dev tooling. Node built-ins: `node:sqlite`, `node:crypto` (implied), `fs`, `path`.

## Current Architecture
Single-process Express server. Serves `/api/*` (JSON) and static pages (kiosk + admin SPA). SQLite primary (WAL+FK), MongoDB optional mirror. Background `syncWorker` + `node-cron` backup. See `ARCHITECTURE.md`.

## Current Folder Structure
See `ARCHITECTURE.md` §3. Top level: `server.js`, `config/`, `models/`, `controllers/`, `routes/`, `middleware/`, `services/`, `sync/`, `views/`, `public/`, `scripts/`, `data/`, `backups/`, `logs/`, `docs/`.

## Current API Status
All 8 routers mounted under `/api` (auth, students, sessions, reports, dashboard, settings, backups, sync). Full contract in `API.md`. **Status: documented; not re-verified by tests this session.**

## Current Database Status
4 tables: `students`, `sessions`, `admins`, `settings`. WAL + FK on. 5 indexes. Schema idempotent. Full DDL in `DATABASE.md`. `systemNumber` added via runtime `ALTER TABLE` for legacy DBs.

## Next Task
**All phases complete — project at v1.0.0 scope.** No further phases remain. Await explicit user instruction for any new work (features, hardening, or fixes). On any new task, read `MEMORY.md` + `RULES.md` + `PHASES.md` + `PRD.md`, then implement and update `TASKS.md`/`MEMORY.md`/`CHANGELOG.md`.

## Reminder (from instruction.md)
- Never start coding immediately.
- Never modify completed modules unless explicitly requested.
- Never break APIs; prefer extending over rewriting.
- Always update TASKS/MEMORY/CHANGELOG after a completed task.
