# Decisions — Architectural Decision Log

Dated record of significant choices. Each entry: Decision / Reason / Status.

---

## 2026-07-13 (pre-existing, from instruction.md template)
- **Decision:** Use JavaFX instead of Electron.
- **Reason:** Smaller executable, lower RAM usage, easier integration with Spring Boot.
- **Status:** Superseded. The actual `LabRegister` implementation is a **Node.js/Express + vanilla web frontend**, not JavaFX/Spring Boot. Recorded here for traceability only; do not follow for new work.

---

## 2026-07-14 — SQLite driver: built-in `node:sqlite`
- **Decision:** Use Node's built-in `node:sqlite` (`DatabaseSync`) instead of the `better-sqlite3` native package.
- **Reason:** Zero native compilation, simpler offline install, single-process kiosk. Synchronous API keeps transaction logic simple.
- **Status:** Accepted. *Caveat:* requires **Node ≥ 22.5**. `package.json` `engines` must be corrected from `>=18` (tracked in MEMORY.md).

## 2026-07-14 — No frontend framework
- **Decision:** Vanilla HTML/CSS/JS for kiosk + admin SPA; Chart.js only for charts.
- **Reason:** Offline-first, no build step, minimal dependencies, easy to maintain on a shared kiosk PC.
- **Status:** Accepted.

## 2026-07-14 — Sessions auth via `express-session` cookie
- **Decision:** Server-side session cookie (`labregister.sid`, httpOnly) for admin auth; students have no accounts (USN is identity).
- **Reason:** Simple, no JWT plumbing for a single-admin kiosk; passwords hashed with bcrypt cost 12.
- **Status:** Accepted.

## 2026-07-14 — MongoDB as optional, one-way mirror
- **Decision:** Cloud sync pushes `sessions` rows to MongoDB Atlas best-effort; never blocks the kiosk.
- **Reason:** Central aggregation without compromising offline-first guarantee.
- **Status:** Accepted.

## 2026-07-14 — Logical (unenforced) FK from sessions → students
- **Decision:** `sessions.registerNumber` is not a declared FK; reports use `LEFT JOIN`.
- **Reason:** Preserves attendance history if a student record is deleted; avoids blocking deletes.
- **Status:** Accepted.

---

*Add new decisions here with the date, decision, reason, and status (Accepted / Rejected / Superseded).*
