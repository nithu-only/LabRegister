# PHASES — Implementation Roadmap

**Project:** Lab Register
**Last Updated:** 2026-07-15

Phases follow `instruction.md` STEP 3: before implementing a phase, read `MEMORY.md`, `RULES.md`, `PHASES.md`, `PRD.md`. Each phase ends by updating `TASKS.md`, `MEMORY.md`, `CHANGELOG.md`.

> The codebase already contains a working implementation of all phases below. "Implementing" a phase means: bring it to spec per these docs, fix gaps/bugs found, and mark it complete. Phases are executed only when the user explicitly instructs.

---

## Phase 1 — Project Setup & Configuration
- **Objectives:** Repo layout, `package.json`, `.env.example`, config loader, entry point skeleton.
- **Files:** `server.js`, `config/env.js`, `config/database.js`, `config/mongoose.js`, `package.json`.
- **Complexity:** Low.
- **Dependencies:** Node ≥ 22.5, `node:sqlite`.
- **Checklist:**
  - [ ] `package.json` scripts correct; `engines` pinned to ≥22.5.
  - [ ] `.env.example` documents every var.
  - [ ] `config/env.js` loads + validates env.

## Phase 2 — Database & Models
- **Objectives:** SQLite schema, transactional data-access layer, settings defaults.
- **Files:** `config/database.js`, `models/*` (student, session, admin, setting, mongo).
- **Complexity:** Medium.
- **Checklist:**
  - [x] Schema idempotent; WAL + FK on.
  - [x] All indexes present (DATABASE.md §5).
  - [x] Models contain only data access (no business logic).

## Phase 3 — Admin Authentication
- **Objectives:** Session login/logout/me/change-password; bootstrap admin.
- **Files:** `authRoutes.js`, `authController.js`, `adminModel.js`, `middleware/auth.js`.
- **Complexity:** Medium.
- **Checklist:**
  - [x] bcrypt cost 12; hash never returned.
  - [x] `requireAuth` guard returns 401.
  - [x] Bootstrap admin from `.env` on first boot.

## Phase 4 — Kiosk Login / Logout
- **Objectives:** Public register/transaction/logout flow; auto in/out.
- **Files:** `views/index.html`, `public/js/home.js`, `sessionRoutes.js`, `sessionController.js`.
- **Complexity:** Medium.
- **Checklist:**
  - [x] Unknown USN → register flow (policy-gated).
  - [x] Active session → logout with computed duration.
  - [x] Toast feedback; keyboard Enter submits.

## Phase 5 — Student Management
- **Objectives:** CRUD + search/filter + Excel/CSV import.
- **Files:** `studentRoutes.js`, `studentController.js`, `views/admin/students.html`, `public/js/students.js`.
- **Complexity:** Medium.
- **Checklist:**
  - [x] List paginated + filtered.
  - [x] Import bulk-insert with dup-skip; reports count.
  - [x] Register-number uniqueness enforced.

## Phase 6 — Session History & Active Now
- **Objectives:** History filters/pagination, live active board, force-logout, export.
- **Files:** `sessionController.js`, `exportController.js`, `views/admin/sessions.html`, `active.html`, `public/js/*`.
- **Complexity:** Medium-High.
- **Checklist:**
  - [x] Filters + pagination return correct totals.
  - [x] Active board reflects real-time state.
  - [x] Export Excel/CSV/PDF.

## Phase 7 — Reports
- **Objectives:** Attendance roll-up + CSV export.
- **Files:** `reportRoutes.js`, `reportController.js`, `sessionModel.attendance`.
- **Complexity:** Medium.
- **Checklist:**
  - [x] Roll-up correct (visits, daysPresent, totalSeconds).
  - [x] Date-range + filters.

## Phase 8 — Dashboard & Analytics
- **Objectives:** Stat cards + 5 Chart.js charts.
- **Files:** `dashboardRoutes.js`, `dashboardController.js`, `views/admin/dashboard.html`, `public/js/dashboard.js`.
- **Complexity:** Medium.
- **Checklist:**
  - [x] 4 stat cards; 5 charts populated.
  - [x] Charts re-theme on dark mode.

## Phase 9 — Settings
- **Objectives:** Runtime branding/depts/years/theme/sync.
- **Files:** `settingsRoutes.js`, `settingsController.js`, `settingModel.js`, `views/admin/settings.html`.
- **Complexity:** Low-Medium.
- **Checklist:**
  - [x] All settings persisted + read at runtime.
  - [x] Theme toggle works live.

## Phase 10 — Backup & Restore
- **Objectives:** Nightly cron + manual backup + download + restore + retention.
- **Files:** `backupRoutes.js`, `backupController.js`, `services/backupService.js`, `scripts/backup.js`.
- **Complexity:** Medium.
- **Checklist:**
  - [x] Nightly backup scheduled; retention prunes.
  - [x] Restore guarded against path traversal.

## Phase 11 — Cloud Sync (optional)
- **Objectives:** Background worker pushes pending sessions to Mongo.
- **Files:** `sync/syncWorker.js`, `services/syncService.js`, `services/internetService.js`, `mongoModels.js`, `syncRoutes.js`.
- **Complexity:** Medium.
- **Dependencies:** MongoDB Atlas URI (optional).
- **Checklist:**
  - [x] Online probe before sync; non-blocking.
  - [x] Pending rows marked synced; status endpoint accurate.

## Phase 12 — Testing & Hardening
- **Objectives:** Manual + unit + integration + API tests; edge cases.
- **Files:** `docs/TESTING.md`, test scripts.
- **Complexity:** Medium.
- **Checklist:**
  - [x] All TESTING.md cases pass.
  - [x] Fix known bugs (MEMORY.md).

## Phase 13 — Deployment
- **Objectives:** Production runbook; reverse-proxy notes; final verify.
- **Files:** `README.md`, deploy docs.
- **Complexity:** Low.
- **Checklist:**
  - [x] `npm install && npm start` verified on clean machine.
  - [x] `.env` hardened; `SESSION_SECRET` set.
