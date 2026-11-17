# Approved decisions and handoff

Status: **approved by the user on 2026-11-16**. Phase 2 may start after the context is compacted.
Branch: `new-frontend`
Old frontend: **untouched and still fully available**.
No application code has been written yet; only planning documents exist.

This document is the authoritative decision log. Where `PHASE-1-PLAN.md` disagrees with this file, **this file wins**.

---

## 1. Frontend name and route

- Working name: **Pulse**
- Route: **`/pulse`**
- The new UI is developed and served at `/pulse`.
- The old UI keeps its existing routes (`/`, `/edit/...`, `/diff/...`, `/settings`, etc.).
- After Pulse reaches parity for the essential tools and the user approves, `/` may redirect to `/pulse`. Until then, do not redirect.
- The name is a single constant. It can be changed later without changing the architecture.
- Suggested code identifiers: `pulse_ui` blueprint, `frontend/` source folder, `changedetectionio/static/pulse/` build output.

Why: a separate namespace lets the old and new UI coexist safely, avoids route collisions, and gives the user a clear way to compare them.

## 2. API strategy: new `/api/v2`

- The new frontend uses a **new browser-first API at `/api/v2`**.
- `/api/v2` is:
  - JSON-first,
  - authenticated with the **Flask session + CSRF** (same login as the UI),
  - shaped for the new UI's screens (dashboard rows, watch detail, settings, queue, SSE),
  - additive: it does not remove or modify `/api/v1`.
- `/api/v1` remains **unchanged** for external integrations, scripts, the Chrome extension, MCP, etc.
- The browser **never receives or uses the v1 API key**. There is no API key in the Pulse bootstrap.
- "Shallow-use old v1 when needed" means: a `/api/v2` handler may reuse the existing backend functions/datastore/service code that v1 also uses. It must not scrape v1 HTML and does not need to make an HTTP call to v1.
- If a v1 endpoint is already perfect and stable, a v2 handler can be a thin wrapper around the same backend function. The frontend only talks to v2.
- `/api/v2/events` is the SSE endpoint.

Why: session+CSRF is the natural auth for a same-origin browser app; it avoids exposing the long-lived API key to JavaScript and keeps v1's contract stable.

## 3. Wave 1 scope — essential tools

The first wave builds the essential tools in Pulse. Advanced screens remain reachable in the legacy UI via clearly marked "Open legacy screen" links.

### 3.1 In Pulse for Wave 1

- **Auth**: login, logout, password-disabled mode, redirect back, session handling.
- **Shell**: responsive layout, bottom tabs on mobile, sidebar on desktop, theme toggle (light/dark/system), connection indicator, toasts, error boundary.
- **Dashboard**:
  - watch list/cards with status, last checked, last changed, unread badge, favicon, tags, processor badge, error state, restock/price display,
  - search, tag/group filter, status filter (All/Unread/Deals/Errors/Healthy), processor filter,
  - sort, pagination/virtualization,
  - quick add (URL + Watch),
  - core bulk actions: pause, unpause, mute, unmute, recheck, mark viewed/unviewed, clear errors, delete,
  - select all matching, recheck all filtered, mark all viewed filtered,
  - live updates via SSE.
- **Watch detail**:
  - snapshot history and version selection,
  - diff viewer by **line, word, character**,
  - desktop side-by-side / mobile stacked,
  - diff filters (ignore whitespace, changes only, added/removed/replaced),
  - text preview with trigger/ignored/blocked highlighting,
  - screenshot and error screenshot,
  - error text,
  - AI change summary (when configured),
  - price/restock display and graph,
  - download patch,
  - recheck/edit/open actions.
- **Watch edit (core)**:
  - General: URL, title, tags, processor, link override, page title option, interval, schedule, timezone, history length.
  - Request: method, headers, body, fetcher, proxy, status codes, webdriver wait/JS.
  - Filters & Triggers: include/subtractive selectors, trigger/ignore/block text, extract text, text-processing options, live preview.
  - Conditions: ALL/ANY rules, field/operator/value, verify.
  - Notifications: mute, screenshot, filter-failure notification, Apprise URL list (plain editing), title/body/format, test, token help.
  - AI/LLM: enabled, intent, summary prompt, replace/append, group inheritance display.
  - Restock & price settings.
  - Stats: counts, timings, capabilities, token usage.
  - Save, delete, clear history.
  - Validation errors mapped to fields, unsaved-changes guard.
