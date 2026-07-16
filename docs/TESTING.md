# TESTING — Test Plan

**Project:** Lab Register
**Last Updated:** 2026-07-14

Covers manual, unit, integration, API, edge, and validation testing. Each case lists **precondition → action → expected result**.

---

## 0. Automated Test Suite (`npm test`)

The cases in §2–§6 are covered by an automated suite using the built-in **`node:test`** runner (no extra dependencies). Run with:

```bash
npm test          # node --test  (discovers test/**/*.test.js)
```

- `test/models.test.js` — unit tests (§2 U1–U9) against an isolated `data/test-unit-<pid>.db`.
- `test/integration.test.js` — boots the real server on an isolated port + `data/test-integration.db` (Mongo disabled) and exercises endpoints (§3 I1–I5, §4 A1–A6, §5 E6/E8/E9, §6 V3/V4).
- Each test run cleans up its own database files. The real `data/labregister.db` is never touched.

All 24 cases pass on Node v24.16.0.

---

## 1. Manual Testing

### 1.1 Kiosk flow
| ID | Precondition | Action | Expected |
|----|--------------|--------|----------|
| M1 | Clean DB, known student USN | Type USN + Enter | Toast "Logged in"; session `ACTIVE` |
| M2 | USN with open session | Type USN + Enter | Toast "Logged out"; `duration > 0`, `COMPLETED` |
| M3 | Unknown USN, register allowed | Type USN + fill form | Student created + auto `ACTIVE` session |
| M4 | Unknown USN, register denied | Type USN | Rejected with guidance |
| M5 | Refresh Active Now mid-session | Open `/admin/active` | Student appears in list |

### 1.2 Admin flow
| ID | Action | Expected |
|----|--------|----------|
| M6 | Login with wrong password | 401, no session |
| M7 | Login correct → visit `/admin/dashboard` | Loads with stats + charts |
| M8 | Change password → logout → login new | Succeeds with new password |
| M9 | Toggle dark theme in Settings | UI switches; persists on reload |

---

## 2. Unit Testing (models)
| ID | Target | Case | Expected |
|----|--------|------|----------|
| U1 | `studentModel.create` | Insert valid student | Row returned; `id > 0` |
| U2 | `studentModel.findByRegisterNumber` | Case-insensitive lookup "1su20cs001" | Finds "1SU20CS001" |
| U3 | `studentModel.bulkInsert` | 300 rows, 5 duplicates | 295 inserted, 5 skipped |
| U4 | `sessionModel.complete` | Active session | `status=COMPLETED`, `duration` set |
| U5 | `sessionModel.forceComplete` | Active session | LogoutTime = now; duration computed |
| U6 | `sessionModel.attendance` | Range with 2 visits same student | `visits=2`, `daysPresent` correct |
| U7 | `adminModel.verify` | Wrong password | null |
| U8 | `adminModel.verify` | Correct password | admin without `passwordHash` |
| U9 | `settingModel.setMany` | Set theme=dark | `get('theme') === 'dark'` |

---

## 3. Integration Testing
| ID | Flow | Expected |
|----|------|----------|
| I1 | POST `/api/students/register` → GET `/api/sessions/active` | New session present |
| I2 | POST `/api/sessions/transaction` (login) → again (logout) | First `LOGGED_IN`, second `LOGGED_OUT` |
| I3 | Auth: GET `/api/students/` without session | 401 |
| I4 | Auth: GET `/api/students/` with session | 200 + rows |
| I5 | Backup: POST `/api/backups/now` → GET `/api/backups/` | New file listed |

---

## 4. API Testing
Use the matrix in `API.md`. Smoke each endpoint for `200`/`201`/`400`/`401`/`404`/`409`.
| ID | Endpoint | Assert |
|----|----------|--------|
| A1 | `POST /api/auth/login` | 200 + sets cookie; bad creds 401 |
| A2 | `POST /api/students/import` | 400 when no file |
| A3 | `GET /api/sessions/export?format=csv` | CSV download |
| A4 | `GET /api/reports/attendance` | rows sum correctly |
| A5 | `GET /api/dashboard/stats` | 4 numeric stats |
| A6 | `GET /api/sync/status` | `online` boolean + `pending` int |

---

## 5. Edge Cases
| ID | Scenario | Expected |
|----|----------|----------|
| E1 | Login then immediately logout (< 1s) | `duration >= 0`, no negative |
| E2 | Force-logout already-completed session | 404 |
| E3 | Two kiosks type same USN within 1s | Exactly one `ACTIVE` session (WAL serializes) |
| E4 | Mongo down but URI set | Kiosk unaffected; sync retries; `pending` grows |
| E5 | Restore a backup, then query | Data reflects backup; restart recommended |
| E6 | `limit` > 500 | Clamped to 500 |
| E7 | `page` = 0 or negative | Treated as 1 |
| E8 | `backup/download/../../etc/passwd` | 400 (path traversal blocked) |
| E9 | Empty search string to `/public-search` | `[]` |
| E10 | Student deleted while having `ACTIVE` session | Session remains; reports `LEFT JOIN` tolerate |

---

## 6. Validation Cases
| ID | Input | Expected |
|----|-------|----------|
| V1 | `registerNumber` empty | 400 |
| V2 | `registerNumber` with spaces | Trimmed before use |
| V3 | Duplicate `registerNumber` on add | 409 |
| V4 | `theme` = "neon" | Rejected (not in allowed set) |
| V5 | `status` filter = "MAYBE" | Rejected / ignored safely |
| V6 | `dateFrom` > `dateTo` | Handled / empty result, no crash |

---

## 7. Expected Results (acceptance summary)
- Every kiosk tap persists synchronously (no data loss offline).
- All auth-gated routes return 401 without a session.
- All lists paginate and report correct `total`.
- Exports produce valid openable files.
- Backups restore cleanly; retention prunes old files.
- Cloud sync never blocks or crashes the kiosk.
