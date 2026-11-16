# Phase 0 — Repository exploration

Repository: `dgtlmoon/changedetection.io`
Branch inspected: `master` at `fdce0842`
Version: `0.70.3`
Working branch for this project: `new-frontend`
Date: 2026-11-16

This document answers the Phase 0 questions. No application code was written.

---

## a) How is the current frontend built and served?

The current frontend is a **server-rendered Jinja2 application**, not a single-page app.

- **Templates**
  - Shared shell: `changedetectionio/templates/base.html`
  - Global navigation: `templates/sidebar-nav.html`, `templates/menu.html`
  - Dashboard: `blueprint/watchlist/templates/watch-overview.html` + `watch-overview-single-row.html`
  - Watch edit: `blueprint/ui/templates/edit.html` + `templates/edit/*.html` + `templates/_common_fields*.html`
  - Diff / preview: `blueprint/ui/templates/diff.html`, `preview.html`
  - Queue: `blueprint/ui/templates/queue.html`
  - Settings: `blueprint/settings/templates/settings.html`, `settings-tabs.html`, `blueprint/settings/llm/templates/*`
  - Groups: `blueprint/tags/templates/groups-overview.html`, `edit-tag.html`
  - Import/backups: `blueprint/imports/templates/import.html`, `blueprint/backups/templates/*`
  - Login: `templates/login.html`
  - Processor-specific tabs: `processors/*/templates/*`
  - Plugin templates: `example_plugins/*/templates/*`

- **CSS**
  - `pure-min.css` (Pure CSS framework)
  - `flag-icons.min.css`
  - One large compiled `styles.css` produced from SCSS (`static/styles/scss/*.scss`) via the `sass` CLI (`static/styles/package.json`).
  - Additional page-specific `diff.css`, `diff-image.css`.
  - Cache busting is added by Flask (`_fingerprint_static_urls`, `?v=`), not by a bundler.

- **JavaScript**
  - jQuery 3.6 is loaded on every page.
  - Feather icons, Socket.IO client, Toastify.
  - ~30 hand-written global scripts in `static/js/` (`realtime.js`, `watch-overview.js`, `tabs.js`, `visual-selector.js`, `browser-steps.js`, `notifications.js`, `global-settings.js`, `diff-render.js`, `diff-overview.js`, `queue-sparkline.js`, etc.).
  - Many pages also contain inline `<script>` blocks with page-specific URLs and data.
  - No module bundler, no TypeScript, no React/Vue. No Node.js is required at runtime.

- **Serving**
  - Flask serves all HTML routes, static assets (`/static/<group>/<filename>`), dynamic screenshots (`/static/screenshot/<uuid>`), favicons (`/static/favicon/<uuid>`), and visual-selector data (`/static/visual_selector_data/<uuid>`).
  - `base.html` embeds CSRF token, Socket.IO path, auth flag, and client-side translation strings.
  - The PWA manifest and service worker have dedicated routes.

- **Rendering model**
  - WTForms + server-side validation.
  - Classic POST → redirect → flash pattern for most mutations.
  - Some AJAX: Socket.IO operations, notification test, browser steps, visual selector, filter preview, condition verify, LLM summary, queue JSON, Apprise builder.

- **Theme**
  - `data-darkmode="auto|true|false"` on `<html>`.
  - Cookie `css_dark_mode` overrides `prefers-color-scheme`.
  - `toggle-theme.js` updates the cookie and reacts to system changes.

---

## b) How does the backend authenticate users and API calls?

### Browser / UI authentication

- **Flask-Login** with a single hard-coded user (`defaultuser@changedetection.io`).
- The session is Flask's signed cookie, secret stored in `<datastore>/secret.txt`.
- `PERMANENT_SESSION_LIFETIME` is ~10 years.
- Password is stored as base64(`salt` + PBKDF2-HMAC-SHA256(password, salt, 100000)) in:
  - `settings.application.password` in the datastore, or
  - the `SALTED_PASS` environment variable (base64, takes precedence).
- `User.check_password()` compares the PBKDF2 result. There is no username.
- Login route: `GET/POST /login` with Flask-WTF CSRF token; `flask_login.login_user(user, remember=True)`.
- Logout: `POST /logout`; optional validated `redirect` parameter.
- `before_request check_authentication()` requires login for all routes when a password is set, with explicit exemptions:
  - static assets and flag icons,
  - PWA manifest/service worker,
  - language selection,
  - any endpoint containing `login`,
  - shared-diff endpoints when `shared_diff_access` is enabled,
  - safe HTTP methods listed in `flask_login.config.EXEMPT_METHODS`,
  - batch mode / `LOGIN_DISABLED`,
  - RSS blueprint (uses its own token),
  - `/socket.io/`,
  - `/api/` (the API has its own authentication),
  - MCP and MCP OAuth endpoints.
- CSRF protection is global via `Flask-WTF CSRFProtect`, except for the REST API (`csrf.exempt`) and selected MCP endpoints.
- Sensitive static files have extra checks: `screenshot`, `favicon`, and `visual_selector_data`.
- `shared_diff_access` allows anonymous access to the watch history/diff page while a password is enabled.

