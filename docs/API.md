# API — REST Endpoint Reference

**Base URL:** `http://localhost:3000/api`
**Content-Type:** `application/json` (except `multipart/form-data` for import)
**Auth model:** `express-session` cookie (`labregister.sid`). Endpoints marked **[auth]** require a logged-in admin; others are **public** (kiosk flow).
**Convention:** All responses are `{ success: boolean, ... }`. Errors carry `message`.

**Last Updated:** 2026-07-14

---

## 1. Auth — `/api/auth`

### 1.1 `POST /api/auth/login`
Login as admin.
- **Auth:** public
- **Request**
  ```json
  { "username": "admin", "password": "admin123" }
  ```
- **Validation:** `username` non-empty; `password` non-empty.
- **Responses**
  - `200` success → `{ "success": true }`
  - `401` invalid → `{ "success": false, "message": "Invalid credentials" }`
- **Side effect:** sets session cookie.

### 1.2 `POST /api/auth/logout`
- **Auth:** [auth]
- **Response:** `200` → `{ "success": true }` (destroys session).

### 1.3 `GET /api/auth/me`
- **Auth:** public (returns `401` if not logged in)
- **Response:** `200` → `{ "success": true, "admin": { "id": 1, "username": "admin" } }`
- **Errors:** `401` → `{ "success": false, "message": "Not authenticated" }`

### 1.4 `POST /api/auth/change-password`
- **Auth:** [auth]
- **Request:** `{ "currentPassword": "admin123", "newPassword": "New$trong1" }`
- **Validation:** both fields required; `currentPassword` must match.
- **Responses:**
  - `200` → `{ "success": true }`
  - `400` → `{ "success": false, "message": "Current password is incorrect" }`

---

## 2. Students — `/api/students`

### 2.1 `POST /api/students/register`  *(kiosk registration + auto-login)*
- **Auth:** public
- **Request:** `{ "registerNumber": "1SU20CS001", "name": "Rama Rao", "department": "CSE", "year": "2nd Year", "systemNumber": "PC-12" }`
- **Validation:** `registerNumber` required (alphanumeric/uppercase-friendly, case-insensitive uniqueness); `systemNumber` required to open the login session.
- **Responses:**
  - `201` → `{ "success": true, "action": "login", "student": {...}, "session": {...} }`
  - `400` → `{ "success": false, "error": "System number is required to log in." }`
  - `403` → `{ "success": false, "error": "Self-registration is disabled. Contact the lab admin." }` (policy off)
- **Notes:** Creates the student if unknown, then opens an `ACTIVE` session. Honours `allowSelfRegistration` (see Settings).

### 2.2 `POST /api/students/`  *(removed — admin add disabled)*
- This endpoint was **removed**. Admins can no longer manually add a student.
  New students are created only via kiosk self-registration
  (`POST /api/students/register`) or bulk Excel import (`POST /api/students/import`).
  Admins may still **edit** (`PUT /api/students/:id`) and **delete**
  (`DELETE /api/students/:id`) existing records.

### 2.3 `GET /api/students/`  *(list / search / filter)*
- **Auth:** [auth]
- **Query:** `search`, `department`, `year`, `limit` (default 50, max 500), `offset` (or `page`).
- **Response:** `200` → `{ "success": true, "rows": [...], "total": 120 }`

### 2.4 `GET /api/students/public-search?q=RAM`
- **Auth:** public (kiosk type-ahead). Returns only `registerNumber, name, department`.
- **Response:** `200` → `{ "success": true, "rows": [ { "registerNumber": "1SU20CS001", "name": "Rama Rao", "department": "CSE" } ] }`

### 2.5 `GET /api/students/:id`
- **Auth:** [auth]
- **Response:** `200` → `{ "success": true, "student": {...} }`; `404` if missing.

### 2.6 `PUT /api/students/:id`
- **Auth:** [auth]
- **Request:** any of `{ "registerNumber", "name", "department", "year" }`.
- **Response:** `200` → `{ "success": true, "student": {...} }`

### 2.7 `DELETE /api/students/:id`
- **Auth:** [auth]
- **Response:** `200` → `{ "success": true, "deleted": true }`

### 2.8 `POST /api/students/import`  *(Excel/CSV bulk import)*
- **Auth:** [auth]
- **Content-Type:** `multipart/form-data` field `file` (≤ 8 MB, `.xlsx`/`.csv`).
- **Response:** `200` → `{ "success": true, "inserted": 295, "duplicates": 5, "skipped": 0 }`
  - `inserted` — new rows added.
  - `duplicates` — valid rows dropped because the register number already exists (case-insensitive, `INSERT OR IGNORE`).
  - `skipped` — rows dropped because a field failed validation (blank/invalid).