- **Groups**:
  - list with counts,
  - create, edit, delete, mute, recheck,
  - colour, URL auto-apply pattern, matching-watch preview,
  - group AI settings,
  - group notifications,
  - group restock overrides.
- **Global settings (core)**:
  - General, Fetching, Global Filters, UI Options, API key display/reset, Notifications (basic), AI/LLM provider, RSS, Time & Date, Proxies & Extra Browsers, Backups (create/list/download/remove/restore), Info.
- **Import**:
  - plain newline URL list with optional tags and processor.
- **Queue**:
  - worker/queue snapshot, cancel running, clear queue, live via SSE.
- **Realtime**:
  - one SSE stream, event IDs, Last-Event-ID replay, heartbeats, one refetch after reconnect, connection indicator.
- **i18n**:
  - English source, Italian catalog.
- **Quality**:
  - 360px / 768px / 1280px, light/dark, keyboard, 44px targets, empty/loading/error states, 500+ watch performance.

### 3.2 Legacy in Wave 1 (linked from Pulse, not rebuilt yet)

These screens/features stay fully usable in the old UI. Pulse shows a clear "Open legacy screen" link.

- Browser Steps (live browser interaction).
- Visual Selector (screenshot element selection).
- XLSX import (Wachete/custom mapping) and Distill.io import.
- MCP server settings, access tokens, OAuth grants.
- Plugin settings tabs and plugin-specific per-watch settings.
- Apprise notification URL builder (Pulse still allows editing the URL list and sending a test).
- Advanced image-diff settings/visualization.
- Share-a-diff-as-image.
- MCP OAuth consent page.
- PWA install page/QR (the existing manifest/service worker continue to work).

### 3.3 Later waves

Port the legacy items above, one at a time, starting with Browser Steps and Visual Selector only after the core Pulse screens are stable. Do not delete the legacy pages until the port is complete and the user agrees.

## 4. Priorities

1. Homepage / dashboard.
2. Single-watch edit screen.
3. Watch detail (diff, preview, screenshot, price).
4. Basic settings, groups, import URL list, queue, SSE.
5. AI/LLM in the watch edit and global settings (**Must** for Wave 1).
6. Advanced/legacy screens later.

The user explicitly cares most about the homepage, the single-website edit screen, and the basic screens.

## 5. Translations

- **English is the source language.**
- **Italian is the only additional locale in Pulse for Wave 1.**
- Other locales fall back to English in Pulse.
- The old UI keeps all 25 locales.
- Reuse existing Italian `.po` strings where they match; new Pulse strings are added to the Italian catalog.
- Design `t()` / `tn()` so more locales can be added later without refactoring.
- Do not block Wave 1 on translating all 25 locales.

## 6. What is explicitly not changing

- `/api/v1` behavior and contract.
- Old templates, old JS, old CSS, old routes.
- Old UI availability.
- MCP, RSS and plugin backend behavior.
- The user's datastore format.

## 7. Resume checklist after context compaction

Read these files first:

1. `docs/new-frontend/DECISIONS.md` (this file)
2. `docs/new-frontend/PHASE-0-EXPLORATION.md`
3. `docs/new-frontend/PHASE-1-PLAN.md` (already updated for `/pulse` and `/api/v2`)
4. `docs/new-frontend/README.md`

Then start Phase 2:

1. Create the `/api/v2` blueprint and auth decorators (session + CSRF, JSON errors).
2. Add the SSE broker and `GET /api/v2/events`.
3. Add bootstrap/login/logout/session endpoints.
4. Add the v2 dashboard/watch/tag/settings/queue/import endpoints needed for Wave 1.
5. Scaffold `frontend/` (Vite + React + TS + Tailwind).
6. Build the Pulse shell, theme, API client, login, SSE client.
7. Continue with the Wave 1 screens in the order above.

## 8. Key paths

