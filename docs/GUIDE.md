# Lab Register — Documentation

> Offline-first lab attendance system for Srinivas University. Students self
> check-in at a kiosk; an admin panel handles management, reports, and backups.
> This is the **complete guide**. For deep detail see the other files in
> `docs/` (API reference, architecture, database schema, deployment).

---

## 1. What it is

| | |
|---|---|
| **Type** | Kiosk-style lab attendance system |
| **Runtime** | Node.js + Express, served as a local web app |
| **Primary store** | SQLite (works fully offline — no internet needed) |
| **Optional cloud** | MongoDB Atlas sync in the background (never blocks the kiosk) |
| **Two UIs** | Public **Kiosk Home** (`/`) and authenticated **Admin Panel** (`/admin`) |

A student types their Register Number (USN) + a system number at the door; the
app logs them **in** or **out** automatically. The admin sees who's inside,
manages the student list, pulls reports, and runs backups.

---

## 2. Architecture at a glance

```
Browser ──► Express server (server.js)
              ├─ /api/*        REST API (routes/ + controllers/ + models/)
              ├─ static files public/  +  views/  (HTML)
              ├─ SQLite        data/labregister.db   (primary, offline)
              └─ MongoDB       (optional, background sync worker)
```

| Folder | Responsibility |
|---|---|
| `config/` | Env loading, DB connection, Mongoose (cloud) setup |
| `models/` | SQLite data access (`studentModel`, `sessionModel`, `settingModel`, `adminModel`) |
| `controllers/` | Business logic (session transaction, student CRUD, reports, export) |
| `routes/` | HTTP routing + auth middleware (`requireAuth`) |
| `middleware/` | Admin auth, input validation, error handling |
| `services/` | Logging, cloud sync, internet check, backups |
| `sync/` | Background worker that pushes pending rows to MongoDB |
| `views/` | Server-rendered HTML pages (kiosk + admin SPA) |
| `public/` | CSS, client JS, vendor assets |
| `scripts/` | DB init, demo seed, backup |

**Request flow:** browser → `routes/*` → `controllers/*` → `models/*` (SQLite).
Every state change is committed to SQLite **first**; cloud sync happens later.

---

## 3. Installation & first run

**Requirements:** Node.js **22.5 or newer**.

```bash
# 1. Install dependencies
npm install

# 2. Create your env file (copy the template; defaults work out of the box)
cp .env.example .env
#    Edit .env at least to set ADMIN_PASSWORD (see section 6).

# 3. Create the SQLite schema
node scripts/initDb.js

# 4. (Optional) Load demo students + sessions
npm run seed

# 5. Start the server
npm start
#    → open http://localhost:3000
```

First-boot checklist:
- Log in at `/admin` with the default **admin / admin123** and **change the
  password immediately** in `.env` (`ADMIN_PASSWORD`).
- Confirm the kiosk home (`http://localhost:3000`) shows the entry card and the
  "Active in Lab" board.

---

## 4. Using the Kiosk (Home)

The home screen (`views/index.html`) is the student-facing kiosk.

1. Type the **Register Number** (typeahead search helps).
2. Enter the **System Number** (e.g. `PC-01`).
3. Press **Continue**.

The server decides what happens (`controllers/sessionController.processTransaction`):

| State | Result |
|---|---|
| USN unknown, self-registration on | **Register** → form opens, student created, then auto login |
| USN known, already inside | **Already-in** → asks "log out?" |
| USN known, not inside | **Login** → opens an `ACTIVE` session |
| USN known, clicked again | **Logout** → session closed, duration computed |

On-screen elements:
- **Students Inside** — how many are currently in the lab (used systems).
- **Available Systems** — `28 − inside` (the `28` is a constant in `home.js`).
- **Active in Lab board** — every student inside, with name, system number, and
  a live timer; anyone can tap the logout button there.
- **"You are inside" panel** — shows the just-logged-in student's name + system
  + running timer on that kiosk.

The home polls `GET /api/sessions/active` every 5 seconds, so counts and the
board stay live.

---

## 5. Admin Panel (`/admin`)

Log in at `/admin`. Pages:

| Page | What you do |
|---|---|
| **Dashboard** | Stat cards + 5 analytics charts (Chart.js) |
| **Students** | Search/filter, **Add / Edit / Delete**, and **Excel/CSV bulk import** |
| **Sessions** | Full session history, filters, pagination, force-logout, export |
| **Reports** | Attendance roll-up (days present, visits, hours) + CSV export |
| **Active Now** | Live "who's inside" view (same data as the kiosk board) |
| **Settings** | University/lab name, theme, departments, years, backup schedule, self-registration toggle |
| **Backup** | Nightly SQLite backup (cron) + manual backup / download / restore |

> **Add/Edit student** uses a modal form. If a modal ever looks blank, hard-
> refresh the browser (Ctrl+Shift+R) — the admin pages load Bootstrap from a
> CDN, and a stale cached script/CSS can hide it.

---

## 6. Configuration (`.env`)

All settings have safe defaults; edit only what you need.