### API authentication

- REST API lives under `/api/v1/`.
- `api/auth.py::check_token`:
  - If `settings.application.api_access_token_enabled` is true, the request must send `x-api-key: <settings.application.api_access_token>`.
  - If that setting is false, the API is accessible without a key.
- API token is 32 hex chars, generated at startup, shown in Settings → API, and can be regenerated.
- API routes are CSRF-exempt because API-key clients cannot obtain a CSRF token.
- `CORS(app)` is enabled globally.
- MCP has a separate bearer-token / OAuth system with per-tool permissions.
- RSS has a separate `rss_access_token` query parameter.

### Implications for the new frontend

- The SPA shell can be served to anonymous users and show its own login screen, but every data API must remain protected.
- A new UI needs a JSON session/bootstrap endpoint, a JSON login/logout, and a CSRF token the SPA can send in `X-CSRFToken`.
- `EventSource` cannot send custom headers. The SSE endpoint must authenticate with the Flask session cookie.
- The new UI will use **session + CSRF for its own UI API endpoints**, and the **existing `x-api-key` mechanism for the existing public API** (the key can be supplied to the authenticated SPA via a bootstrap request). This avoids changing the public API's authentication behavior.

---

## c) Which API endpoints exist, and what is missing?

### Existing REST API (`docs/api-spec.yaml` and `changedetectionio/api/`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/watch` | List watches. Filters: `tag`, `with_errors=1`; `recheck_all` queues the filtered set. |
| POST | `/api/v1/watch` | Create a watch. Accepts all writable watch fields, processor config, tags. |
| GET | `/api/v1/watch/{uuid}` | Get one watch. Query flags: `recheck`, `paused=paused/unpaused`, `muted=muted/unmuted`. |
| PUT | `/api/v1/watch/{uuid}` | Update watch fields / processor config. |
| DELETE | `/api/v1/watch/{uuid}` | Delete watch and history. |
| GET | `/api/v1/watch/{uuid}/history` | List snapshot timestamps. |
| DELETE | `/api/v1/watch/{uuid}/history` | Clear all snapshots, keep watch. |
| GET | `/api/v1/watch/{uuid}/history/{timestamp}` | Get one snapshot. `?html` returns last fetched HTML as text/plain attachment. `timestamp=latest`. |
| GET | `/api/v1/watch/{uuid}/difference/{from}/{to}` | Render a diff. Supports `format`, `word_diff`, `no_markup`, `type`, `changesOnly`, `ignoreWhitespace`, `removed`, `added`, `replaced`. `from=previous`, `to=latest`. |
| GET | `/api/v1/watch/{uuid}/favicon` | Favicon image. |
| GET | `/api/v1/tags` | List tags (minimal fields). |
| POST | `/api/v1/tag` | Create tag. |
| GET | `/api/v1/tag/{uuid}` | Get tag; query flags `recheck`, `muted=muted/unmuted`. |
| PUT | `/api/v1/tag/{uuid}` | Update tag fields (inherits WatchBase + tag fields). |
| DELETE | `/api/v1/tag/{uuid}` | Delete tag and remove it from watches. |
| GET | `/api/v1/notifications` | Get global notification URLs. |
| POST | `/api/v1/notifications` | Add notification URLs. |
| PUT | `/api/v1/notifications` | Replace notification URLs. |
| DELETE | `/api/v1/notifications` | Remove notification URLs. |
| GET | `/api/v1/search` | Search watch title/URL/error. Requires `q`; optional `tag`, `partial`. |
| GET | `/api/v1/changes` | All changes across watches/tags between dates; unified or JSON. |
| POST | `/api/v1/import` | Import newline-separated URLs; query-param watch config, tags, dedupe, proxy. |
| GET | `/api/v1/systeminfo` | Counts, queue size, checking-now list, overdue watches, processors, version, uptime. |
| GET | `/api/v1/full-spec` | Live merged OpenAPI spec. |

### What the old UI can do with **no API endpoint**

These are the gaps the new UI must cover, either by reusing an existing JSON endpoint that is not under `/api/v1` or by adding minimal endpoints.

