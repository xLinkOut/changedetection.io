# Phase 2 progress — Pulse

Status: **in progress**. The first vertical slice is working end-to-end.

Branch: `new-frontend`
Old UI: **untouched and fully available**.

## Delivered

### Backend

- `changedetectionio/api/v2/`:
  - `GET /api/v2/bootstrap`, `POST /api/v2/login`, `POST /api/v2/logout`,
    `POST /api/v2/locale`, `GET /api/v2/i18n/<locale>`.
  - `GET /api/v2/watches`, `POST /api/v2/watches`, `GET/PUT/DELETE
    /api/v2/watches/<uuid>`, `/watches/ids`, `/watches/bulk`.
  - Watch actions: recheck, clone, mark viewed, clear errors, clear history.
  - Watch history, snapshots, preview, screenshot, favicon, error details,
    filters preview, condition verify, AI summary start/poll, processor data,
    patch download, latest HTML, data package.
  - Regex extract-to-CSV preview/download over every snapshot.
  - Share-watch configuration through the changedetection.io share service
    (opt-in; history and notification settings stripped).
  - Groups: list/get/create/update/delete, unlink, mute, recheck.
  - Settings: read/update core sections, password, API key reset, notification
    log, notification test, system info.
  - Queue: snapshot, clear, cancel.
  - Import: newline URL list with tags/processor/paused/dedupe.
  - Backups: list/create/delete/download/restore.
  - Session + CSRF auth; JSON errors; no v1 API key in the browser.
- `changedetectionio/realtime/sse.py`:
  - bounded per-subscriber queues, ring-buffer replay, `Last-Event-ID`,
    gap `resync`, heartbeats, queue/stats/watch/group/notification/favicon/LLM
    events.
  - `GET /api/v2/events`.
- `changedetectionio/blueprint/pulse_ui/`:
  - `/pulse` SPA shell, Vite manifest injection, hashed assets, cache headers.
  - Shell is available without a session so it can draw the login screen.
- Small additive signals in `api/operations.py`, `worker_pool.py` and the
  notification runner. Existing Socket.IO and the legacy UI keep working.
- Italian catalog: Pulse strings appended/updated; `.po` and `.mo` compiled.
- Tests: `changedetectionio/tests/test_api_v2.py` covers the shell, bootstrap,
  CRUD, groups, settings, auth/CSRF and the SSE broker.

### Frontend

- Vite + React + TypeScript + Tailwind foundation.
- Mobile-first shell: desktop sidebar, mobile top bar + bottom tabs, 44px
  targets, safe-area padding, skip link.
- Light/dark/system theme, persisted locally and applied before first paint.
- Session login/logout, language picker, connection indicator.
- Dashboard: quick add + options (processor, groups, paused, AI intent when
  configured), search, status/tag/processor filters, sort, responsive
  table/cards, server-side pagination with the configured pager size, selection
  and bulk actions (pause, unpause, mute, unmute, recheck, mark
  viewed/unviewed, clear errors, tag, browser, proxy, clear history, delete).
- Watch detail: snapshot rail, from/to, line/word/character diff, side-by-side
  on desktop and stacked on mobile, diff filters, previous/next, download patch,
  AI summary card, preview highlights, screenshots, error text, price graph.
- Extract tab: regex over every snapshot, match/row preview, CSV download with
  validation, empty and error states.
- Share watch dialog (when enabled in Settings → Interface): uploads the
  trimmed configuration and shows a copyable import link.
- Collapsible dashboard banner: the hero and quick-add collapse to a slim live
  summary strip; the preference is remembered per browser and focus moves to
  the expand/collapse control.
- Watch edit: General, Request, Filters & Triggers, Conditions, Notifications,
  AI, Restock & Price, Stats. Live filter preview, condition verification,
  notification test, field errors, unsaved-changes guard, danger zone.
- Groups: list/create/edit/delete/unlink/mute/recheck, colour, URL pattern,
  matching watches, filters, AI, notifications, restock.
- Settings: General, Fetching, Global filters, Interface, API key,
  Notifications, AI/LLM, RSS, Proxies, Backups, Info.
