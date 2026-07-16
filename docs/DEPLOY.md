# DEPLOY — Production Runbook

**Project:** Lab Register
**Applies to:** Phase 13 (Deployment)
**Last Updated:** 2026-07-15

A single-process, offline-first Node.js app. No build step, no native compile
(`node:sqlite` is built in). This runbook covers a reproducible, hardened
deployment on a lab kiosk machine.

---

## 1. Requirements
- **Node.js ≥ 22.5** (`node:sqlite` requirement). `node -v` to confirm.
- Local write access for `data/`, `backups/`, `logs/` (all gitignored).
- (Optional) `nginx` + TLS cert if the kiosk is reachable over a network.

## 2. Clean install
```bash
git clone <repo> && cd LabRegister
npm ci                 # reproducible from package-lock.json (preferred)
# npm install          # alternative
```
`npm ci` deletes `node_modules` and reinstalls exactly what the lockfile pins —
use it for deterministic deploys. `npm install` is fine for dev.

## 3. Harden `.env`
```bash
cp .env.example .env
```
Then edit `.env` — **minimum changes before production**:

| Variable | Why | Action |
|----------|-----|--------|
| `SESSION_SECRET` | Signs the session cookie; a known value lets attackers forge sessions. | `openssl rand -hex 32` and paste the output. |
| `ADMIN_PASSWORD` | Default `admin123` is public knowledge. | Set a strong unique password. |
| `SECURE_COOKIE` | Adds the `Secure` attribute so the cookie travels only over HTTPS. | `true` **only** behind TLS; `false` for plain-HTTP/local kiosk. |
| `MONGODB_URI` | Cloud mirror is optional. | Leave blank to stay fully offline. |
| `PORT` | Default `3000`. | Change only if 3000 is taken. |
| `BACKUP_TIME` / `BACKUP_KEEP` | Retention of nightly SQLite backups. | Confirm the schedule/size suits the lab. |

> `.env` is never committed (gitignored). The real `.env` lives only on the
> deployment machine.

## 4. Initialize the database
```bash
npm run init-db      # idempotent: creates schema if missing, safe to re-run
```
Schema uses WAL + foreign keys on; it is created automatically on first boot too,
but running `init-db` up front surfaces any permission/version problems early.

## 5. Run the service
Foreground (quick check):
```bash
npm start            # serves on PORT; Ctrl-C to stop
```

### systemd (recommended for a kiosk)
Create `/etc/systemd/system/labregister.service`:
```ini
[Unit]
Description=Lab Register kiosk
After=network.target

[Service]
WorkingDirectory=/opt/LabRegister
ExecStart=/usr/bin/node server.js
Environment=NODE_ENV=production
Restart=on-failure
RestartSec=5
User=labregister
# Load .env from the project dir (node reads it via dotenv)

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now labregister
sudo systemctl status labregister
```

### pm2 (alternative)
```bash
npm i -g pm2
pm2 start server.js --name labregister
pm2 save && pm2 startup
```

## 6. Reverse proxy (HTTPS)
Only needed if the kiosk is network-reachable. Terminate TLS at `nginx` and set
`SECURE_COOKIE=true` in `.env` so the session cookie is HTTPS-only.

```nginx
server {
    listen 443 ssl;
    server_name lab.example.edu;

    ssl_certificate     /etc/ssl/lab/fullchain.pem;
    ssl_certificate_key /etc/ssl/lab/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Plain HTTP on port 3000 is fine for an **air-gapped / local-only** kiosk — just
leave `SECURE_COOKIE=false`.

## 7. First-boot checklist
- [ ] Service is `active (running)`.
- [ ] `curl -fsS http://localhost:3000/ ` returns the kiosk page (HTTP 200).
- [ ] Log in at `/admin` with the new `ADMIN_PASSWORD`.
- [ ] Change the admin password (Settings → change password) — captured in `admins`.
- [ ] Log line confirms `Nightly backup scheduled at HH:MM`.
- [ ] `npm test` → 24 pass, 0 fail (proves models + API + sync boot path).

## 8. Verify / health
```bash
npm test                                  # 24/24
curl -fsS http://localhost:3000/ && echo "kiosk OK"
curl -fsS http://localhost:3000/api/sync/status   # {"online":...,"pending":...}
```

## 9. Backup & restore
- Nightly SQLite backup runs via `node-cron` at `BACKUP_TIME`; old ones pruned to
  `BACKUP_KEEP`. Manual: `npm run backup`.
- Restore from the admin Backup page (or copy a `.db` over `data/labregister.db`
  after a WAL checkpoint), then restart the service.
- Backups are plain file copies — safe to archive off-box.

## 10. Upgrading
```bash
git pull
npm ci
npm run init-db     # applies any new columns (idempotent ALTERs)
sudo systemctl restart labregister
npm test
```
No migrations to run by hand; the schema self-heals on boot.