| Area | Gap |
|---|---|
| Session/auth | No JSON `login`, `logout`, `session/bootstrap`, or CSRF-token endpoint. |
| Realtime | No SSE endpoint (old UI uses Socket.IO). |
| Global settings | No read/write API for `settings.application`, `settings.requests`, UI options, password, API key, shared diff, empty-page behaviour, RSS, proxies, extra browsers, timezone, workers, jitter, timeout, user-agent, global filters, history limits, notification title/body/format/base URL. |
| API key | No API to read/regenerate the key (only the HTML settings page). |
| Global pause/mute | No API; only form POST routes. |
| Bulk watch operations | No API for pause/unpause/mute/unmute/recheck/mark viewed/mark unviewed/tag/set browser/set proxy/use default notifications/clear errors/clear history/delete in one call. |
| Filtered bulk actions | No API for "mark all viewed in this filtered view" or "recheck all in this filtered view" (the public API only has `recheck_all` on list). |
| Queue | `/queue.json`, `/queue/clear`, `/queue/cancel-running` exist as UI routes (session + CSRF), not as `/api/v1` endpoints. Clear returns a redirect, not JSON. |
| Watch actions | Clone, share to changedetection.io, mark viewed/unviewed, clear errors, recheck (public API has side-effecting GET), latest HTML download, watch data-package download. |
| Tag/group actions | Unlink all watches, delete all tags, mute/recheck (side-effecting GET exists), tag watch counts, full tag list fields. |
| Screenshots | Only `/static/screenshot/<uuid>`; no API image endpoint (or error screenshot). |
| Visual selector | Only `/static/visual_selector_data/<uuid>` (deflated JSON); no decompressed JSON API. |
| Browser Steps | `/browser-steps/*` JSON-ish endpoints exist, but they are UI routes with form-encoded bodies and session auth, not `/api/v1`. |
| Add-watch live preview | `/add-watch-ui/snapshot` returns JSON, but is a UI route, not `/api/v1`. |
| Filter preview | `/edit/<uuid>/preview-rendered` (POST) returns preview HTML/text; no JSON API. |
| Conditions verify | `/conditions/<uuid>/verify-condition-single-rule` (POST) returns JSON; UI route only. |
| LLM | Generate/status summary routes, prompt route, model list, clear cache; no `/api/v1` equivalent. Summary generation is asynchronous and polled. |
| Diff extras | Processor data, processor chart, processor XLSX export, extract-to-CSV, download patch; UI routes only. |
| Import | API only accepts plain newline URLs. XLSX (Wachete/custom mapping) and Distill.io JSON are UI-only. |
| Backup/export | Create/list/download/remove backups, restore backup; UI-only. No watch-config export. |
| Notifications | Apprise service catalog, service schema, URL builder, test send, debug logs; UI routes only (some return JSON). |
| Plugin settings | Global plugin setting tabs and per-watch plugin request settings; dynamic WTForms/templates, no API. |
| MCP | Enable/disable, note, public URL, anonymous read, access tokens, OAuth grants; UI routes, some return HTML fragments. |
| i18n | Language list and translation catalogs are server-rendered; no JSON catalog endpoint. |
| Timezones | Server passes `available_timezones` to templates; no API endpoint. |
| PWA | Manifest/service worker/install QR exist; no API needed. |
| OAuth consent | MCP OAuth consent page is server-rendered; can remain. |

### Existing JSON endpoints that are not under `/api/v1` and can be reused

These already return JSON (or serve binary data) and are good candidates for direct use by the new UI. They are session-auth protected, so they need the SPA session cookie and CSRF header where applicable.

- `GET /queue.json` — queue/worker snapshot.
- `POST /queue/cancel-running` — cancel a running watch.
- `GET /settings/notifications/apprise/services`
- `GET /settings/notifications/apprise/service/<schema>`
- `POST /settings/notifications/apprise/build`
- `POST /notification/send-test` and `/notification/send-test/<uuid>`
- `GET /settings/ai/llm/models`
- `POST /browser-steps/browsersteps_start_session?uuid=...`
- `POST /browser-steps/browsersteps_update?uuid=...&browsersteps_session_id=...`
- `GET /browser-steps/browsersteps_image?uuid=...&step_n=...`
- `POST /add-watch-ui/snapshot`
- `POST /edit/<uuid>/preview-rendered`
- `POST /conditions/<uuid>/verify-condition-single-rule?rule=<json>`
- `POST /diff/<uuid>/llm-summary` and `GET /diff/<uuid>/llm-summary`
- `GET /diff/<uuid>/processor-data`, `/processor-chart`, `/processor-export.xlsx`
- `GET/POST /diff/<uuid>/extract`
- `GET /diff/<uuid>/download-patch`
- `GET /static/screenshot/<uuid>` and `?error_screenshot=1`
- `GET /static/visual_selector_data/<uuid>`
- `GET /static/favicon/<uuid>`

---

## d) How is "realtime" done today? Which screens use it?

### Transport

- **Socket.IO** via Flask-SocketIO, default `async_mode='threading'` (`SOCKETIO_MODE=threading`; optional gevent).
- Server: `changedetectionio/realtime/socket_server.py`
- Client: `changedetectionio/static/js/realtime.js`
- The Socket.IO client is loaded only when `ui.socket_io_enabled` is true (default true).

### Events emitted

| Event | Payload | Used by |
|---|---|---|
| `watch_update` | `{watch: {uuid, checking_now, queued, unviewed, has_error, has_favicon, notification_muted, paused, history_n, last_checked, last_checked_text, last_changed_text, error_text, fetch_time}}` | Dashboard rows, checking indicator. |
| `queue_size` | `{q_length, event_timestamp}` | Sidebar queue badge, queue page. |
| `checking_now` | `{count, event_timestamp}` | Sidebar / mobile drawer. |
| `general_stats_update` | `{count_errors, unread_changes_count}` | Unread badge, "Mark all viewed" visibility. |
| `watch_deleted` | `{uuid}` | Removes row. |
| `watch_bumped_favicon` | `{uuid}` | Refreshes favicon. |
| `watch_small_status_comment` | `{uuid, status}` | "Connecting…" text in the row. |
| `notification_event` | `{watch_uuid}` | Logged only; no UI effect today. |
| `llm_summary_ready` | `{uuid, from_version, to_version}` | Diff page stops polling for the AI summary. |
| `toast` | `{message, type}` | Server-driven feedback after bulk operations. |
| `operation_result` | `{success, operation, uuid, error}` | Per-row pause/mute/recheck feedback. |

