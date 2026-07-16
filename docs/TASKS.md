# TASKS — Master Task List

**Project:** Lab Register
**Last Updated:** 2026-07-15 (Phase 13 complete)
**Rule:** When a task completes, check its box and update `MEMORY.md` + `CHANGELOG.md`.

> Per `instruction.md` STEP 2, **no code tasks are started until the user instructs a phase.** This list is the backlog.

---

## Phase 1 — Project Setup & Configuration
- [ ] Pin `package.json` `engines` to Node ≥ 22.5 (fix stale `>=18`)
- [ ] Verify `.env.example` documents every variable
- [ ] Confirm `config/env.js` loads + validates env

## Phase 2 — Database & Models
- [x] Verify schema idempotent with WAL + FK on
- [x] Confirm all 5 indexes present
- [x] Ensure models contain only data access

## Phase 3 — Admin Authentication
- [x] bcrypt cost 12; hash never returned to client
- [x] `requireAuth` returns 401 when unauthenticated
- [x] Bootstrap admin created from `.env` on first boot

## Phase 4 — Kiosk Login / Logout
- [x] Unknown USN → register flow (policy-gated)
- [x] Active session → logout with computed duration
- [x] Toast feedback + Enter-to-submit on kiosk

## Phase 5 — Student Management
- [x] List paginated + filtered (search/dept/year)
- [x] Excel/CSV bulk import with duplicate-skip
- [x] Register-number uniqueness enforced (case-insensitive)

## Phase 6 — Session History & Active Now
- [x] History filters + pagination return correct totals
- [x] Live "Active Now" board
- [x] Force-logout admin action
- [x] Export sessions to Excel / CSV / PDF

## Phase 7 — Reports
- [x] Attendance roll-up (visits / daysPresent / hours)
- [x] Date-range + department/year/USN filters
- [x] CSV export of roll-up

## Phase 8 — Dashboard & Analytics
- [x] 4 stat cards (students / today / inside / pending sync)
- [x] 5 Chart.js charts (daily, dept, year, peak hours, monthly)
- [x] Charts re-theme on dark mode

## Phase 9 — Settings
- [x] Runtime branding (university/lab name)
- [x] Departments + years editable lists
- [x] Sync interval + theme toggle persisted live

## Phase 10 — Backup & Restore
- [x] Nightly cron backup at `BACKUP_TIME`
- [x] Retention prune to `BACKUP_KEEP`
- [x] Manual backup + download + restore
- [x] Path-traversal guard on restore/download

## Phase 11 — Cloud Sync (optional)
- [x] Background worker pushes pending sessions to Mongo
- [x] Online probe before sync; non-blocking
- [x] Mark synced + accurate status endpoint

## Phase 12 — Testing & Hardening
- [x] Manual test pass (TESTING.md)
- [x] Unit tests for models (student/session/admin/setting)
- [x] Integration/API tests per endpoint
- [x] Edge + validation cases
- [x] Fix known bugs from MEMORY.md

## Phase 13 — Deployment
- [x] Clean-machine `npm install && npm start` verified
- [x] `.env` hardened (SESSION_SECRET, ADMIN_PASSWORD)
- [x] Deploy runbook in README

## Documentation (STEP 1 — COMPLETE)
- [x] PRD.md
- [x] ARCHITECTURE.md
- [x] DATABASE.md
- [x] API.md
- [x] RULES.md
- [x] DESIGN.md
- [x] PHASES.md
- [x] TASKS.md
- [x] TESTING.md
- [x] MEMORY.md
- [x] CHANGELOG.md
- [x] README.md
- [x] Decisions.md
- [x] AI_Instructions.md
