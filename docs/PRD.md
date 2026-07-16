# PRD — Product Requirements Document

**Project:** Lab Register — Offline-first Computer Lab Student Login & Attendance System
**Owner:** Srinivas University — Computer Laboratory
**Version:** 1.0.0 (docs)
**Status:** Specification (STEP 1 of documentation-driven workflow)
**Last Updated:** 2026-07-14

---

## 1. Project Overview

Lab Register is a **kiosk-style, offline-first attendance system** for a university computer laboratory. A student walks up to a shared terminal, types their **Register Number (USN)**, and the system automatically **logs them in** (or **logs them out** if they are already inside). No passwords, no accounts for students — the register number *is* the identity.

An **admin panel** (session-authenticated) lets lab staff manage the student master list, review session history, produce attendance reports, watch a live "who is inside" board, change branding/settings, and back up or restore the local database.

The entire system runs on a **single local SQLite database** with **zero internet dependency**. An optional **MongoDB Atlas** connection pushes session rows to the cloud in the background and never blocks the kiosk.

---

## 2. Problem Statement

- Manual lab sign-in sheets are lost, illegible, and impossible to aggregate.
- Existing online attendance tools fail when the lab network drops — exactly when attendance must still be captured.
- Lab staff need instant answers: *"Who is inside right now?"*, *"How many hours did USN 123 logged this month?"*, *"Export this month's attendance to Excel."*
- Student onboarding (hundreds of USNs) must be bulk-importable, not typed one by one.

---

## 3. Objectives

1. **Capture attendance with a single keystroke** (register number → auto in/out).
2. **Never lose data** — fully functional offline; cloud is best-effort and asynchronous.
3. **Give staff real-time visibility** — live active board + analytics dashboard.
4. **Make data portable** — Excel/CSV import & export, PDF reports, file-based backups.
5. **Stay maintainable** — small, modular Node.js codebase, no build step, no native compile needed.

---

## 4. Target Users

| Role | Description | Needs |
|------|-------------|-------|
| **Student** | Any enrolled lab user | Fast, passwordless check-in/out; see their own status. |
| **Lab Admin / Staff** | The person operating the admin panel | Student CRUD, search/filter, reports, exports, settings, backups. |
| **System (Kiosk)** | The shared terminal at the lab door | 24/7 uptime, auto-login on boot, crash-safe WAL storage. |
| **Cloud (optional)** | MongoDB Atlas | Durable off-site copy of sessions for central aggregation. |

---

## 5. Functional Requirements

### FR-1 — Kiosk Login / Logout
- FR-1.1 A student enters a register number on the home screen.
- FR-1.2 If no open session exists → create a `ACTIVE` session (login).
- FR-1.3 If an open session exists → complete it (logout), compute `duration`.
- FR-1.4 Unknown register number → offer inline "register new student" (admin-configurable) or reject per policy.
- FR-1.5 Show a clear success/error toast and the resulting state.

### FR-2 — Admin Authentication
- FR-2.1 Session-based admin login (`express-session`).
- FR-2.2 Bootstrap admin created from `.env` on first boot if none exists.
- FR-2.3 Admin can change their own password (bcrypt, cost 12).
- FR-2.4 Protected routes reject unauthenticated requests with `401`.

### FR-3 — Student Management
- FR-3.1 List with search, department filter, year filter, pagination.
- FR-3.2 Add / edit / delete a student (`registerNumber`, `name`, `department`, `year`).
- FR-3.3 Bulk import students from Excel/CSV (Multer upload → `exceljs`/`xlsx`).
- FR-3.4 Register-number uniqueness enforced (case-insensitive).

### FR-4 — Session History & Active Now
- FR-4.1 Full session history with multi-field filters (date range, dept, year, status, search) + pagination.
- FR-4.2 **Active Now** live view of `ACTIVE` sessions; admin can force-logout.
- FR-4.3 Export sessions to Excel / CSV / PDF.

### FR-5 — Reports
- FR-5.1 Attendance roll-up: per student — `visits`, `daysPresent`, `totalSeconds`.
- FR-5.2 Filtered by date range / department / year / register number.
- FR-5.3 CSV export of the roll-up.

### FR-6 — Dashboard & Analytics
- FR-6.1 Stat cards: total students, today's visits, currently inside, pending cloud sync.
- FR-6.2 Charts (Chart.js): daily visitors, department usage, year usage, peak hours, monthly trend.

### FR-7 — Settings
- FR-7.1 Runtime-editable: university name, lab name, departments list, years list, sync interval, theme.
- FR-7.2 Persisted to the `settings` table (no `.env` edit required).

### FR-8 — Backup & Restore
- FR-8.1 Nightly automatic SQLite backup via `node-cron` at `BACKUP_TIME`.
- FR-8.2 Manual backup (on demand) + download + restore (file copy over live DB).
- FR-8.3 Retention policy (`BACKUP_KEEP`).