### Screens with live behaviour

- Watch dashboard: row status, unread, errors, queue/checking counts, favicon, bulk operation toasts.
- Queue page: live worker slots and queued items, but **also polls `/queue.json` every 8 seconds** (`setInterval`). There is a one-second timer only for elapsed labels.
- Watch edit: "checking now" indicator on the row/body, small status text.
- Diff page: AI summary ready event; the old page starts summary generation and polls `GET /diff/<uuid>/llm-summary` until done (the Socket.IO event is an optimization).
- Sidebar: queue badge, checking-now count, live queue sparkline (`queue-sparkline.js`).
- Theme: `toggle-theme.js` uses `setInterval` to follow system theme changes (not data polling).
- Notification event is emitted but not rendered.

### Not realtime today

- Tag/group lists and counters.
- Global settings.
- Import progress.
- Backups progress.
- Notification log.
- Watch creation/update from another tab (only `watch_update` after a check; no explicit created/updated event).
- Queue page still polls; this is the main polling loop in the UI.

---

## e) How is the app served in production? Why does it matter for SSE?

- **Docker image**: `python:3.11-slim-bookworm`, dependencies installed with `uv`, app copied to `/app`, default command `python ./changedetection.py -d /datastore`.
- **Server**: `changedetectionio/__init__.py` calls `socketio.run(app, host, port, allow_unsafe_werkzeug=True)` (or `app.run` if Socket.IO disabled). This is Werkzeug's built-in threaded WSGI server, not gunicorn.
- **Process model**: one Python process, many threads:
  - Flask request threads (one per request),
  - async worker pool (`FETCH_WORKERS`, default 10),
  - scheduler/ticker thread,
  - notification queue thread,
  - Socket.IO thread(s).
- **No gunicorn/uwsgi/waitress** in the default image or compose file. The `realtime/README.md` mentions gunicorn only as an optional example.
- **Single-process assumption** is important: all in-memory state (queues, worker pool, Socket.IO, future SSE broker) is process-local. Running multiple gunicorn workers would split queues and realtime state unless an external broker is added.
- **SSE implications**:
  - Werkzeug threaded can hold SSE connections, but each connection consumes a thread. A handful of tabs is fine; hundreds of concurrent SSE clients would need a different server.
  - Reverse proxies must disable buffering for `text/event-stream` and allow long-lived connections (`proxy_buffering off`, `X-Accel-Buffering: no`, long `proxy_read_timeout`).
  - `Flask-Compress` must not compress/stream-buffer the event stream. Its current MIME list does not include `text/event-stream`, but the response should explicitly set `Cache-Control: no-cache, no-transform` and `X-Accel-Buffering: no`.
  - If the deployment is changed to gunicorn, use `gthread` with enough threads for SSE clients (or gevent), or add a shared broker. The plan will document this and keep the default single-process setup working.
  - Sub-path deployments (`USE_X_SETTINGS` + `X-Forwarded-Prefix`) must be respected by EventSource URLs; use the bootstrap `basePath`.

---

## f) Does the project have translations? How do they work?

Yes. There are 25 locales in `changedetectionio/translations/` plus an optional overlay directory.

- **Catalogs**: `changedetectionio/translations/<locale>/LC_MESSAGES/messages.po` and compiled `.mo`.
- **Extraction**: `babel.cfg` extracts from Python (`**.py`) and Jinja2 (`**.html`) only, with keywords `_`, `_l`, `gettext`, `ngettext`, `pgettext`, `lazy_pgettext`.
- **Build**: `python setup.py extract_messages`, `update_catalog`, `compile_catalog`; CI checks the catalog is in sync and the Dockerfile runs `pybabel compile`.
- **Overlay**: `TRANSLATION_OVERLAY_DIR` (default `changedetectionio/translations_overlay/`) merges per-message overrides on top of the base catalog.
- **Runtime**: Flask-Babel chooses locale from `session['locale']`, then `Accept-Language`, then `en_GB`.
- **Language switching**: `POST /set-language/<locale>` stores the locale in the session; `POST /ui/language/auto-detect` clears it. Both work on the login page too.
- **Client-side strings**: `base.html` injects a `window.i18n` object and `window.i18nT()` for JS strings; many JS files still hard-code English fallbacks.
- **Dates/numbers**: server-side Jinja filters use `timeago` and Babel (`format_price`, `format_int_locale`); JS uses `Intl` for some queue counts.
- **Notification templates** are Jinja2 templates evaluated server-side; they are not UI translations.
- **Short timeago forms** are routed through gettext (`_l`) and registered at runtime.

