# ARCHITECTURE — System Architecture

**Project:** Lab Register
**Version:** 1.0.0 (docs)
**Last Updated:** 2026-07-14

---

## 1. System Architecture

Lab Register is a **single-process Node.js (Express)** application that serves both the REST API (`/api`) and the static frontend (kiosk + admin SPA). Persistence is **SQLite** (built-in `node:sqlite`) as the primary store; **MongoDB Atlas** is an optional, asynchronous cloud mirror.

```
                ┌─────────────────────────────────────────┐
                │            Browser (Kiosk / Admin)        │
                │   HTML + CSS + vanilla JS + Chart.js      │
                └───────────────┬───────────────┬──────────┘
                                │  GET /         │  GET /admin/*
                                │  fetch /api/*  │
                                ▼                ▼
                ┌─────────────────────────────────────────┐
                │              Express Server               │
                │  middleware: cors, bodyParser, session,   │
                │  auth, validate, errorHandler             │
                │  routers: auth, students, sessions,        │
                │  reports, dashboard, settings, backups,    │
                │  sync                                       │
                └───┬───────────┬────────────┬──────────────┘
                    │           │            │
              controllers   services      models
                    │           │            │
                    │     backupService  studentModel
                    │     syncService    sessionModel
                    │     logService     adminModel
                    │     internetService settingModel
                    ▼           ▼            ▼
            ┌────────────┐  ┌──────────┐  ┌──────────────┐
            │  SQLite     │  │  MongoDB │  │  File system  │
            │ (node:sqlite)│ │ (Atlas,  │  │ backups/,     │
            │  WAL + FK    │  │ optional)│  │ logs/         │
            └────────────┘  └──────────┘  └──────────────┘
                    ▲
                    │ background worker (syncWorker, every SYNC_INTERVAL_SECONDS)
                    │ node-cron nightly backup at BACKUP_TIME
```

---

## 2. Application Flow

1. `server.js` boots: load `config/env`, open SQLite (`config/database`), connect Mongo (optional, non-blocking), ensure bootstrap admin, start `syncWorker`, schedule nightly backup, `app.listen`.
2. Browser requests a page → `express.static` / page-route map sends the HTML file.
3. Frontend JS calls `/api/*`; Express middleware resolves session, validates, routes to controller.
4. Controller calls a **model** (pure data access) and returns JSON.
5. Writes are synchronous & transactional (WAL) so the kiosk never loses a tap.

---

## 3. Folder Structure

```
LabRegister/
├── server.js                 # Entry point (Express + cron + sync)
├── config/
│   ├── env.js                # Loads + validates .env
│   ├── database.js           # node:sqlite connection + schema
│   └── mongoose.js           # Optional MongoDB connection
├── models/                   # Pure data-access layer (SQLite + Mongo schemas)
│   ├── studentModel.js
│   ├── sessionModel.js
│   ├── adminModel.js
│   ├── settingModel.js
│   └── mongoModels.js
├── controllers/              # Request handlers (business logic)
│   ├── authController.js
│   ├── studentController.js
│   ├── sessionController.js
│   ├── reportController.js
│   ├── dashboardController.js
│   ├── settingsController.js
│   ├── backupController.js
│   └── exportController.js
├── routes/                   # Express routers (mounted under /api)
│   ├── index.js
│   ├── authRoutes.js
│   ├── studentRoutes.js
│   ├── sessionRoutes.js
│   ├── reportRoutes.js
│   ├── dashboardRoutes.js
│   ├── settingsRoutes.js
│   ├── backupRoutes.js
│   └── syncRoutes.js
├── middleware/
│   ├── auth.js               # requireAdmin session guard
│   ├── validate.js           # Request body/param validation
│   └── errorHandler.js       # Central error → JSON
├── services/                 # Cross-cutting logic
│   ├── logService.js
│   ├── internetService.js
│   ├── syncService.js
│   └── backupService.js
├── sync/
│   └── syncWorker.js         # Background cloud-sync loop
├── views/                    # HTML pages
│   ├── index.html            # Kiosk home
│   └── admin/                # login, dashboard, students, sessions,
│                             #   reports, active, settings, backup
├── public/
│   ├── css/                  # style.css, admin.css, auth.css
│   └── js/                   # home, auth, dashboard, students, sessions,
│                             #   reports, active, settings, backup, common
├── scripts/                  # initDb.js, seed.js, backup.js (CLI)
├── data/                     # SQLite DB (gitignored)
├── backups/                  # Nightly backups (gitignored)
├── logs/                     # Daily JSON logs (gitignored)
└── docs/                     # This documentation set
```

---

## 4. Class / Module Structure

The codebase is **functional/modular** (CommonJS), not class-based. Each module is a singleton object exposing small functions.

| Module | Responsibility | Public surface |
|--------|----------------|---------------|
| `studentModel` | CRUD + search + bulk insert | `create, findById, findByRegisterNumber, list, count, publicSearch, update, remove, bulkInsert` |
| `sessionModel` | Session lifecycle + analytics queries | `create, findByUuid, findActive, complete, forceComplete, list, activeList, pendingSync, markSynced, dailyVisitors, departmentUsage, ...` |
| `adminModel` | Admin auth + password | `ensureBootstrapAdmin, findByUsername, verify, updatePassword` |
| `settingModel` | Key/value settings | `get, getAll, set, setMany` with `DEFAULTS` |
| `syncService` | Push pending rows to Mongo | `syncPending()` |
| `backupService` | File-copy DB backups | `createBackup(), listBackups(), restore()` |
| `internetService` | Connectivity probe | `isOnline()` |
| `logService` | Structured logging | `writeLog(level, msg, meta)` |