### FR-9 — Cloud Sync (optional)
- FR-9.1 Background worker pushes `syncStatus = 0` sessions to MongoDB when online.
- FR-9.2 Marks rows `syncStatus = 1` with `lastSyncedAt`.
- FR-9.3 Connectivity probe before each attempt; never blocks the kiosk.

---

## 6. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Offline operation | 100% functional with no internet / no Mongo. |
| NFR-2 | Write durability | WAL mode + FK on; every login persisted synchronously. |
| NFR-3 | Startup time | Server ready < 2s on reference hardware. |
| NFR-4 | Responsiveness | Kiosk action (login/logout) acknowledged < 500ms. |
| NFR-5 | Availability | 24/7 kiosk mode; graceful shutdown on SIGINT/SIGTERM. |
| NFR-6 | Security | bcrypt passwords; httpOnly session cookie; no secrets in VCS. |
| NFR-7 | Portability | Single Node process; `npm install && npm start`. |
| NFR-8 | Maintainability | Modular files ≤ 50 lines/fn; no build step. |
| NFR-9 | Accessibility | WCAG-AA contrast; keyboard-operable kiosk input. |
| NFR-10 | Theme | Light & dark, toggle persisted in settings. |

---

## 7. Complete Feature List

1. Kiosk auto login/logout by register number.
2. New-student inline registration (policy-gated).
3. Admin session auth + password change.
4. Student CRUD + search/filter/paginate.
5. Bulk Excel/CSV student import.
6. Session history with filters + pagination.
7. Live "Active Now" board + force-logout.
8. Session export (Excel / CSV / PDF).
9. Attendance reports + CSV export.
10. Dashboard with 5 analytics charts.
11. Runtime settings (branding, depts, years, theme, sync).
12. Nightly + manual backups, download, restore.
13. Optional background MongoDB cloud sync.
14. Light/dark theming + responsive layout.

---

## 8. User Stories

- **US-1** *As a student*, I want to type my register number and be logged in/out instantly, so I don't wait in line.
- **US-2** *As a student*, I want clear feedback (toast) telling me I'm now "Inside" or "Outside".
- **US-3** *As an admin*, I want to search students by name or USN, so I can find anyone fast.
- **US-4** *As an admin*, I want to import 300 students from Excel in one click, so I don't type them.
- **US-5** *As an admin*, I want a live board of who is inside, so I can manage the lab.
- **US-6** *As an admin*, I want to export this month's attendance to CSV, so I can report to HOD.
- **US-7** *As an admin*, I want nightly backups, so I never lose the database.
- **US-8** *As an admin*, I want to change the lab name/theme without editing code.
- **US-9** *As a stakeholder*, I want sessions mirrored to the cloud when online, so central records stay current.

---

## 9. Acceptance Criteria

| Story | Given / When / Then |
|-------|---------------------|
| US-1 | Given a known USN with no open session, when typed, then an `ACTIVE` session is created and toast shows "Logged in". |
| US-1 | Given a known USN with an open session, when typed, then the session is `COMPLETED` with `duration > 0` and toast shows "Logged out". |
| US-3 | Given search term "RAM", when list loads, then only students whose name/USN contains "RAM" (case-insensitive) are returned. |
| US-4 | Given a valid `.xlsx` with 300 rows, when imported, then 300 (or fewer, on duplicate skip) students exist and a count is reported. |
| US-5 | Given 5 active sessions, when Active Now loads, then exactly those 5 appear with force-logout buttons. |
| US-6 | Given date range 2026-06-01..2026-06-30, when CSV exported, then one row per student with visits/daysPresent/seconds. |
| US-7 | Given `BACKUP_TIME=23:55`, then a `.db` backup file appears nightly under `backups/`. |
| US-9 | Given Mongo URI set and online, then within `SYNC_INTERVAL_SECONDS` pending rows become `syncStatus=1`. |

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Lab network down during sync | High | Low | Sync is best-effort; retries; kiosk unaffected. |
| Accidental DB deletion | Low | High | Nightly backups + retention; restore flow. |
| Duplicate/incorrect USN typed | Med | Med | Uniqueness + search-before-register guidance. |
| `node:sqlite` not available on old Node | Med | High | Document Node ≥ 22.5 requirement (see Decisions). |
| Stale `better-sqlite3` comment in `config/database.js` | Low | Low | Fix comment; pin engine in `package.json`. |
| Session cookie theft | Low | Med | `httpOnly`; consider `secure` in prod. |

---

## 11. Future Enhancements

- RFID / barcode badge scan instead of typed USN.
- Multi-kiosk with central SQLite replication.
- Per-student photo capture at login.
- Email/Slack alerts on force-logout or anomalies.
- Role-based admin accounts (lab-incharge vs supervisor).
- Time-bound lab slot booking integrated with attendance.
- Biometric fallback.

---

*This document is the source of truth for phases. Implementation begins only after the user instructs a phase (STEP 2/3 of `instruction.md`).*