### How the new UI will keep translations

1. A new endpoint `GET /api/v1/ui/i18n/<locale>` returns a JSON map of `msgid → msgstr` from the existing `.po` catalogs (cached, one locale at a time). English (`en_GB`) is the fallback.
2. The React `t()` helper uses those msgids. Existing strings that are already translated can be reused verbatim.
3. New UI strings are wrapped in `t('…')`; a small extraction script scans `frontend/src/**/*.tsx` and merges new msgids into `messages.pot` / `.po` files, so the existing translation workflow still works.
4. Plural strings use `Intl.PluralRules` plus the catalog's plural forms for the small number of cases that need it; everything else uses `t()`.
5. Dates, relative times, numbers, and prices use `Intl.DateTimeFormat` / `Intl.NumberFormat` with the same locale from the bootstrap/session. Server-side notification rendering is untouched.
6. The language picker calls the existing `/set-language/<locale>` route (or a new JSON alias) and then reloads the catalog.
7. If a string has no translation yet, English is shown. No existing translation is discarded.

---

## g) Complete inventory of screens, forms and actions in the current UI

### 1. Global shell

- Desktop left sidebar / mobile drawer:
  - Logo (home).
  - Add a page watch (only when a visual browser is configured).
  - Page Watches (with unread badge).
  - Watch Groups.
  - Import.
  - Browsers (disabled, "soon").
  - Search (opens modal; Alt+S).
  - Queue (with queue size badge).
  - Notifications.
  - Plugin-added sidebar items.
  - Checking now count, live queue sparkline, version, new-version notice.
- Top bar:
  - Current diff/preview title + URL (on those pages).
  - Pause/resume all scheduling.
  - Mute/unmute all notifications.
  - Logout (when authenticated).
  - Settings.
  - Language selector (flag + modal with 25 languages + auto-detect).
  - AI mode toggle (if configured) and link to AI settings.
  - Light/dark toggle.
  - GitHub link.
  - Mobile hamburger + drawer.
- Global overlays:
  - Chrome extension / support overlay.
  - Language modal.
  - LLM-not-configured modal.
  - Search modal (q; scoped to current tag).
  - Checking-now fixed tab.
  - Realtime offline indicator.
  - Toasts (server flash messages + Socket.IO toasts).

### 2. Dashboard (`/`)

- Quick add form: `url` (required), `processor`, `llm_intent` (if AI configured), Watch button.
- Top tag bar: All + each tag (colored).
- Status segmented control: All, Unread (count), Deals (count), With errors (count), Healthy (count).
- Processor filter: All types + each processor with count (when more than one).
- Mark all viewed (filtered), Recheck all (filtered), RSS feed link.
- Selection toolbar:
  - Close selection, Invert.
  - Pause, UnPause, Mute, UnMute, Recheck.
  - Tag (prompt for tag name), Browser (modal), Proxy (modal).
  - Mark viewed, Mark unviewed.
  - Use default notification, Clear errors.
  - Clear/reset history (confirm), Delete (confirm).
  - "All N on this page selected / Select all N matching / Clear selection" banner.
- Table columns:
  - Select checkbox + date-created sort.
  - Pause + mute toggles (and sort by each).
  - Processor badge.
  - Web page: favicon, title/page title/URL, external link, tags, error text, plugin extra text, LD-JSON price switch offer, status icons (share, browser, PDF, browser steps).
  - Restock & price (when any watch uses restock): in stock/not in stock, price, price change %.
  - Checked (relative time, spinner + status when checking).
  - Changed (relative time).
  - Actions: Recheck/Queued, Edit, History/Summary, Preview.
- Pagination (pager size from settings, 0 disables).
- Empty state with "import a list" link.
- Sort by date_created, label/title, paused, muted, last_checked, last_changed; direction.
- Search filters by title, URL, and last error.
- Tag filter; processor filter; status filter.
- Cookie persistence of sort/order.
- PWA share-target prefill (`?pwa_preset_url=...`).

### 3. Add watch page (`/add-watch-ui/`)

- URL + Go (live preview).
- Live visual selector pane: empty state, spinner, error, screenshot + canvas, current XPath.
- Processor selector.
- Browser selector (only browsers capable of screenshots + element data; system default may be disabled with explanation).
- Select by element checkbox (when AI configured), clear selection.
- LLM intent textarea (when AI configured).
- Group/tag text field (creates tags by name).
- Watch (submit) and Edit > Watch (submit paused).
- Hidden `include_filters`, `temporary_uuid`.

### 4. Watch edit (`/edit/<uuid>`)

Tabs are conditional on processor/fetcher capabilities and `LLM_FEATURES_DISABLED`.

**General**
- `url` (required; Jinja2 variables allowed).
- `tags` (comma-separated names; creates tags).
- `processor` (radio).
- `title`.
- `link_to_open` (optional).
- `use_page_title_in_list` (ternary: system/yes/no).
- `time_between_check_use_default` (boolean).
- `time_between_check` (weeks, days, hours, minutes, seconds) when not using default.
- Scheduler (`time_schedule_limit`): enabled; per-day enabled, start time, duration hours/minutes; timezone.
- `history_snapshot_max_length`.

