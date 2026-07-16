# RULES — Coding Standards & Conventions

**Project:** Lab Register
**Applies to:** All code under `LabRegister/`
**Last Updated:** 2026-07-14

These rules are enforced by `instruction.md`. Violations are technical debt and must be fixed before a phase is marked complete.

---

## 1. Coding Standards
- Plain **CommonJS** JavaScript (Node ≥ 22.5). No transpiler / build step.
- `"use strict"` is implicit (modules). Keep code ES2022-clean.
- Prefer `async/await` over raw Promise chains in controllers/services.
- Use `const` by default; `let` only when rebound; never `var`.
- No semicolon-less style wars — **always end statements with `;`.**

## 2. Naming Conventions
- `camelCase` for variables, functions, route handlers.
- `PascalCase` for nothing (no classes) — module objects are `camelCase` (`studentModel`).
- `UPPER_SNAKE_CASE` for constants and env keys.
- Files: `kebab-case.js` for modules (`authController.js`, `sessionModel.js`).
- DB tables: `snake_case` plural (`students`, `sessions`); columns `snake_case`.

## 3. Formatting Rules
- 2-space indentation. No tabs.
- Max line length 100 (soft). Break long SQL across lines.
- One export per module (`module.exports = studentModel`).
- Group imports: Node built-ins → 3rd-party → local (`./`, `../`).

## 4. Allowed Libraries
- `express`, `body-parser`, `cors`, `express-session` — HTTP & sessions.
- `bcryptjs` — password hashing.
- `uuid` — session external ids.
- `multer` — upload handling.
- `xlsx` / `exceljs` — spreadsheet import/export.
- `pdfkit` — PDF export.
- `node-cron` — scheduled backups.
- `axios` — cloud sync HTTP.
- `mongoose` — optional MongoDB mirror.
- `dotenv` — env loading.
- `node:sqlite` — built-in SQLite (no native compile).
- `Chart.js` — dashboard charts (frontend).

## 5. Forbidden Libraries
- No ORM (Sequelize/Knex/Prisma) — raw `node:sqlite` prepared statements only.
- No frontend framework (React/Vue/Svelte) — vanilla HTML/CSS/JS.
- No `better-sqlite3` (native compile) — use built-in `node:sqlite`. *(The comment in `config/database.js` is stale; see MEMORY.md.)*
- No `moment` — use native `Date` / ISO strings.
- No validation framework beyond `middleware/validate.js` (no Joi/Yup).
- No logging framework beyond `services/logService.js` (no winston/pino).

## 6. Folder Rules
- `models/` = pure data access only (no business logic, no HTTP).
- `controllers/` = business logic + HTTP shaping only (no SQL).
- `routes/` = wiring only (no logic beyond `asyncHandler` + guard + call).
- `services/` = cross-cutting (backup, sync, log, internet).
- `middleware/` = auth/validate/error only.
- `views/` = HTML; `public/` = static assets only.
- Never put SQL in a controller or route.

## 7. Code Reuse Rules
- Shared logic lives in `models/` or `services/`. Never duplicate queries across controllers.
- Reuse `asyncHandler` and `requireAuth` from middleware.
- Frontend: share helpers in `public/js/common.js` (toasts, fetch wrapper, theme).
- If a function is needed in 2+ places, extract it.

## 8. Error Handling Rules
- Every controller wrapped in `asyncHandler` → `errorHandler` centralizes JSON.
- Never `res.send` raw errors; always `{ success:false, message }`.
- Log every error via `logService.writeLog('error', ...)`.
- Validate input at the route (middleware) before reaching the controller.
- Never let a sync/backup failure crash the process.

## 9. Security Rules
- Passwords: bcrypt cost **12**, never stored or returned in plaintext.
- Session cookie: `httpOnly`; set `secure` when behind HTTPS.
- Strip `passwordHash` from any admin object sent to client.
- `.env` never committed; `.env.example` only.
- Backup download: reject path traversal (`/[\\/]/`).
- Uploads: memory storage, 8 MB cap, single file.
- `COLLATE NOCASE` on register numbers prevents duplicate-identity bugs.

## 10. Validation Rules
- `registerNumber`: required, non-empty, trimmed, treated case-insensitively.
- Pagination: `page ≥ 1`, `limit` clamped to `[1,500]`.
- Dates: `YYYY-MM-DD` for `date`; ISO-8601 for timestamps.
- Reject unknown enum values (`status`, `theme`) at the boundary.

## 11. Logging Rules
- Use `logService.writeLog(level, message, meta)` only.
- Levels: `info`, `event`, `warn`, `error`.
- Daily files under `logs/<YYYY-MM-DD>.json`.
- Never log secrets (passwords, session secret, Mongo URI).

## 12. Git Commit Rules
- Small, scoped commits per task/phase.
- Message format: `<type>: <short summary>` (feat, fix, docs, refactor, chore).
- Never commit `.env`, `data/`, `backups/`, `logs/`, `node_modules/`.
- Keep commits scoped to the current phase.

## 13. Performance Rules
- All DB writes synchronous + transactional (WAL) — kiosk must not wait on network.
- Index every column used in `WHERE`/`JOIN`/`ORDER BY` (see DATABASE.md).
- Clamp list pages; never `SELECT *` unbounded.
- Cloud sync is background and non-blocking.

## 14. Accessibility Rules
- WCAG-AA color contrast (see DESIGN.md).
- Kiosk input: large tap target, keyboard-operable (Enter to submit).
- Visible focus states; `aria-live` region for toasts.
- Charts have text alternatives / titles.

## 15. UI Rules
- Minimal, enterprise look; glassmorphism **only where necessary** (e.g., modal overlays).
- One primary action color; neutral surfaces.
- Consistent spacing scale; consistent button/input components.

## 16. Responsive Rules
- Mobile-first; kiosk screen ≥ 1024px, admin usable ≥ 768px.
- Fluid grid for cards; tables scroll horizontally on small screens.
- Touch-friendly targets (≥ 44px).

## 17. Commenting Rules
- Every module starts with a `@file` header (purpose + responsibility).
- Explain **why**, not **what**; the code shows the what.
- Keep comments accurate — fix stale comments (e.g., `config/database.js`).

## 18. Refactoring Rules
- Prefer extending existing code over rewriting.
- Keep functions ≤ **50 lines**. Split when exceeded.
- Never rewrite working code unless explicitly requested.

## 19. Hard Constraints (from instruction.md)
- **Never** create duplicate code.
- **Never** create unused files.
- **Never** create unnecessary dependencies.
- **Never** break existing APIs.
- **Never** replace libraries unless instructed.
- **Never** modify completed modules unless explicitly requested.
- Maintain backward compatibility with completed APIs.