- Old frontend templates: `changedetectionio/templates/`, `changedetectionio/blueprint/*/templates/`
- Old static JS/CSS: `changedetectionio/static/js/`, `changedetectionio/static/styles/`
- Flask app factory: `changedetectionio/flask_app.py`
- API v1: `changedetectionio/api/`
- Realtime (Socket.IO, to be left alone): `changedetectionio/realtime/`
- Store/model: `changedetectionio/store/`, `changedetectionio/model/`
- Translations: `changedetectionio/translations/`
- New frontend source (to be created): `frontend/`
- New built assets (to be created): `changedetectionio/static/pulse/`
- New Flask blueprint (to be created): `changedetectionio/blueprint/pulse_ui/`
- New API v2 (to be created): `changedetectionio/api/v2/` or `changedetectionio/api/v2.py`

## 9. Working rules

- Small commits with clear messages.
- No code in the old frontend until the new one is at parity and the user agrees.
- No polling for live data in Pulse; SSE only.
- Mobile-first: 360px first, then 768px, then 1280px.
- Light and dark themes.
- No Node.js at runtime.
- Never fake a feature. If it is legacy, link to it and mark it as legacy.
- Keep the old UI fully usable as the fallback.

## 10. Open items

- Whether to remove the legacy fallback after approval: later decision.
- Advanced screens port order: after Wave 1, starting with Browser Steps and Visual Selector.
- API v2 versioning policy: additive changes in v2; breaking changes would create v3. Do not remove v1.
- Keyboard/a11y audit: focus states and the command palette exist; a full screen-by-screen audit is still pending.

## 11. Amendment — 2026-11-17: visual direction and language

The user asked Pulse to stop looking like a generic dashboard. These decisions
supersede the neutral visual defaults in the Phase 1 plan.

- **Palette**: `#5347CE` indigo, `#887CFD` violet, `#4896FE` azure, `#16C8C7`
  teal. Used as one gradient for primary actions, the mark, active states and
  signal traces; tinted neutrals around it.
- **Font**: **SF Pro Display** first in the stack, with SF Pro Text,
  `-apple-system`, Inter, Segoe UI Variable, Ubuntu Sans and system fallbacks.
  SF Pro is not redistributed; Apple devices use the installed face.
- **Identity**: signal/pulse language throughout — waveform mark, real live
  equalizer, state-coloured signal spine on watch rows, aurora surfaces, a
  clickable diff change map. No fake data drives any animation.
- **Motion**: opacity page entrance, hover lift, unread sheen, checking scan;
  all disabled under `prefers-reduced-motion`. Page entrance must not use a
  transform, because it would break fixed action bars.
- **Command palette**: ⌘K / Ctrl+K opens a server-backed watch search and
  navigation palette.
- **Appearance controls**: theme and language also live in
  Settings → Interface, so they are reachable on phones without crowding the
  header.
- **Italian**: non-literal, natural tone. `Live` and `Offline` stay English;
  a watch is a **monitoraggio**; healthy is **Attivo**; restock is
  **Disponibilità**; technical names stay untranslated. All Pulse strings have
  Italian translations.
- **Diff**: add a change map/minimap (was a known Wave 1 gap).
- **Notifications**: emit `notification_sent` from the worker so Pulse can toast
  success/failure instead of assuming delivery.
- **Build**: vendor chunks are split so app edits do not invalidate framework
  code in browser caches. Production remains static; Node is development-only.
- **Accessible action gradient**: the exact four colours remain on the mark,
  aurora and traces; text-bearing gradients use darker stops (`#6555D6`,
  `#2A6DBF`, `#0B7F7D`) so white labels pass WCAG AA. Muted text and success/info
  inks were darkened for the same reason.
- **Pagination**: the dashboard now pages on the server using the existing
  pager-size setting, replacing the progressive 60-row DOM. Page size 0 still
  means "show everything".
- **Regex extract-to-CSV** is restored in Pulse as a watch tab, with preview
  and download, using the same report format as the classic page.
- **Share watch** is restored behind the existing opt-in setting, with the same
  trimmed payload as the classic share button. History and notification keys
  are stripped.
- **AI intent in quick add** is restored when an LLM is configured.
- **Accessibility**: every screen was audited at 360/1280 in light/dark for
  names, labels, heading order, duplicate ids, focus visibility, tap targets
  and contrast. Dialogs and the command palette trap/return focus; tabs and
  segmented controls use arrow keys and roving tabindex.

Full visual reference: [`DESIGN.md`](./DESIGN.md).