**Request** (when processor supports request type)
- `fetch_backend` (radio: system default + installed fetchers + extra browsers).
- `proxy` (radio: default + configured proxies; "Check/Scan all" button).
- `webdriver_delay` (Chrome wait seconds).
- `webdriver_js_execute_code` (advanced).
- `method` (GET/POST/PUT/PATCH/DELETE/OPTIONS).
- `body` (advanced).
- `headers` (key: value textarea; advanced; external headers file warning).
- `ignore_status_codes`.
- Plugin-provided request settings sections.

**Browser Steps** (when supported)
- Start live browser session; screenshot/canvas; 10+ step rows.
- Each step: `operation` (Check checkbox, Click X,Y, Click element if exists, Click element, Click element containing text, Click element containing text if exists, Enter text in field, Execute JS, Goto site, Goto URL, Make all child elements visible, Press Enter, Select by label, `<select>` by option text, Scroll down, Uncheck checkbox, Wait for seconds, Wait for text, Wait for text in element, Remove elements), `selector`, `optional_value`.
- Live screenshot per step; last error step highlighting; session timer; clear/cleanup on save.

**Visual Filter Selector** (when supported)
- Screenshot + canvas; hover/click elements; Shift+click multi-select; clear selection; current XPath.
- For `image_ssim_diff`: selection mode element/draw, bounding box, selection mode fields.

**AI / LLM** (when not disabled)
- `llm_backend_profile` (checkbox per watch; may be disabled and shown as group-decided).
- `llm_intent`.
- `llm_change_summary`.
- `llm_change_summary_mode` (replace/append inherited prompt).
- Inherited group prompt placeholders and links.
- "Modify default prompt" helper.

**Filters & Triggers** (when supported)
- Activate preview / text preview (after filters and before filters), LLM intent preview.
- `include_filters` (CSS/JSONPath/JQ/XPath, one per line).
- `subtractive_selectors` (remove elements).
- `filter_text_added`, `filter_text_replaced`, `filter_text_removed`.
- `check_unique_lines`.
- `remove_duplicate_lines`.
- `sort_text_alphabetically`.
- `trim_text_whitespace`.
- `trigger_text`.
- `ignore_text`.
- `strip_ignored_lines` (ternary).
- `text_should_not_be_present`.
- `extract_lines_containing`.
- `extract_text`.
- Highlight legend: trigger / ignored / blocked.

**Conditions** (when supported)
- `conditions_match_logic` (ALL/ANY).
- Rule rows: `field` (Page text, etc.; plugin-provided fields), `operator` (>, <, >=, <=, ==, !=, in, plugin operators), `value`.
- Verify (✓) each rule against the current snapshot.
- Link to tutorial.

**Notifications**
- `notification_muted` (ternary: on/muted/system).
- `notification_screenshot` (when supported).
- `filter_failure_notification_send`.
- Apprise `notification_urls` list (textarea + Apprise builder + email preset).
- Send test notification, notification debug logs.
- Advanced: `notification_title`, `notification_body`, `notification_format`.
- Token/placeholder reference (many Jinja2 tokens; diff variants, AI tokens, plugin tokens).
- "Use system defaults" reset.

**Stats**
- Check count, consecutive filter failures, history length, last fetch duration, notification alert count, remote server reply.
- Capability flags (xpath data, screenshots, visual selector, browser steps, visual selector data ready).
- AI tokens last check/total (when configured).
- Plugin stats extras.
- Download latest HTML snapshot, download watch data package.

**Actions**
- Save; Delete (confirm); Clear History (confirm); Clone & Edit; RSS feed for watch.

**Processor-specific tabs**
- `restock_diff`: Restock & Price Detection tab — `in_stock_processing` (in-stock only / any changes / off), `follow_price_changes`, `price_change_min`, `price_change_max`, `price_change_threshold_percent`; group override warning.
- `image_ssim_diff`: screenshot comparison settings — `processor_config_min_change_percentage`, `processor_config_pixel_difference_threshold_sensitivity`; bounding box/selection mode in Visual Selector.
- Plugin processors: custom tabs/templates.

### 5. Watch detail — diff page (`/diff/<uuid>`)

- From/To snapshot selectors (all versions).
- Filters popover: Words / Lines; Ignore Whitespace; Same/non-changed; Removed/Added/Replaced; AI "every change between versions" (if configured).
- Previous/Next keyboard navigation.
- Tabs: Error Text (if any), Error Screenshot (if any), Text, Screenshot, Extract Data.
- Text tab:
  - Minimap of difference locations (for >100 lines).
  - AI Change Summary (loading/summary/error).
  - From version relative time, note, "Goto single snapshot".
  - Diff content with highlighted spans.
  - Tip: highlight text to share or add to ignore lists.
  - Download difference patch.