- Queue, Import URL list, Notifications overview, Notification log.
- Legacy links for Browser Steps, Visual Selector, XLSX/Distill import, MCP,
  plugins, Apprise builder, advanced image diff, share-as-image and PWA.

### Visual refresh (2026-11-17)

- New identity: indigo/violet/azure/teal palette, waveform mark, aurora surfaces,
  signal spines on watch rows, live equalizers, floating mobile dock and a
  dark control-room sidebar. Full reference in `DESIGN.md`.
- SF Pro Display is first in the font stack, with system fallbacks.
- Command palette at ⌘K / Ctrl+K with server-side watch search and navigation.
- Diff change map/minimap: click a band to jump through the diff.
- Appearance and language controls in Settings → Interface, plus the top bar.
- Italian catalog refined for natural tone and completed for every Pulse string
  (840/840); product terms are consistent and technical names stay English.
- Notification success/failure is emitted by the worker and toasted live.
- Vendor chunks are split (`react`, `query`, `radix`, `diff`); the app entry is
  ~311 kB (76 kB gzip) and an edit no longer invalidates the framework chunk.

## Verified

- `pytest changedetectionio/tests/test_api_v2.py` — 7 passed (adds extract,
  share payload and pagination coverage).
- Existing `test_auth`, `test_api`, `test_api_tags`, `test_api_notifications`,
  `test_basic_socketio` — 24 passed.
- `npx tsc --noEmit` and `npm run build` pass.
- Browser smoke tests with headless Chrome at 360, 768 and 1280px, light and
  dark: dashboard, login (desktop + mobile), watch detail, watch edit, groups,
  settings, queue, import, filter preview, condition verify, bulk bar,
  command palette, appearance/language controls, Italian UI.
- Command palette: Ctrl+K, server search for "lamp", Enter opened the matching
  watch.
- Live SSE: a title changed through the API updated the open dashboard without
  a reload; the browser console had no errors.
- Local worker test: created a watch against a local HTTP server, ran three
  checks, read history/snapshots/preview/patch.
- Backup create/list/download/remove/restore smoke test.
- 500-watch benchmark: dashboard API ~7–13 ms; a 50-row page renders well
  under 0.3 s at 390×844.
- Screen-by-screen accessibility audit at 360 and 1280, light and dark, on 33
  screens (dashboard, add, groups, queue, import, notifications, every settings
  section and every watch tab/edit section): no missing accessible names, no
  unlabelled fields, no image-alt or heading-order errors, no duplicate IDs,
  no text-contrast failures. All keyboard stops have a visible focus ring.
- Keyboard checks: skip link is the first stop and appears at 44px; watch tabs
  and segmented controls respond to arrow keys with roving tabindex; dialogs
  trap focus and return it to the trigger; ⌘K traps Tab and restores focus.
- Extract CSV browser flow: regex with a capture group returned 3 matches,
  preview table and a `text/csv` attachment named `report-<uuid>.csv`.
- Share browser flow with a stubbed share response: dialog showed the import
  link, Copy changed to Copied, and focus returned to More actions.
- Pagination: with pager size 2 the dashboard showed page 1/3, Next moved to
  `?page=2`, and a page past the end clamps to the last page.
- Italian and English at 360/768/1280: no horizontal overflow on dashboard,
  extract, watch edit, settings, groups and share dialog.

## Known gaps for Wave 1

- Advanced screens remain legacy links by design: Browser Steps, Visual
  Selector, XLSX and Distill.io import, MCP, plugins, Apprise builder, advanced
  image diff, share-as-image, PWA install.
- No route-level lazy loading. Vendor chunks are split and the entry chunk is
  ~324 kB (79 kB gzip), so this is not currently a performance problem.
- Some technical labels from the backend (processor badges such as "Restock",
  sidebar mode values) remain English by design.

## Next

1. User review of this milestone and the remaining legacy links.
2. Decide when to redirect `/` to `/pulse` (only after explicit approval).
3. Plan Wave 2: Browser Steps, Visual Selector, XLSX/Distill import, MCP,
   plugins, Apprise builder.
