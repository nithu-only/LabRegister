# DESIGN — UI/UX Design System

**Project:** Lab Register
**Design Language:** Modern Enterprise (minimal, calm, high-contrast)
**Last Updated:** 2026-07-14

The kiosk must be glanceable from a distance; the admin panel must be dense-but-calm. One system, two densities.

---

## 1. Color Tokens

### Light Theme
| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#1D4ED8` (blue-700) | Primary buttons, links, active states |
| `--primary-hover` | `#1E40AF` | Hover |
| `--secondary` | `#0F172A` (slate-900) | Headings, text |
| `--accent` | `#0EA5E9` (sky-500) | Highlights, focus ring, live indicators |
| `--bg` | `#F1F5F9` (slate-100) | Page background |
| `--surface` | `#FFFFFF` | Cards, panels |
| `--border` | `#E2E8F0` (slate-200) | Borders, dividers |
| `--text` | `#0F172A` | Body text |
| `--text-muted` | `#64748B` (slate-500) | Secondary text |
| `--success` | `#16A34A` | Logged-in / positive |
| `--danger` | `#DC2626` | Logout / destructive / force |
| `--warning` | `#D97706` | Pending sync / warnings |

### Dark Theme
| Token | Value |
|-------|-------|
| `--bg` | `#0B1120` |
| `--surface` | `#111827` (gray-900) |
| `--border` | `#1F2937` |
| `--text` | `#E5E7EB` |
| `--text-muted` | `#94A3B8` |
| `--primary` | `#3B82F6` |
| `--accent` | `#38BDF8` |

> Dark theme toggled via `data-theme="dark"` on `<html>`; persisted in `settings`.

---

## 2. Typography
- **Font family:** system UI stack — `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. No web-font download (offline-first).
- **Scale (rem):**
  - Display (kiosk USN input): `2.5rem`, weight 600.
  - H1: `1.5rem` / 700
  - H2: `1.25rem` / 600
  - Body: `1rem` / 400
  - Small/meta: `0.875rem` / 400
  - Caption: `0.75rem` / 500 uppercase tracking-wide
- Line-height: 1.5 body, 1.2 headings.

---

## 3. Spacing Rules
- Base unit `4px`. Scale: `4, 8, 12, 16, 24, 32, 48`.
- Card padding: `16px` (mobile) / `24px` (desktop).
- Gap between cards: `16px` grid.
- Section margin: `24–32px`.

---

## 4. Border Radius
- Inputs / buttons: `8px`.
- Cards / panels: `12px`.
- Pills / badges / avatars: `999px` (full).
- Modals: `16px`.

---

## 5. Card Design
- Surface background, `1px` border, `radius 12px`, subtle shadow `0 1px 2px rgba(0,0,0,.06)`.
- Header: title (H2) + optional action on the right.
- Body: content; footer for secondary actions.
- Hover: border → `--primary`, shadow lifts slightly.

---

## 6. Buttons
- **Primary:** `--primary` bg, white text, radius 8px, padding `10px 16px`, weight 600.
- **Secondary:** transparent bg, `--border`, `--text`, hover surface tint.
- **Danger:** `--danger` bg (force-logout, delete).
- **Ghost:** text-only, accent on hover.
- Min height `40px`; disabled state 50% opacity + not-allowed cursor.
- Kiosk primary button: full-width, height `56px`, font `1.25rem`.

---

## 7. Input Fields
- Height `40px` (kiosk USN: `64px`, font `2rem`).
- Border `1px --border`, radius `8px`, padding `8px 12px`.
- Focus: `2px --accent` ring + border `--primary`.
- Placeholder: `--text-muted`.
- Error: border `--danger` + helper text below.
- Labels: `0.875rem` weight 500 above field.

---

## 8. Icons
- Inline SVG (no icon font dependency, offline-safe) or Unicode glyphs for non-critical.
- Stroke icons, `1.5` stroke width, `20px` default.
- Semantic: login ▶, logout ◀/⏻, search 🔍, download ⬇, force ⚠.

---

## 9. Animations
- Transitions: `120–180ms ease` for color/transform.
- Toast slide-in from top `200ms`.
- Card hover lift `120ms`.
- No full-page transitions; keep kiosk snappy.
- Respect `prefers-reduced-motion`: disable non-essential motion.

---

## 10. Loading Indicators
- Inline spinner (CSS) inside buttons on async actions.
- Kiosk: full-width centered pulse while processing transaction.
- Skeleton shimmer for list loading (admin).
- Disable submit while loading.

---

## 11. Toast Notifications
- Top-center (kiosk) / top-right (admin), `aria-live="polite"`.
- Variants: success (green left bar), error (red), info (blue), warning (amber).
- Auto-dismiss `3s`; manual close; stack vertically.
- Kiosk success toast large + high contrast (readable at 2m).

---

## 12. Dark Theme
- Applied via `data-theme="dark"`; toggle in Settings; persisted in `settings`.
- All tokens swap; charts re-read CSS vars.
- Default from `DEFAULT_THEME` env, overridable per-install.

---

## 13. Responsive Design
- **Kiosk:** target 1024×768+ touch display; USN input dominant; large tap targets.
- **Admin:** ≥ 768px; sidebar/header nav; cards in fluid grid (`repeat(auto-fill, minmax(240px,1fr))`).
- Tables: horizontal scroll on < 640px; sticky header.
- Breakpoints: `640 / 768 / 1024 / 1280`.

---

## 14. Design Language
- **Modern Enterprise, minimal.** Generous whitespace, restrained color, one accent.
- **Glassmorphism only where necessary** — e.g., modal/scrim overlays may use `backdrop-filter: blur` sparingly. Never on core data surfaces (readability first).
- **Keep UI minimal.** No decorative gradients; function over flourish.

---

## 15. Accessibility (summary)
- Contrast ≥ 4.5:1 (AA). Accent on dark text only.
- Focus-visible rings on all interactive elements.
- Toasts `aria-live`; buttons have discernible labels.
- Touch targets ≥ 44px; kiosk ≥ 56px.