- Screenshot tab: latest screenshot, timestamp; warning that diffs are text-based.
- Extract Data tab: regex input, "Extract as CSV".
- Claude/processor-specific diff rendering (restock chart, image diff).
- Share selection as image (html2canvas + piexif, external CDN).

### 6. Watch detail — preview (`/preview/<uuid>`)

- Version selector; previous/next.
- Tabs: Error Text, Error Screenshot, Text, Current screenshot.
- Text preview with trigger/ignore/block highlights and explainer.
- Screenshot with timestamp.
- Highlight-to-ignore action (`highlight_submit_ignore_url`).
- Processor-specific preview (image diff assets, restock preview).

### 7. Queue (`/queue`)

- Header/description.
- Stats: workers, running now, queued.
- Clear Queue (confirm).
- Worker slots: worker number, watch title/URL, elapsed, running/idle/done, cancel running.
- Queued rows: position, watch title/URL, elapsed, priority label (immediate/clone/scheduled/pN).
- Pagination.
- "Waiting for new pages to check…" state.
- Live via Socket.IO **and** 8-second polling.

### 8. Groups list (`/tags/list`)

- Add group form (`name`).
- Table: mute toggle, watch count, tag name (colored), Recheck, Edit, Delete (confirm), Unlink (confirm), RSS.
- Route exists to delete all tags (`/tags/delete_all`), but no visible button in the overview template.
- Empty state.

### 9. Group edit (`/tags/edit/<uuid>`)

- General: `title` (required), `url_match_pattern` (wildcards/substring), matching watches list, custom colour checkbox + colour picker, `tag_colour` hidden.
- AI / LLM: `llm_backend_profile` (On / Off / Leave to each watch), `llm_intent`, `llm_change_summary`, `llm_change_summary_mode`.
- Filters & Triggers: same include/subtractive/trigger/ignore/extract fields as watch edit, applied additively to watches.
- Restock & Price Detection: `overrides_watch` + restock settings.
- Notifications: `notification_muted`, `notification_screenshot`, Apprise URLs, title/body/format, test, logs.
- Plugin extra tab.
- Save.

### 10. Global settings (`/settings`)

Tabs:

**General**
- Default `time_between_check` (weeks/days/hours/minutes/seconds) + default schedule (`time_schedule_limit`).
- `filter_failure_notification_threshold_attempts`.
- `history_snapshot_max_length`.
- Password set/remove (or "Password is locked" with `SALTED_PASS`).
- Clear Snapshot History (confirm page).
- `shared_diff_access`.
- `empty_pages_are_a_change`.
- PWA install QR.
- Default proxy (when proxies configured).

**Fetching**
- `fetch_backend` default.
- `webdriver_delay`.
- `workers`.
- `jitter_seconds`.
- `timeout`.
- `default_ua` (plaintext / Chrome).
- Proxy tip link.

**Global Filters**
- `ignore_whitespace`.
- `render_anchor_tag_content`.
- `global_subtractive_selectors`.
- `global_ignore_text`.
- `strip_ignored_lines`.

**UI Options**
- `open_diff_in_new_tab`.
- `socket_io_enabled` ("Realtime UI Updates Enabled", restart required).
- `favicons_enabled`.
- `use_page_title_in_list`.
- `use_share_watch`.
- `pager_size`.
- `timeago_format` (long/short).
- `sidebar_mode` (expandable/pinned-expanded/minimal).

**API**
- `api_access_token_enabled`.
- API key display + click-to-copy.
- Regenerate API key (confirm).
- Chrome extension instructions.
- PWA install QR.

**AI / LLM / MCP** (separate pages)
- AI/LLM: Overview, Provider, Prompts, Behaviour, Usage.
  - `enabled`, provider, `model`, `api_key`, `api_base`, `provider_kind`, `local_token_multiplier`, `local_thinking_off`, `change_summary_default`, `max_tokens_per_count_period`, `token_budget_month`, `max_input_chars`, `override_diff_with_summary`, `restock_use_fallback_extract`, `debug`, `thinking_budget`, `max_summary_tokens`, `budget_action`, `watchlist_overview_summary`.
- MCP: Overview, Access tokens, Connect (Token), Connect (OAuth), Settings.
  - `enabled`, `note`, `anonymous_read`, `public_url`.
  - Tokens: name, permissions for monitors/tags/notifications/browser/system, group limits; add/update/revoke.
  - OAuth grants: list/revoke.
  - Copyable server URLs/config snippets for Claude Code, VS Code, Claude Desktop, generic clients.

**RSS**
- `rss_hide_muted_watches`.
- `rss_diff_length`.
- `rss_reader_mode`.
- `rss_content_format`.
- `rss_template_type`.
- `rss_template_override` (Jinja2).

**Backups**
- Create backup, list/download, remove backups; restore tab.

**Time & Date**
- Server UTC time, browser local time, `scheduler_timezone_default` (datalist of all IANA zones).

**CAPTCHA & Proxies**
- BrightData/Oxylabs promotional info.
- `extra_proxies`: name + URL rows (5+).
- `extra_browsers`: name + ws/wss URL rows (5+).

