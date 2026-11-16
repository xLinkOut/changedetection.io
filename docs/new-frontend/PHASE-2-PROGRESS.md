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
- Dashboard: quick add + options, search, status/tag/processor filters, sort,
  responsive table/cards, progressive loading, selection and bulk actions
  (pause, unpause, mute, unmute, recheck, mark viewed/unviewed, clear errors,
  tag, browser, proxy, clear history, delete).
- Watch detail: snapshot rail, from/to, line/word/character diff, side-by-side
  on desktop and stacked on mobile, diff filters, previous/next, download patch,
  AI summary card, preview highlights, screenshots, error text, price graph.
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

## Verified

- `pytest changedetectionio/tests/test_api_v2.py` — 5 passed.
- Existing `test_auth`, `test_api`, `test_api_tags`, `test_api_notifications`,
  `test_basic_socketio` — 24 passed.
- `npx tsc --noEmit` and `npm run build` pass.
- Browser smoke tests with headless Chrome at 360, 768 and 1280px, light and
  dark: dashboard, login, watch detail, watch edit, groups, settings, queue,
  import, filter preview, condition verify, bulk bar.
- Live SSE: a title changed through the API updated the open dashboard without
  a reload.
- Local worker test: created a watch against a local HTTP server, ran three
  checks, read history/snapshots/preview/patch.
- Backup create/list/download/remove/restore smoke test.

## Known gaps for Wave 1

- The Italian catalog covers the main screens; some newer strings still fall
  back to English.
- Dashboard uses progressive loading (60 at a time) rather than true row
  virtualization.
- Diff minimap is not built.
- Regex extract-to-CSV is not rebuilt; the legacy diff page is available.
- Share-watch-config API is not rebuilt.
- Advanced screens remain legacy links: Browser Steps, Visual Selector, XLSX
  and Distill.io import, MCP, plugins, Apprise builder, advanced image diff,
  share-as-image, PWA install.
- Keyboard/a11y audit and a 500+ watch performance test still need a dedicated
  pass.
- `npm run build` warns about a >500 KB entry chunk; route-level code splitting
  is planned for the quality pass.

## Next

1. Add a generic error summary in watch edit for server errors not tied to a
   visible field.
2. Add diff minimap and regex extract-to-CSV.
3. Add true virtualization or tune the 60-item window for 500+ watches.
4. Run axe/keyboard audit at 360/768/1280 and light/dark.
5. Add remaining Italian strings.
6. User review of the first milestone.
