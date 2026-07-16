# Lab Register — Documentation Index

**Offline-first Computer Lab Student Login & Attendance System**
Srinivas University — Computer Laboratory

This `docs/` folder is the **single source of truth** for the project, per `instruction.md`.

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [PRD.md](./PRD.md) | Product requirements: overview, features, user stories, acceptance criteria. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System, folder, module, data, API, auth, sync, error, logging architecture + sequence diagrams. |
| [DATABASE.md](./DATABASE.md) | ER diagram, tables, columns, indexes, constraints, DDL, normalization. |
| [API.md](./API.md) | Every REST endpoint: method, request, response, validation, status codes, examples. |
| [RULES.md](./RULES.md) | Coding standards, naming, allowed/forbidden libraries, security, performance, UI rules. |
| [DESIGN.md](./DESIGN.md) | Color tokens, typography, spacing, components, dark theme, responsive, a11y. |
| [PHASES.md](./PHASES.md) | 13-phase roadmap with objectives, files, complexity, checklists. |
| [TASKS.md](./TASKS.md) | Master task checklist (auto-updated per task). |
| [TESTING.md](./TESTING.md) | Manual / unit / integration / API / edge / validation test plan. |
| [MEMORY.md](./MEMORY.md) | **Project memory — read first on reopen.** Phase, status, known bugs, decisions. |
| [CHANGELOG.md](./CHANGELOG.md) | Dated log of completed work. |
| [Decisions.md](./Decisions.md) | Architectural decision log. |
| [AI_Instructions.md](./AI_Instructions.md) | Operating rules for the AI assistant on this project. |

---

## What this project is

A kiosk-style attendance system: a student types their **Register Number (USN)** at a shared terminal; the system auto **logs them in** or **out**. An admin panel manages students, reviews history, runs reports, shows a live "who's inside" board, and backs up the database. Everything runs on a local **SQLite** database with **no internet required**; an optional **MongoDB Atlas** mirror syncs in the background.

## Workflow (from instruction.md)

1. **STEP 1** — Documentation first (this `docs/` set). ✅ Done.
2. **STEP 2** — Wait. No code until instructed. ⏳ Current state.
3. **STEP 3** — To implement a phase: read `MEMORY.md` + `RULES.md` + `PHASES.md` + `PRD.md`, then code, then update `TASKS.md` / `MEMORY.md` / `CHANGELOG.md`.

## Tech Stack (summary)
- **Backend:** Node.js ≥ 22.5, Express 4 (CommonJS), built-in `node:sqlite`, `express-session`, `bcryptjs`.
- **Frontend:** Vanilla HTML/CSS/JS + Chart.js (no framework, offline-safe).
- **Optional cloud:** MongoDB Atlas via `mongoose` + `axios` (background, non-blocking).
- **Exports:** `exceljs` / `xlsx` (Excel/CSV), `pdfkit` (PDF).
- **Scheduling:** `node-cron` (nightly backup).

See the root `../README.md` for run instructions (install, env, scripts, URLs).

## Current Status
- Documentation: **complete** (14 files).
- Implementation: **pre-existing codebase present and matching spec**; pending per-phase verification/fixes on user instruction.
- Known bugs: see `MEMORY.md`.
