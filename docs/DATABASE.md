# DATABASE — Schema Specification

**Project:** Lab Register
**Engine:** SQLite via built-in `node:sqlite` (`DatabaseSync`)
**Mode:** WAL, `foreign_keys = ON`
**Version:** 1.0.0 (docs)
**Last Updated:** 2026-07-14

---

## 1. ER Diagram (text)

```
┌──────────────┐        registers / logs in        ┌────────────────┐
│   students   │ ───────────────────────────────▶ │    sessions     │
│              │   students.registerNumber (1)     │                │
│ id (PK)      │ ◀─────────────────────────────── │ registerNumber  │
│ registerNumber (UQ)│   (N sessions per student)  │ uuid (PK,UQ)    │
│ name         │                                   │ registerNumber  │
│ department   │                                   │ loginTime       │
│ year         │                                   │ logoutTime      │
│ createdAt    │                                   │ duration        │
└──────────────┘                                   │ date            │
                                                     │ systemNumber    │
┌──────────────┐                                   │ status          │
│    admins    │                                   │ syncStatus      │
│ id (PK)      │                                   │ lastSyncedAt    │
│ username (UQ)│                                   │ createdAt       │
│ passwordHash │                                   └────────────────┘
│ createdAt    │
└──────────────┘

┌──────────────┐
│   settings   │   (key/value runtime config)
│ id (PK)      │
│ key (UQ)     │
│ value        │
└──────────────┘
```

`students` and `sessions` are linked **logically** by `registerNumber` (no FK constraint enforced at DDL level — see Constraints). `admins` and `settings` are independent.

---

## 2. Tables

1. `students` — master list of lab users.
2. `sessions` — every login/logout event (the core attendance record).
3. `admins` — admin accounts (passwords bcrypt-hashed).
4. `settings` — runtime-editable key/value configuration.

---

## 3. Columns

### 3.1 `students`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | Surrogate key |
| `registerNumber` | TEXT | UNIQUE, NOT NULL, `COLLATE NOCASE` | USN; identity key |
| `name` | TEXT | NOT NULL | Display name |
| `department` | TEXT | NOT NULL | e.g. CSE, ISE |
| `year` | TEXT | NOT NULL | e.g. 1st Year |
| `createdAt` | TEXT | NOT NULL | ISO-8601 |

### 3.2 `sessions`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | Surrogate key |
| `uuid` | TEXT | UNIQUE, NOT NULL | `uuid.v4()`; stable external id |
| `registerNumber` | TEXT | NOT NULL | FK-like to `students` |
| `loginTime` | TEXT | NOT NULL | ISO-8601 |
| `logoutTime` | TEXT | NULLABLE | ISO-8601 |
| `duration` | INTEGER | NULLABLE | seconds (computed on logout) |
| `date` | TEXT | NOT NULL | `YYYY-MM-DD` (derived from loginTime) |
| `systemNumber` | TEXT | NULLABLE | lab terminal/PC id captured at login |
| `status` | TEXT | NOT NULL | `ACTIVE` \| `COMPLETED` |
| `syncStatus` | INTEGER | DEFAULT 0 | 0 = pending, 1 = synced |
| `lastSyncedAt` | TEXT | NULLABLE | ISO-8601 |
| `createdAt` | TEXT | NOT NULL | ISO-8601 |

### 3.3 `admins`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `username` | TEXT | UNIQUE, NOT NULL | |
| `passwordHash` | TEXT | NOT NULL | bcrypt cost 12 |
| `createdAt` | TEXT | NOT NULL | ISO-8601 |

### 3.4 `settings`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `key` | TEXT | UNIQUE, NOT NULL | |
| `value` | TEXT | NULLABLE | stored as string; JSON for lists |

---

## 4. Relationships

| From | To | Key | Cardinality | Enforced FK |
|------|----|----|-------------|-------------|
| `sessions` | `students` | `registerNumber` | N:1 | No (logical) |
| `settings` | — | — | — | — |
| `admins` | — | — | — | — |

> **Note:** `sessions.registerNumber` is a *logical* foreign key. No `REFERENCES` clause is declared, so a session can exist for an unknown/removed register number (e.g., student deleted after logging in). Reports use `LEFT JOIN` to tolerate this.

---

## 5. Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_sessions_register` | sessions | `registerNumber` | Fast per-student lookups |
| `idx_sessions_status` | sessions | `status` | Active-now + pending filters |
| `idx_sessions_date` | sessions | `date` | Date-range reports |
| `idx_sessions_sync` | sessions | `syncStatus` | Cloud-sync queue |
| `idx_students_dept` | students | `department` | Department filtering |

Primary keys and the `UNIQUE` columns (`registerNumber`, `uuid`, `username`, `key`) are auto-indexed by SQLite.

---

## 6. Constraints

- `NOT NULL` on all identity/required fields.
- `UNIQUE` on `students.registerNumber`, `sessions.uuid`, `admins.username`, `settings.key`.
- `status` ∈ {`ACTIVE`,`COMPLETED`} enforced in application code (no CHECK constraint).
- `syncStatus` ∈ {0,1} enforced in application code.
- No `REFERENCES` FKs (intentional; see Relationships).

---

## 7. Primary & Foreign Keys

- **PKs:** all tables use `INTEGER PRIMARY KEY AUTOINCREMENT`.
- **FKs (logical):** `sessions.registerNumber → students.registerNumber` (not declared in DDL).
- Rationale: keeps deletes non-blocking and preserves attendance history even if a student record is removed.

---

## 8. Normalization

- **1NF:** atomic columns; no repeating groups.
- **2NF:** all non-key attributes depend on the whole PK (single-column PKs).
- **3NF:** no transitive dependency on `registerNumber` in `sessions` (department/year live only in `students` and are `JOIN`ed for display).
- `settings` is an EAV (entity-attribute-value) table — a deliberate denormalization for runtime config flexibility.

---

## 9. Future Scalability

- Add declared `FOREIGN KEY` with `ON DELETE RESTRICT` if stricter integrity is needed (requires keeping `foreign_keys=ON`).
- Partition `sessions` by `date` (yearly) for very large labs.
- Add `CHECK (status IN (...))` once SQLite version supports it comfortably.
- Mongo mirror (`mongoModels.js`) already supports horizontal cloud aggregation.
- Consider a `students.id`-based FK (integer) instead of string `registerNumber` for smaller indexes at scale.

---

## 10. DDL (authoritative)

```sql
CREATE TABLE IF NOT EXISTS students (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  registerNumber  TEXT UNIQUE NOT NULL COLLATE NOCASE,
  name            TEXT NOT NULL,
  department      TEXT NOT NULL,
  year            TEXT NOT NULL,
  createdAt       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid          TEXT UNIQUE NOT NULL,
  registerNumber TEXT NOT NULL,
  loginTime     TEXT NOT NULL,
  logoutTime    TEXT,
  duration      INTEGER,
  date          TEXT NOT NULL,
  systemNumber  TEXT,
  status        TEXT NOT NULL,
  syncStatus    INTEGER DEFAULT 0,
  lastSyncedAt  TEXT,
  createdAt     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  key   TEXT UNIQUE NOT NULL,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_register ON sessions(registerNumber);
CREATE INDEX IF NOT EXISTS idx_sessions_status   ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_date     ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_sync     ON sessions(syncStatus);
CREATE INDEX IF NOT EXISTS idx_students_dept     ON students(department);
```

> `systemNumber` may be added at runtime via `ALTER TABLE` for DBs created before it existed (handled idempotently in `config/database.js`).