**Plugin tabs**
- One tab per plugin, dynamic WTForms or custom template.

**Info**
- Uptime, Python version, max watches, active plugins list.

**Actions**
- Save.

### 11. Global notifications (`/settings/notifications/apprise`)

- Apprise URL list (textarea), email preset, "Add a notification service" builder, test send, debug logs.
- `notification_title`, `notification_body`, `notification_format`.
- `base_url` override.
- Token/placeholder reference and advanced tips.

### 12. Notification debug log (`/settings/notification-logs`)

- Rendered list of recent notification attempts/errors.

### 13. Import (`/imports/import`)

- URL list: URLs one per line, optional tags after a space, comma-separated; processor; textarea.
- Distill.io: paste JSON export (experimental; supports name, uri, tags, config:selections).
- `.XLSX & Wachete`: file upload, mapping type (Wachete/custom), custom mapping table (4 column numbers; types: URL, Title, CSS/xPath filter, Group/Tag names, Recheck time in minutes).
- Backup Restore link/tab.
- Import button.

### 14. Backups (`/backups/`)

- Create: list of backups (filename, size), Create backup, Remove backups (confirm), running indicator.
- Restore: upload ZIP(s), include groups / replace existing groups, include watches / replace existing watches, upload limits, Restore button.

### 15. Login (`/login`)

- Password field, hidden redirect, login button, CSRF, language selector, theme toggle, flash messages.

### 16. Other screens / features

- **RSS feeds**: `/rss/` main, `/rss/tag/<uuid>`, `/rss/watch/<uuid>` with token; content format/template settings.
- **PWA**: manifest, service worker, install QR, Android share target.
- **MCP OAuth consent**: `/oauth/authorize` consent page with permissions/group selection.
- **Plugin pages**: plugin blueprints and example pages.
- **Clear all history**: `/clear_history` confirmation page (type "clear").
- **Notification logs**.
- **Worker health / queue status / GC cleanup**: JSON/text debug endpoints.
- **API docs**: external link to `/docs/api_v1/`.

---

## Additional findings and risks

1. **The old frontend is tightly coupled to Jinja-rendered URLs and CSRF tokens.** The new SPA needs a bootstrap object with `basePath`, `csrfToken`, locale, auth state, feature flags, and settings summary.
2. **Many operations are form-POST + redirect + flash**, not JSON. The new UI cannot rely on these responses; it needs JSON endpoints or must use the existing public API where available.
3. **Some API GETs have side effects** (`?recheck`, `?paused`, `?muted`). The new UI should not use side-effecting GETs; add POST action endpoints or use the new UI API. This also matters for CSRF safety if session auth is added.
4. **The public API list response is lean but not complete for the dashboard.** It lacks `history_n`, compiled error text, checking/queued flags. The dashboard can combine `/watch`, `/systeminfo`, and `/queue.json`, or the API can be minimally enriched.
5. **The queue page still polls every 8 seconds.** This must be replaced by SSE in the new UI, including the initial snapshot and subsequent patches.
6. **The old UI has no explicit "created/updated/deleted" events except delete.** The SSE broker needs new signals or emits from API/UI operations.
7. **Screenshot/visual-selector/browser-steps data are served from UI routes, not the API.** The new UI can reuse the JSON/binary endpoints, but some need decompression or JSON wrappers.
8. **Production is a single-process threaded Werkzeug server.** SSE is feasible, but the plan must document proxy buffering, thread usage, and the multi-worker caveat.
9. **Translations are Jinja/Python-only.** New React strings need an extraction path; existing translations can be served as JSON.
10. **Plugins can inject templates, sidebar items, settings tabs, and per-watch request settings.** A generic renderer can cover simple WTForms, but custom templates need a fallback (link to legacy) unless we add a plugin API.
11. **The old UI uses external CDN scripts on the diff page** (`html2canvas`, `piexifjs`). The new UI should self-host or make this feature optional to keep the app usable offline.
12. **No Node.js at runtime.** The built assets must be committed or copied into the Python package/static folder; the Docker image must include them without a Node build stage (or build them in a separate stage and copy).
13. **No horizontal scrolling at 360px** is a hard requirement; the current table and tabs do not meet it. The new dashboard must use cards on mobile and the edit page must use scrollable tab chips or a section picker.
14. **The old UI's mobile drawer is not a bottom tab bar.** The new design will use a bottom tab bar for the four primary destinations plus Settings.
15. **The old UI hides the Add-Watch page when no visual browser is configured.** The new UI must still allow plain quick-add; only the live-preview/visual-selector path is gated.

---

## Phase 0 conclusion

The current app is a mature, feature-rich server-rendered UI with a large surface area. The main work is not only visual: a substantial JSON/SSE layer is needed to let a modern SPA drive existing backend capabilities without scraping HTML or duplicating business logic. The existing REST API is a good base for watches, tags, history, notifications, search, import, and system info. The gaps are concentrated in settings, bulk/queue actions, previews, browser automation, backups, LLM/MCP, plugins, and realtime.

The Phase 1 plan is in `docs/new-frontend/PHASE-1-PLAN.md`.