---

## 5. Backend Structure

- **Framework:** Express 4 (CommonJS). No build step.
- **Runtime:** Node.js ≥ 22.5 (requires built-in `node:sqlite`). *Note: `package.json` currently says `>=18` — must be corrected (see Decisions.md / MEMORY.md).*
- **Auth:** `express-session` cookie (`labregister.sid`, httpOnly, 12h).
- **Validation:** `middleware/validate.js` (lightweight, no Joi).
- **Error handling:** central `errorHandler` returns `{ success:false, message }`.

---

## 6. Frontend Structure

- **No framework.** Server-rendered static HTML; each admin page has a paired `public/js/*.js` module and shared `public/js/common.js`.
- **Charts:** Chart.js (CDN or local) on the dashboard.
- **State:** session cookie; admin pages guard via `/api/auth/me`.
- **Theme:** `light`/`dark` toggled via a `data-theme` attribute + `settings` table.

---

## 7. Database Communication

- `config/database.js` opens `node:sqlite` `DatabaseSync`, sets `PRAGMA journal_mode=WAL` and `PRAGMA foreign_keys=ON`, and runs an **idempotent** `initSchema()`.
- Models receive the shared `db` instance; all writes go through `db.transaction()` (shim provided because `node:sqlite` lacks it).
- Dates stored as **ISO-8601 text** (`createdAt`, `loginTime`, `logoutTime`); `date` is `YYYY-MM-DD` for fast range queries.
- Mongo (`mongoModels.js`) mirrors only `sessions` for cloud aggregation.

---

## 8. API Flow

```
Client → middleware (cors, json, session) → router → auth/validate guard
       → controller → model → SQLite → JSON response
       → errorHandler (on throw)
```

---

## 9. Authentication Flow

```
POST /api/auth/login {username,password}
  → adminModel.verify (bcrypt.compare)
  → on success: req.session.adminId set
  → 200 {success:true}
GET /api/auth/me
  → auth middleware: if !req.session.adminId → 401
  → returns admin profile
POST /api/auth/logout → destroys session
```

---

## 10. Deployment Architecture

- Single Node process on the lab kiosk PC (Windows/Linux).
- `npm install && npm start`; `PORT` from `.env` (default 3000).
- Optionally run behind a reverse proxy (nginx) with TLS if exposed.
- Mongo is **optional** — leave `MONGODB_URI` blank for pure offline.

---

## 11. Offline Sync Flow

```
syncWorker (every SYNC_INTERVAL_SECONDS)
  → internetService.isOnline()?
      NO  → wait, retry next tick
      YES → sessionModel.pendingSync()
          → syncService.syncPending(rows) → MongoDB
          → sessionModel.markSynced(ids, now)
```

The kiosk is **never blocked** by sync; failures are logged and retried.

---

## 12. Error Handling Flow

```
controller throws
  → errorHandler catches
  → logs via logService
  → responds { success:false, message, ...details }
  → appropriate status (400 validation, 401 auth, 404, 500)
```

---

## 13. Logging Flow

- `logService.writeLog(level, message, meta)` appends to `logs/<date>.json` and console.
- Levels: `info`, `event`, `warn`, `error`.
- The server records start/stop, backup results, sync outcomes, and fatal errors.

---

## 14. Sequence Diagrams

### 14.1 Kiosk login
```
Student -> Home UI: types USN + Enter
Home UI -> /api/sessions/toggle: {registerNumber}
  -> sessionController.toggle
     -> sessionModel.findActive(usn)?
        YES -> sessionModel.complete()  (logout)
        NO  -> sessionModel.create()    (login)
  -> 200 {status:'LOGGED_IN'|'LOGGED_OUT', session}
Home UI -> toast
```

### 14.2 Admin login
```
Admin -> /admin -> login.html
login.html -> /api/auth/login
  -> authController.login -> adminModel.verify -> session set
  -> redirect /admin/dashboard
```

### 14.3 Nightly backup
```
node-cron (BACKUP_TIME)
  -> backupService.createBackup()
     -> WAL checkpoint -> copy data/labregister.db -> backups/<ts>.db
     -> prune to BACKUP_KEEP
```

---

## 15. Data Flow

`Browser → fetch → Controller → Model → SQLite → JSON → Browser render`.
Mongo is a **write-only mirror** of sessions (one-way, best-effort).

---

## 16. Network Flow

- Inbound: browser ↔ Express (HTTP, localhost or LAN).
- Outbound (optional): Express ↔ MongoDB Atlas (only when `MONGODB_URI` set + online).
- Connectivity probe uses `INTERNET_CHECK_URL` before sync attempts.

---

## 17. Project Folder Tree

See Section 3 (Folder Structure). The `docs/` tree is the authoritative layout; the root `README.md` mirrors it for quick reference.