- **Errors:** `400` no file.

---

## 3. Sessions — `/api/sessions`

### 3.1 `POST /api/sessions/transaction`  *(core kiosk action)*
- **Auth:** public
- **Request:** `{ "registerNumber": "1SU20CS001", "systemNumber": "PC-12" }`
- **Logic:** if an `ACTIVE` session exists → complete it (logout); else create one (login). If unknown USN → `REGISTER_FLOW` hint (unless self-registration is disabled by policy).
- **Responses:**
  - Login → `{ "success": true, "status": "LOGGED_IN", "session": {...} }`
  - Logout → `{ "success": true, "status": "LOGGED_OUT", "session": {...}, "durationSeconds": 1830 }`
  - Unknown + allowed → `{ "success": true, "action": "register", "registerNumber": "..." }`
  - Unknown + **disabled** → `403` `{ "success": false, "error": "Self-registration is disabled. Contact the lab admin." }`

### 3.2 `POST /api/sessions/logout`
- **Auth:** public (physical kiosk logout by session uuid)
- **Request:** `{ "uuid": "<session-uuid>" }`
- **Response:** `200` → `{ "success": true, "status": "LOGGED_OUT", "session": {...} }`

### 3.3 `GET /api/sessions/`  *(history + filters + pagination)*
- **Auth:** [auth]
- **Query:** `page` (default 1), `limit` (default 50, max 500), `preset` (`today`|`week`|`month`|`all`) OR `dateFrom`+`dateTo` (`YYYY-MM-DD`), `department`, `year`, `status` (`ACTIVE`|`COMPLETED`), `search`, `registerNumber`.
- **Response:** `200` → `{ "success": true, "rows": [...], "total": 540, "page": 1, "limit": 50, "pages": 11, "range": { "dateFrom": "...", "dateTo": "..." } }`

### 3.4 `GET /api/sessions/active`  *(live "who is inside")*
- **Auth:** [auth]
- **Response:** `200` → `{ "success": true, "rows": [ { "uuid":"...", "registerNumber":"1SU20CS001", "name":"Rama Rao", "loginTime":"...", ... } ] }`

### 3.5 `POST /api/sessions/:uuid/force-logout`
- **Auth:** [auth]
- **Response:** `200` → `{ "success": true, "session": {...} }`; `404` if not found / not active.

### 3.6 `GET /api/sessions/export`  *(Excel / CSV / PDF)*
- **Auth:** [auth]
- **Query:** `format` (`excel`|`csv`|`pdf`), plus same filters as 3.3.
- **Response:** `200` file download (`application/octet-stream` / `text/csv` / `application/pdf`).

---

## 4. Reports — `/api/reports`

### 4.1 `GET /api/reports/attendance`
- **Auth:** [auth]
- **Query:** `preset` (`today`|`yesterday`|`week`|`month`) OR `dateFrom`+`dateTo`, `department`, `year`, `registerNumber`.
- **Response:** `200` → `{ "success": true, "range": { "dateFrom": "...", "dateTo": "..." }, "data": [ { "registerNumber":"1SU20CS001", "name":"Rama Rao", "department":"CSE", "year":"2nd Year", "daysPresent": 30, "totalVisits": 41, "totalHours": "24.56" } ] }`
  - `daysPresent` = distinct days with a session; `totalVisits` = session count; `totalHours` = summed duration in hours (2-decimal string).
  - The roll-up CSV export is generated client-side from this `data` (see `public/js/reports.js`); it is NOT a separate endpoint.

---

## 5. Dashboard — `/api/dashboard`

### 5.1 `GET /api/dashboard/stats`
- **Auth:** [auth]
- **Response:** `200` → `{ "success": true, "stats": { "totalStudents": 320, "todayVisits": 54, "insideNow": 12, "pendingSync": 3 } }`

### 5.2 `GET /api/dashboard/charts`
- **Auth:** [auth]
- **Response:** `200` → `{ "success": true, "charts": { "dailyVisitors":[...], "departmentUsage":[...], "yearUsage":[...], "peakHours":[...], "monthlySessions":[...] } }`

---

## 6. Settings — `/api/settings`

### 6.1 `GET /api/settings/public`  *(kiosk branding)*
- **Auth:** public
- **Response:** `200` → `{ "success": true, "universityName":"Srinivas University", "labName":"Computer Laboratory Register", "theme":"light" }`

