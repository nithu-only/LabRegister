# Lab Register — Offline-first Lab Attendance System

> 📖 **Full documentation:** [docs/GUIDE.md](docs/GUIDE.md) — install, kiosk & admin usage, config, API summary, troubleshooting.

A kiosk-style **Lab Register Management System** for the Srinivas University
computer laboratory. Students tap their Register Number (USN) at the door; the
system automatically **logs them in** or **logs them out**. An admin panel
provides student management, session history, attendance reports, live "who's
inside" view, settings, and backups.

> **Offline-first:** the app runs fully on a local **SQLite** database with **no
> internet required**. An optional **MongoDB Atlas** connection pushes data to the
> cloud in the background and never blocks the kiosk.

---

## Features

- **Kiosk home** — type a register number → auto login / logout / register.
- **Admin auth** — session-based login, password change, light/dark theme.
- **Students** — list/search/filter, add/edit/delete, Excel/CSV import.
- **Sessions** — full history with filters, pagination, Excel/CSV/PDF export.
- **Reports** — attendance roll-up (days present, visits, hours) + CSV export.
- **Active Now** — live view of students currently inside, with force-logout.
- **Dashboard** — stat cards + 5 analytics charts (Chart.js).
- **Backup** — nightly SQLite backup (cron) + manual backup / download / restore.
- **Cloud sync** — background worker syncs pending rows to MongoDB when online.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure (optional — sensible defaults are provided)
cp .env.example .env
#   edit .env: set ADMIN_PASSWORD, and MONGODB_URI if you want cloud sync

# 3. Initialise the database (creates the SQLite schema)
npm run init-db

# 4. (Optional) Seed demo students + sessions
npm run seed

# 5. Start the server
npm start
#   -> open http://localhost:3000
```

Open these pages:

| URL | Page |
|------|------|
| `http://localhost:3000/` | Kiosk home (student entry/exit) |
| `http://localhost:3000/admin` | Admin login |
| `http://localhost:3000/admin/dashboard` | Dashboard |
| `http://localhost:3000/admin/students` | Students |
| `http://localhost:3000/admin/sessions` | Session history |
| `http://localhost:3000/admin/reports` | Attendance reports |
| `http://localhost:3000/admin/active` | Students inside now |
| `http://localhost:3000/admin/settings` | Settings + password |
| `http://localhost:3000/admin/backup` | Backups |

Default admin credentials (from `.env`): **admin / admin123** — change them in
`.env` before deploying.

---

## Configuration (`.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Server port |
| `SESSION_SECRET` | — | Session signing secret |
| `SECURE_COOKIE` | `false` | Set `true` when behind HTTPS (Secure session cookie) |
| `UNIVERSITY_NAME` / `LAB_NAME` | Srinivas University | Branding |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / `admin123` | Bootstrap admin |
| `SQLITE_DB_PATH` | `./data/labregister.db` | Local database |
| `MONGODB_URI` | _(empty)_ | Cloud backup (leave blank = offline) |
| `SYNC_INTERVAL_SECONDS` | `30` | Background cloud-sync interval |
| `BACKUP_TIME` | `23:55` | Nightly backup time (24h) |
| `BACKUP_KEEP` | `30` | Backups to retain |
| `INTERNET_CHECK_URL` | google probe | Connectivity check |
| `DEFAULT_THEME` | `light` | Initial theme |

---

## Scripts

| Command | What it does |
|---------|--------------|
| `npm start` | Run the server (kiosk mode) |
| `npm run dev` | Run with `--watch` (auto-restart on change) |
| `npm run init-db` | Verify / create the SQLite schema |
| `npm run seed` | Populate demo students + sessions (only if empty) |
| `npm run backup` | Create a one-off backup immediately |

---

## Project layout

```
LabRegister/
├── server.js              # Entry point (Express + cron + sync)
├── config/               # env, SQLite (database.js), MongoDB (mongoose.js)
├── models/               # SQLite data-access + Mongo schemas
├── controllers/          # Request handlers
├── routes/               # REST API under /api
├── middleware/           # auth, validation, error handling
├── services/             # backup, sync, logging, internet probe
├── sync/                 # background sync worker
├── views/               # HTML pages (kiosk + admin SPA)
├── public/              # CSS + JS served statically
├── scripts/             # init-db / seed / backup CLI
├── data/                # SQLite database (gitignored)
├── backups/             # nightly backups (gitignored)
└── logs/               # daily JSON logs (gitignored)
```

---

## Notes

- **Resetting the database.** Delete `data/labregister.db*` and restart, then
  re-run `npm run init-db` (and optionally `npm run seed`).
- **Cloud sync is optional.** With `MONGODB_URI` empty the app still works
  perfectly offline; sync simply waits until a URI is configured and reachable.
- **Backups are file copies** of the live SQLite DB (after a WAL checkpoint).
  Restoring copies the file over the live DB — restart the server afterwards.

---

## Deployment

Lab Register is a **single Node.js process with no build step**. For a production
kiosk, run it under a process manager (systemd / pm2) and — when the terminal is
exposed over a network — behind an HTTPS reverse proxy.

### 1. Prerequisites
- **Node.js ≥ 22.5** (the built-in `node:sqlite` module requires it). Check with `node -v`.
- A writable directory for `data/`, `backups/`, and `logs/`.

### 2. Install (clean machine)
```bash
git clone <repo> && cd LabRegister
npm ci            # reproducible install from package-lock.json
# or: npm install
```

### 3. Configure & harden `.env`
Copy `.env.example` → `.env` and change **at least** these before going live:

| Variable | Action |
|----------|--------|
| `SESSION_SECRET` | Replace with a long random value — `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Change from the `admin123` default |
| `SECURE_COOKIE` | Set `true` **only** when served over HTTPS (see reverse proxy) |
| `MONGODB_URI` | Leave blank to stay fully offline |
| `BACKUP_TIME` / `BACKUP_KEEP` | Confirm retention suits your lab |

> Full hardening + reverse-proxy walkthrough: [`docs/DEPLOY.md`](docs/DEPLOY.md).

### 4. Initialize & run
```bash
npm run init-db     # create the SQLite schema (idempotent)
npm start           # boots on PORT (default 3000)
```
Keep it alive with a process manager — see the sample systemd unit in `docs/DEPLOY.md`.

### 5. First-boot checklist
- [ ] Log in at `/admin` with your new `ADMIN_PASSWORD`.
- [ ] Change the admin password (Settings → change password).
- [ ] Confirm a nightly backup is scheduled (log line: `Nightly backup scheduled at …`).
- [ ] Run `npm test` — all 24 cases should pass.

### 6. Verify the deployment
```bash
npm test                                  # node --test → 24 pass, 0 fail
curl -fsS http://localhost:3000/ && echo "kiosk OK"
```