| Variable | Meaning | Default |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `SESSION_SECRET` | Session cookie signing secret | dev placeholder — **change in prod** |
| `UNIVERSITY_NAME` | Shown on kiosk/admin | `Srinivas University` |
| `LAB_NAME` | Shown on kiosk/admin | `Computer Laboratory Register` |
| `ADMIN_USERNAME` | Admin login | `admin` |
| `ADMIN_PASSWORD` | Admin password | `admin123` — **change this** |
| `SQLITE_DB_PATH` | SQLite file location | `./data/labregister.db` |
| `MONGODB_URI` | Atlas connection string (empty = no cloud) | _empty_ |
| `SYNC_INTERVAL_SECONDS` | How often to push to cloud | `30` |
| `BACKUP_TIME` | Daily backup time (`HH:MM`) | `23:55` |
| `BACKUP_KEEP` | Backups retained (days) | `30` |
| `INTERNET_CHECK_URL` | URL used to probe connectivity | Google probe |
| `DEFAULT_THEME` | `light` / `dark` | `light` |
| `ALLOW_SELF_REGISTRATION` | Let students self-register at kiosk | `true` |

> `.env` is **git-ignored** and must never be committed. Only `.env.example`
> (placeholders) is in the repo.

---

## 7. Cloud sync (optional)

If `MONGODB_URI` is set, `sync/syncWorker.js` periodically pushes every
session row with `syncStatus = 0` to MongoDB and marks it synced. The home
screen's network pill shows **Online · Cloud Sync Active** vs
**Offline · Saving Locally**. With no `MONGODB_URI` (or no internet) the kiosk
keeps working entirely on SQLite.

---

## 8. API summary

Auth: endpoints marked **[public]** need no login; others need an admin session
cookie. Full reference: **`docs/API.md`**.

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/sessions/transaction` | public | Core kiosk login/logout/register |
| `POST /api/sessions/logout` | public | Kiosk logout by session uuid |
| `GET /api/sessions/active` | public | Students currently inside |
| `GET /api/students/public-search` | public | Kiosk USN/name search |
| `POST /api/students/register` | public | Kiosk self-registration + auto-login |
| `GET /api/students/` | admin | List / search / filter |
| `POST /api/students/` | admin | Add a student |
| `PUT /api/students/:id` | admin | Edit a student |
| `DELETE /api/students/:id` | admin | Delete a student |
| `POST /api/students/import` | admin | Bulk Excel/CSV import |
| `GET /api/sessions/` | admin | Session history |
| `GET /api/reports` | admin | Attendance roll-up |
| `GET /api/dashboard` | admin | Dashboard stats + charts |
| `GET /api/settings/public` | public | Branding/departments/years/theme |
| `PUT /api/settings` | admin | Update settings |
| `POST /api/auth/login` | public | Admin login |
| `GET /api/sync/status` | public | Online / sync state |

---

## 9. Data & backups

- **Database:** `data/labregister.db` (SQLite). Two tables matter:
  `students` (`registerNumber, name, department, year`) and
  `sessions` (`uuid, registerNumber, loginTime, logoutTime, duration, status,
  systemNumber`).
- **Nightly backup:** a cron job at `BACKUP_TIME` copies the DB into `backups/`.
- **Manual backup/restore:** via the Admin → Backup page (download / restore).
- `data/*.db`, `backups/*.db`, and `logs/*.log` are **git-ignored**.

---

## 10. Scripts (`package.json`)

| Command | Purpose |
|---|---|
| `npm start` | Run the server (plain Node) |
| `npm run dev` | Run with auto-reload (`node --watch`) |
| `npm run init-db` | Create the SQLite schema |
| `npm run seed` | Load demo students + sessions |
| `npm run backup` | One-off backup |
| `npm test` | Run the test suite (`node --test`) |

After **any code change**, restart the server (`npm start`) and hard-refresh
the browser once.

---

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| Admin **Add/Edit** modal is blank / button does nothing | Hard-refresh (Ctrl+Shift+R). Admin pages load Bootstrap from CDN; a stale cached script/CSS hides the modal. (Fixed in code; refresh once.) |
| Kiosk **counts / "Active in Lab" board** not updating | Ensure you're on the latest code and the server is restarted. The board reads the public `/api/sessions/active` endpoint. |
| Forgot admin password | Stop the server, edit `ADMIN_PASSWORD` in `.env`, restart. (Or delete the admin row and let `ensureBootstrapAdmin()` recreate it.) |
| Changes not showing in browser | Hard-refresh; static assets are served with `no-cache` but a manual refresh is still needed after a restart. |
| Cloud sync not working | Check `MONGODB_URI` in `.env` and that the machine has internet; the kiosk still works offline regardless. |

---

## 12. Other documentation in `docs/`

| File | Contents |
|---|---|
| `API.md` | Full REST API reference (every endpoint, request/response) |
| `ARCHITECTURE.md` | Deeper architecture & component design |
| `DATABASE.md` | Full SQLite schema & query notes |
| `DEPLOY.md` | Production deployment steps |
| `DESIGN.md` | UI/UX design notes |
| `TESTING.md` | How to run & interpret tests |
| `CHANGELOG.md` | Version history |
| `PRD.md` / `Decisions.md` / `RULES.md` / `MEMORY.md` / `TASKS.md` / `PHASES.md` / `AI_Instructions.md` | Internal product/dev notes |

Root `README.md` covers install, config, scripts, and deployment as well.