### 6.2 `GET /api/settings/`
- **Auth:** [auth]
- **Response:** `200` → `{ "success": true, "settings": { "universityName":"...", "labName":"...", "departments":"[\"CSE\",\"ISE\",...]", "years":"[...]", "syncInterval":"30", "theme":"light", "backupLocation":"./backups", "allowSelfRegistration":"true" } }`

### 6.3 `PUT /api/settings/`
- **Auth:** [auth]
- **Request:** `{ "labName":"New Name", "theme":"dark", "departments":["CSE","ISE"] }` (partial map)
- **Response:** `200` → `{ "success": true, "settings": {...} }`
- **Validation (boundary, per RULES §10):**
  - `theme` must be `"light"` or `"dark"` → else `400 { "success": false, "message": "theme must be \"light\" or \"dark\"" }`.
  - `syncInterval` must be an integer in `[5, 3600]` → else `400 { "success": false, "message": "syncInterval must be an integer between 5 and 3600" }`.
  - `universityName`/`labName`/`backupLocation` are trimmed and length-capped; `departments`/`years` are trimmed, empties dropped, capped at 50 entries.
- **Live effects:** a saved `theme` is applied immediately on kiosk + admin pages (source of truth is the DB, not `localStorage`); a saved `syncInterval` is picked up by the background sync worker on its next pass — no restart required.

---

## 7. Backups — `/api/backups`

### 7.1 `GET /api/backups/`
- **Auth:** [auth]
- **Response:** `200` → `{ "success": true, "backups": [ { "name":"2026-07-14-labregister.db", "sizeKb": 123, "createdAt":"2026-07-14T..." } ] }`
  - File names are `YYYY-MM-DD-<label>.db` (e.g. nightly `2026-07-14-labregister.db`, safety `2026-07-14-pre-restore.db`).

### 7.2 `POST /api/backups/now`
- **Auth:** [auth]
- **Response:** `200` → `{ "success": true, "file":"2026-07-14-labregister.db", "size": 123456 }`

### 7.3 `POST /api/backups/restore`
- **Auth:** [auth]
- **Request:** `{ "filename":"2026-07-14-labregister.db" }`
- **Response:** `200` → `{ "success": true, "restored": "2026-07-14-labregister.db" }`
- **Note:** Restoring copies the file over the live DB (after taking a `pre-restore` safety backup); restart the server afterwards for it to fully apply.

### 7.4 `GET /api/backups/download/:filename`
- **Auth:** [auth]
- **Response:** `200` file download. Filename must be a bare name inside the backup dir; any path separators / `..` are rejected (`400`), missing file → `404`.

---

## 8. Sync — `/api/sync`

### 8.1 `GET /api/sync/status`
- **Auth:** public
- **Response:** `200` → `{ "success": true, "online": true, "mongoConfigured": true, "mongoConnected": true, "pending": 3, "lastSyncedAt": "2026-07-14T09:58:00.000Z", "synced": 17, "total": 20 }`
  - `mongoConfigured` = a `MONGODB_URI` is set; `mongoConnected` = the Atlas connection is live. The home pill shows "Cloud Sync Active" only when both `online` and `mongoConnected`.

### 8.2 `POST /api/sync/now`
- **Auth:** [auth]
- **Response:** `200` → `{ "success": true, "online": true, "mongoConfigured": true, "mongoConnected": false, "synced": 3, "pending": 0, "error": null }`
  - `error` is `null` on success, otherwise a short code (`mongo-not-connected`, `already-running`, or the exception message). No crash if offline / Mongo unset.

---

## 9. Status Codes (summary)

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created (kiosk self-registration) |
| 400 | Validation / bad input |
| 401 | Not authenticated |
| 404 | Not found |
| 409 | Conflict (duplicate register number) |
| 500 | Unexpected server error (logged) |

## 10. Authentication Requirements (matrix)

| Endpoint | Public | Auth |
|----------|--------|------|
| auth/login, auth/me | ✓ | |
| auth/logout, auth/change-password | | ✓ |
| students/register, students/public-search | ✓ | |
| students/* (其余) | | ✓ |
| sessions/transaction, sessions/logout | ✓ | |
| sessions/* (其余) | | ✓ |
| reports/* | | ✓ |
| dashboard/* | | ✓ |
| settings/public | ✓ | |
| settings/* (其余) | | ✓ |
| backups/* | | ✓ |
| sync/status | ✓ | |
| sync/now | | ✓ |
