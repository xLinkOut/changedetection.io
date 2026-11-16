# Phase 1 — Plan for a new changedetection.io frontend

Status: **waiting for approval — no application code will be written before approval.**

Repository: `dgtlmoon/changedetection.io`
Working branch: `new-frontend`
Old frontend: untouched. The new app is built in `frontend/` and served from a new `/app` route. The old UI remains available at its existing URLs until the new one reaches parity and the user agrees to switch.

---

## 0. Working agreement and technical defaults

- **Stack**: Vite + React + TypeScript, Tailwind CSS, TanStack Query, React Router, Lucide icons, Radix UI primitives (shadcn-style components, but owned in-tree), React Hook Form + Zod.
- **Styling**: Tailwind with CSS-variable design tokens for light/dark. No old Pure CSS, no old SCSS, no old layout.
- **Build output**: plain static files. Node.js is required only for development. Committed production assets live under `changedetectionio/static/new-ui/` and are served by Flask.
- **No polling for live data**: one `EventSource` stream. A local clock may tick relative timestamps, but it never fetches.
- **New UI route**: `/app` (working path). The old UI remains at `/`, `/edit/...`, `/diff/...`, etc. After approval, `/` can redirect to `/app`; old routes remain as a fallback until the user agrees to remove them.
- **No scraping old HTML**: the SPA uses JSON APIs and binary asset endpoints only. It never parses old Jinja-rendered pages.
- **Small commits**: one commit per step/screen, with clear messages.
- **Feature parity is a checklist**, not a claim. `docs/new-frontend/PARITY.md` will track every old feature → new location → status.

### Scope decisions

- Reuse the existing public REST API for watches, tags, history, diffs, notifications URLs, search, import, system info.
- Add a small, additive **UI API namespace** (`/api/v1/ui/...`) for gaps, authenticated by the existing Flask session + CSRF.
- Add **one SSE endpoint** and an in-process event broker.
- Do **not** modify or delete old templates/JS/CSS.
- `Browser Steps` and `Visual Selector` are built last but are not dropped.

---

## 1. Feature inventory and priority

Priority meaning:
- **Must** — core parity and explicitly required; definition of done.
- **Should** — old feature that must remain reachable in the new UI; planned for v1 after Must. The definition of done includes Should.
- **Could** — new enhancement or niche convenience; not required for parity.

### 1.1 Global shell

| Feature | Priority |
|---|---|
| Responsive app shell: bottom tab bar on mobile, sidebar on desktop | Must |
| Light / dark / follow-system theme with manual toggle | Must |
| Connection indicator: live / reconnecting / off | Must |
| Global search (title, URL, error text) | Must |
| Global pause/resume scheduling | Must |
| Global mute/unmute notifications | Must |
| Unread-changes badge | Must |
| Queue size + checking-now indicators | Must |
| Toasts and inline error feedback | Must |
| Error boundary + retry | Must |
| Language selector (25 locales + auto-detect) | Must |
| Keyboard-accessible navigation and skip link | Must |
| Logout | Must |
| PWA install / share-target support | Should |
| Command palette / extra keyboard shortcuts | Could |

### 1.2 Dashboard and quick add

| Feature | Priority |
|---|---|
| Watch list with title, URL, favicon, tags, processor badge | Must |
| Status: paused, muted, checking now, queued, error, unread | Must |
| Last checked and last changed | Must |
| Unseen-change badge | Must |
| Restock / price / price-change display | Must |
| Search, tag/group filter, status filter (All/Unread/Deals/Errors/Healthy), processor filter | Must |
| Sort (created, title, paused, muted, last checked, last changed) | Must |
| Pagination and/or virtualization for 500+ watches | Must |
| Quick add: URL + Watch | Must |
| Advanced quick add: processor, tags, LLM intent, browser | Must |
| Bulk: pause, unpause, mute, unmute, recheck, tag, set browser, set proxy, mark viewed/unviewed, use default notifications, clear errors, clear history, delete | Must |
| Select all matching (across pages), invert, clear selection | Must |
| Mark all viewed in current filtered view | Must |
| Recheck all in current filtered view | Must |
| Empty, loading skeleton, error + retry states | Must |
| Row-level: recheck, edit, history, preview, open link | Must |
| Clone watch | Should |
| Share watch config | Should |
| RSS feed link | Should |
| Live row updates via SSE (no full-list reload) | Must |
| Swipe actions on mobile | Could |

### 1.3 Watch detail

| Feature | Priority |
|---|---|
| Snapshot history list and version selection | Must |
| Diff viewer: line, word, character | Must |
| Side-by-side on desktop, stacked on mobile | Must |
| Diff preferences: ignore whitespace, changes only, added/removed/replaced | Must |
| Previous/next change navigation | Must |
| Difference minimap / jump-to-difference | Should |
| Text preview with trigger / ignored / blocked highlighting | Must |
| Screenshot and error screenshot | Must |
| Error text tab | Must |
| AI change summary (when configured) | Must |
| Extract data (regex → CSV) | Should |
| Download difference patch | Should |
| Price/restock graph over time + data table | Must |
| Processor-specific image diff | Should |
| Download latest HTML / watch data package | Should |
| Share a diff selection as an image | Should |
| Recheck / Edit / Open actions | Must |
| Empty, loading skeleton, error + retry states | Must |
| Blame/annotations for snapshots | Could |

### 1.4 Watch edit

| Feature | Priority |
|---|---|
| General: URL, title, tags, processor, link override, page-title option | Must |
| Check interval + scheduler editor (days, hours, timezone) | Must |
| Request: method, headers, body, fetcher, proxy, status codes | Must |
| Browser Steps: live browser, screenshot, step list, per-step validation | Must |
| Visual Selector: screenshot, hover/select, multi-select, clear, fill filters | Must |
| AI/LLM: enabled, intent, summary prompt, replace/append, group inheritance | Must |
| Filters & Triggers: include/subtract, trigger/ignore/block, extract, text processing, preview | Must |
| Conditions: ALL/ANY rules, field/operator/value, verify | Must |
| Notifications: mute, screenshot, filter-failure, Apprise URLs, title/body/format, test, token help | Must |
| Restock & price detection settings | Must |
| Screenshot comparison settings (image diff) | Should |
| Stats: counts, times, capabilities, token usage, downloads | Should |
| Save, delete, clear history, clone, RSS | Must (clone/RSS Should) |
| Server-side validation errors mapped to fields | Must |
| Unsaved-changes guard | Must |
| Section navigation that works at 360px | Must |
| Plugin per-watch request settings | Should, with legacy fallback for custom templates |
| Inline "test this filter/condition" tools | Must (preview/verify) |

### 1.5 Groups / tags

| Feature | Priority |
|---|---|
| Group list with watch counts | Must |
| Create, edit, delete, unlink, mute, recheck, RSS | Must |
| Group colour picker | Must |
| URL auto-apply pattern + matching watches preview | Must |
| Group AI settings (On/Off/inherit, intent, summary prompt) | Must |
| Group filters/triggers (additive to watches) | Must |
| Group restock/price overrides | Must |
| Group notifications | Must |
| Empty, loading, error states | Must |
| Delete all groups | Should |

### 1.6 Global settings

| Feature | Priority |
|---|---|
| General: default interval, schedule, history limit, password, shared diff, empty pages | Must |
| Fetching: default fetcher, browser wait, workers, jitter, timeout, user agents | Must |
| Global filters: ignore whitespace, anchors, subtractive selectors, ignore text, strip ignored | Must |
| UI options: new-tab diff, realtime, favicons, page title, pager, time format, sidebar mode | Must |
| API: enable/disable key, show/copy key, regenerate key | Must |
| Notifications: Apprise URLs, title/body/format, base URL, test, logs, builder | Must |
| AI/LLM: provider, model, key, base URL, prompts, behaviour, budgets, usage | Must |
| RSS: hide muted, diff length, reader mode, format, template | Must |
| Time & date: server/browser time, default timezone | Must |
| Proxies & extra browsers | Must |
| Backups: create/list/download/remove/restore | Must |
| Info: uptime, Python version, watch limit, plugins | Should |
| MCP server: enable, note, public URL, anonymous read, tokens, OAuth grants | Should |
| Plugin settings tabs | Should |
| PWA install QR | Should |
| Chrome extension instructions | Could |
| Reset/clear history | Must |

### 1.7 Import, export, backups

| Feature | Priority |
|---|---|
| Import newline URL list with optional tags | Must |
| Import processor selection | Must |
| Import XLSX: Wachete mapping | Must |
| Import XLSX: custom column mapping | Must |
| Import Distill.io JSON | Should |
| Export all watches as a backup ZIP | Must |
| Export watch config JSON/CSV | Could |
| Download latest HTML / data package | Should |
| RSS feeds (main, group, watch) | Should |
| API docs link | Could |

### 1.8 Queue and realtime

| Feature | Priority |
|---|---|
| Queue snapshot: workers, running, queued, priorities | Must |
| Live updates via SSE (no polling) | Must |
| Cancel a running check | Must |
| Clear queue (confirm) | Must |
| Pagination for large queues | Should |
| Per-worker elapsed time | Must |
| Notification-sent live event | Must |
| Connection status indicator | Must |

### 1.9 Auth, i18n, accessibility

| Feature | Priority |
|---|---|
| Login screen when password enabled | Must |
| Login error handling, redirect back | Must |
| Logout | Must |
| Password-disabled mode (no login) | Must |
| Language selection on login and in app | Must |
| Existing translations preserved | Must |
| Keyboard navigation, visible focus, labels, 44px targets | Must |
| Screen-reader live regions for status/toasts | Must |
| Reduced-motion support | Must |
| High-contrast readable diff colors | Must |

### 1.10 MCP, plugins, PWA, misc

| Feature | Priority |
|---|---|
| MCP OAuth consent flow | Should (reuse legacy consent page initially) |
| Plugin sidebar links | Should |
| Plugin settings tabs | Should |
| Plugin per-watch request settings | Should |
| PWA manifest/service worker/install QR | Should |
| Chrome extension support | Could |
| Marketing/support overlay | Could |
| "Browsers (coming soon)" placeholder | Omit (not a feature) |

---

## 2. Information architecture

### 2.1 Sitemap

```
/app
├── /login
├── /                                  Dashboard (watches)
├── /add                               Add watch (quick + visual)
├── /watches/:uuid                     Watch detail
│   ├── /changes                       History + diff (default)
│   ├── /preview                       Single snapshot preview
│   ├── /screenshot                    Screenshots
│   └── /price                         Restock / price graph
├── /watches/:uuid/edit/:section?      Watch edit (general, request, filters,
│                                      conditions, notifications, ai,
│                                      browser-steps, visual-selector, stats)
├── /groups                            Groups list
├── /groups/:uuid                      Group edit
├── /queue                             Queue
├── /import                            Import / backup restore
├── /notifications                     Global notification settings
├── /notifications/log                 Notification debug log
├── /settings                          Settings home
│   ├── /general
│   ├── /fetching
│   ├── /filters
│   ├── /ui
│   ├── /api
│   ├── /notifications
│   ├── /ai
│   ├── /mcp
│   ├── /rss
│   ├── /proxies
│   ├── /backups
│   └── /info
├── /search?q=...                      Dashboard with search applied
└── /not-found
```

Query params on dashboard: `q`, `tag`, `status`, `processor`, `sort`, `order`, `page`, `view` (cards/table). These are shareable and back-button friendly.

### 2.2 Navigation

**Mobile (bottom tab bar, 5 items):**
1. Watches
2. Add
3. Groups
4. Queue
5. Settings

Top app bar on mobile: current screen title, search icon, connection dot, theme toggle, overflow menu (global pause/mute, notifications, language, logout).

**Tablet:** icon rail + content; collapsible to bottom tabs at < 768px.

**Desktop:** left sidebar:
- Brand
- Watches (unread badge)
- Add watch
- Groups
- Import
- Queue (queue badge)
- Notifications
- Settings
- Footer: connection status, checking-now, queue activity, version, new-version notice.

Watch detail and edit screens use a back link and a contextual secondary nav, not the global sidebar highlight only.

---

## 3. Wireframe-level description

### 3.1 Dashboard — mobile (360px)

```
┌─────────────────────────────────────┐
│ CDIO      ● Live      ☾      ⋮      │
├─────────────────────────────────────┤
│ [ 🔍 Search watches…              ] │
│ [ All ] [ Unread 3 ] [ Errors 1 ]   │  ← horizontally scrollable chips
│ [ Tag ▾ ] [ Sort ▾ ] [ Filters ]    │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ ● Product title          2m ago │ │
│ │   https://shop.example/item     │ │
│ │   #electronics  #deals          │ │
│ │   ▲ $19.99  ▼ 12%   In stock    │ │
│ │   Checked 2m ago                │ │
│ │   [ Recheck ] [ Edit ] [ ⋯ ]    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ○ Another watch      1h ago     │ │
│ │   …                             │ │
│ └─────────────────────────────────┘ │
│           (virtualized)             │
├─────────────────────────────────────┤
│ [ + Watch a URL…             ] [→]  │  ← sticky quick add
├─────────────────────────────────────┤
│ [Watches] [ + ] [Groups] [Queue] [⚙]│
└─────────────────────────────────────┘
```

- No horizontal page scroll. The status chips scroll horizontally inside their own row.
- The quick-add bar is sticky above the bottom tab bar.
- Bulk selection replaces the bottom tab bar with a sticky action bar: `N selected · Pause · Mute · Recheck · Tag · ⋯ · Delete`.
- Tap a card opens `/watches/:uuid/changes`; the `⋯` menu offers recheck, preview, clone, share, clear history, delete.

### 3.2 Dashboard — desktop (1280px)

```
┌────────────┬──────────────────────────────────────────────────────────────┐
│ CDIO       │  Watches                [Search] [Pause all] [Mute all] [☾]  │
│            ├──────────────────────────────────────────────────────────────┤
│ Watches 12 │  [All 12] [Unread 3] [Deals 2] [Errors 1] [Healthy 11]      │
│ Add        │  [Tag ▾] [Type ▾] [Sort: Changed ▾]           [RSS] [Recheck]│
│ Groups     │  ┌──┬──┬───────────────┬──────────┬────────┬────────┬──────┐ │
│ Import     │  │☐ │⏸ │ Web page      │ Price    │Checked │Changed │Actions│ │
│ Queue   4  │  ├──┼──┼───────────────┼──────────┼────────┼────────┼──────┤ │
│ Notifs     │  │☐ │⏸ │ ● Title       │ $19.99   │ 2m     │ 2m     │ ⋯    │ │
│ Settings   │  │  │  │   url #tag    │ ▼12%     │        │        │      │ │
│            │  └──┴──┴───────────────┴──────────┴────────┴────────┴──────┘ │
│ ● Live     │  Rows virtualized. Sticky header. Keyboard row navigation.   │
│ Checking 2 │                                                              │
│ Queue 4    │                                                              │
│ v0.70.3    │                                                              │
└────────────┴──────────────────────────────────────────────────────────────┘
```

- Table on ≥ 1024px; cards on < 1024px.
- Column visibility adapts: hide less important columns at 768–1023px.
- Bulk action bar appears above the table when selection is non-empty.

### 3.3 Watch detail — mobile

```
┌─────────────────────────────────────┐
│ ←  Product title        ● Live   ⋮  │
│ https://shop.example/item           │
│ #electronics  #deals                │
│ [ Recheck ] [ Edit ] [ Open ]       │
├─────────────────────────────────────┤
│ Changes | Preview | Screenshot | $  │  ← sticky tabs
├─────────────────────────────────────┤
│ From [ 12 Nov 10:02 ▾ ]             │
│ To   [ 13 Nov 09:41 ▾ ]             │
│ [Lines] [Words] [Character]         │
│ [Filters ▾]                         │
├─────────────────────────────────────┤
│ - old line                          │
│ + new line                          │
│   unchanged context                 │
│   …                                 │
├─────────────────────────────────────┤
│ ✨ AI summary: "Price dropped…"     │
│ [Download patch] [Extract data]     │
├─────────────────────────────────────┤
│ [ Prev change ]     [ Next change ] │  ← sticky bottom
└─────────────────────────────────────┘
```

- Character mode shows intra-line highlights; mobile uses stacked line pairs rather than side-by-side.
- Tabs are horizontal scroll chips; no page overflow.
- Error text/screenshot tabs appear when an error exists.
- Price tab only for restock watches; otherwise hidden.

### 3.4 Watch detail — desktop

- Two-column layout: left snapshot/history rail (280px) + right diff canvas.
- Diff toolbar sticky at top; minimap on the far right for long documents.
- Side-by-side diff by default at ≥ 1024px; in-line toggle.
- AI summary card above the diff.
- History rail lists snapshots with timestamp, relative time, changed/no-change marker, and quick diff selection.

### 3.5 Watch edit — mobile

```
┌─────────────────────────────────────┐
│ ←  Edit: Product title              │
│ [General][Request][Filters][…]      │  ← scrollable tab chips
├─────────────────────────────────────┤
│ General                              │
│ URL                                  │
│ [ https://…                       ]  │
│ Title                                │
│ [                                 ]  │
│ Group tags                           │
│ [ #electronics × ] [ + Add ]         │
│ Processor                            │
│ ( ) Text & JSON  (•) Restock & price │
│                                      │
│ ▸ Advanced: link override, page title│
│                                      │
│ Check every                          │
│ [ 0 ]w [ 0 ]d [ 1 ]h [ 0 ]m [ 0 ]s  │
│ ▸ Schedule                           │
├─────────────────────────────────────┤
│ [ Cancel ]              [ Save ]     │  ← sticky action bar
└─────────────────────────────────────┘
```

- Tabs become a `<select>`/section sheet at very small widths if chips overflow.
- Each technical field has a short help line; advanced fields are collapsed under "Advanced".
- Browser Steps and Visual Selector use a full-screen modal/immersive canvas with a close/back button; mobile pinch-zoom and a "tap to select" mode.
- Save bar shows dirty state and blocks navigation with a confirm.

### 3.6 Settings — mobile

- Settings home is a grouped list of cards: General, Fetching, Filters, UI, API, Notifications, AI, MCP, RSS, Proxies, Backups, Info.
- Each opens a focused page with a back link. No horizontal scrolling.
- Dangerous actions (remove password, clear history, regenerate API key, delete backups) are in a "Danger zone" card with confirmation dialogs.

### 3.7 Login — mobile and desktop

```
┌─────────────────────────────┐
│            CDIO             │
│   Website change detection  │
│                             │
│   Password                  │
│   [ ••••••••••          ]   │
│   [ Login ]                 │
│                             │
│   Language ▾     Theme ☾    │
└─────────────────────────────┘
```

- No watch data is loaded before auth.
- Wrong password shows an inline alert; no page reload.
- Redirect back to the requested route after login.

---

## 4. Design system

### 4.1 Colour tokens

Use CSS variables, exposed to Tailwind. All text/background pairs target WCAG AA.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f7f8fa` | `#0b0f19` |
| `--surface` | `#ffffff` | `#111827` |
| `--surface-2` | `#f2f4f7` | `#1f2937` |
| `--border` | `#e4e7ec` | `#273244` |
| `--border-strong` | `#d0d5dd` | `#344054` |
| `--text` | `#101828` | `#f2f4f7` |
| `--text-muted` | `#667085` | `#98a2b3` |
| `--primary` | `#2563eb` | `#60a5fa` |
| `--primary-hover` | `#1d4ed8` | `#93c5fd` |
| `--primary-contrast` | `#ffffff` | `#0b0f19` |
| `--success` | `#067647` | `#32d583` |
| `--success-bg` | `#ecfdf3` | `#052e1c` |
| `--warning` | `#b54708` | `#fdb022` |
| `--warning-bg` | `#fffaeb` | `#3b2300` |
| `--danger` | `#b42318` | `#f97066` |
| `--danger-bg` | `#fef3f2` | `#3a1212` |
| `--info` | `#175cd3` | `#84caff` |
| `--diff-added-bg` | `#ecfdf3` | `#052e1c` |
| `--diff-added-text` | `#067647` | `#6ce9a6` |
| `--diff-removed-bg` | `#fef3f2` | `#3a1212` |
| `--diff-removed-text` | `#b42318` | `#fda29b` |
| `--diff-changed-bg` | `#fffaeb` | `#3b2300` |
| `--focus-ring` | `#2563eb` | `#84caff` |

- Use colour + icon/text, never colour alone, for status.
- Tag colours are generated from the existing tag colour/auto-colour logic; the API returns hex values. Ensure contrast with a computed text colour.
- Diff colours are intentionally distinct from success/danger UI colours so a diff is not confused with a status badge.

### 4.2 Typography

- Sans: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Mono: `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`
- No webfont download: fastest and consistent with the current system-font approach.
- Scale:
  - `text-xs` 12/16
  - `text-sm` 14/20
  - `text-base` 16/24
  - `text-lg` 18/28
  - `text-xl` 20/28
  - `text-2xl` 24/32
  - `text-3xl` 30/36
- Headings use 600/700; body 400; labels 500.
- Diff text: 13px/20px monospace with `font-variant-ligatures: none`; allow horizontal scroll only inside the diff block, not the page.

### 4.3 Spacing, radii, elevation

- 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48.
- Radii: 6px (inputs/chips), 10px (cards), 14px (dialogs), full (pills).
- Shadows: light `0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10)`; dark `0 1px 2px rgba(0,0,0,.4)`.
- Borders are preferred over heavy shadows.
- Tap targets: min 44×44px; icon-only buttons are 44px on mobile, 36px on desktop with 8px spacing.

### 4.4 Components

Primitives:
- Button (primary, secondary, ghost, danger; sizes sm/md/lg; loading state)
- IconButton
- Input, Textarea, Select, Combobox, SearchInput
- Checkbox, RadioGroup, Switch, ToggleGroup
- Label, FormField, HelpText, FieldError
- Badge, StatusDot, Tag, Kbd
- Card, Panel, Separator
- Tabs, SegmentedControl, Accordion/AdvancedSection
- Dialog, ConfirmDialog, Sheet/Drawer, Popover, DropdownMenu, Tooltip
- Toast/ToastViewport, Alert, Banner
- Skeleton, Spinner, EmptyState, ErrorState
- Table, DataList, Pagination, VirtualList
- AppShell, Sidebar, BottomTabs, TopBar, PageHeader
- ConnectionIndicator
- ThemeToggle, LanguagePicker

Domain components:
- WatchCard, WatchRow, WatchStatus, WatchFilters, BulkActionBar
- QuickAddBar, AddWatchDialog
- DiffViewer, DiffToolbar, DiffMinimap, SnapshotPicker, LineNumberGutter
- TextPreview, HighlightLegend, ScreenshotViewer
- PriceChart, RestockBadge
- TimeIntervalInput, ScheduleEditor, TimezoneCombobox
- KeyValueEditor (headers), StringListEditor (filters/ignore/trigger)
- CodeTextarea (monospace, tab handling, no heavy editor)
- NotificationUrlList, AppriseBuilder, TokenReference
- ConditionsEditor, ConditionRow, VerifyConditionButton
- BrowserStepsCanvas, VisualSelectorCanvas, ElementInspector
- QueueWorkerList, QueueItemList
- SettingsSection, DangerZone
- ImportUrlList, XlsxMappingEditor, BackupList, RestoreUpload

### 4.5 Accessibility rules

- Every input has a visible `<label>` or `aria-label`; help text linked via `aria-describedby`.
- Focus is always visible: 2px ring + 2px offset; never `outline: none` without replacement.
- Dialogs trap focus, restore focus, close on Escape; sheets are labelled.
- Status changes (checking, queued, error, new change) are announced via a polite live region; toasts use `role="status"`.
- Diff has `role="document"` and line semantics; changed lines include visually hidden "removed"/"added"/"changed" text.
- Colour is never the only indicator.
- Keyboard: tab order follows visual order; arrow keys in menus/tabs; `?` opens shortcuts (Could); `Alt+S` focuses search (parity).
- Respect `prefers-reduced-motion`; no essential animation.
- Minimum contrast 4.5:1 for body text, 3:1 for large text and UI boundaries.

---

## 5. Architecture

### 5.1 Folder structure

```
frontend/
├── index.html
├── package.json
├── pnpm-lock.yaml (or package-lock.json)
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── public/
├── scripts/
│   ├── extract-i18n.mjs
│   └── check-bundle-size.mjs
└── src/
    ├── main.tsx
    ├── app/
    │   ├── App.tsx
    │   ├── router.tsx
    │   ├── providers.tsx
    │   └── bootstrap.ts
    ├── api/
    │   ├── client.ts
    │   ├── types.ts
    │   ├── endpoints/
    │   │   ├── watches.ts
    │   │   ├── tags.ts
    │   │   ├── settings.ts
    │   │   ├── queue.ts
    │   │   ├── importExport.ts
    │   │   ├── notifications.ts
    │   │   ├── browser.ts
    │   │   ├── llm.ts
    │   │   └── auth.ts
    │   └── sse.ts
    ├── components/
    │   ├── ui/              # design-system primitives
    │   └── domain/          # watch/diff/browser/settings components
    ├── features/
    │   ├── auth/
    │   ├── dashboard/
    │   ├── watch-detail/
    │   ├── watch-edit/
    │   ├── groups/
    │   ├── settings/
    │   ├── queue/
    │   ├── import-export/
    │   └── notifications/
    ├── lib/
    │   ├── i18n.ts
    │   ├── theme.ts
    │   ├── format.ts
    │   ├── diff.ts
    │   ├── validation.ts
    │   ├── queryClient.ts
    │   └── cn.ts
    ├── styles/
    │   └── globals.css
    └── types/
```

```
changedetectionio/
├── blueprint/
│   └── new_ui/
│       ├── __init__.py          # serves /app shell + assets
│       └── templates/new_ui/
│           └── index.html       # reads Vite manifest, injects bootstrap
├── api/
│   └── ui.py                    # /api/v1/ui/* endpoints
├── realtime/
│   ├── sse.py                   # broker + endpoint glue
│   └── signals.py               # signal → event translation (or in sse.py)
└── static/
    └── new-ui/                  # build output (committed)
        ├── manifest.json
        └── assets/...
```

### 5.2 Build and serving

- `npm run dev`: Vite dev server at `http://localhost:5173/app/`, proxies `/api`, `/static`, `/login`, `/browser-steps`, `/add-watch-ui`, `/settings`, `/queue.json` to Flask on port 5000.
- `npm run build`: Vite build with `base: './'`, `manifest: true`, output to `../changedetectionio/static/new-ui/`.
- `changedetectionio/blueprint/new_ui/__init__.py`:
  - `/app` and `/app/<path>` serve the shell for non-asset paths (SPA fallback).
  - `/app/assets/<path>` serves hashed assets with `Cache-Control: public, max-age=31536000, immutable`.
  - The shell template reads `static/new-ui/manifest.json`, injects the entry JS/CSS, and a `window.__CDIO_BOOTSTRAP__` JSON object.
- `<base href="{{ request.script_root }}/app/">` makes relative asset URLs work behind a reverse-proxy subpath.
- Dockerfile: no Node stage required if the built assets are committed; `MANIFEST.in` already includes `changedetectionio/static/*`. If we later build in Docker, add a Node builder stage and copy `dist`.
- No Node.js at runtime.

Bootstrap object:
```json
{
  "basePath": "/prefix",
  "appBase": "/prefix/app",
  "apiBase": "/prefix/api/v1",
  "authenticated": true,
  "passwordEnabled": true,
  "csrfToken": "…",
  "locale": "en_GB",
  "languages": [{"code": "en_GB", "name": "English (UK)"}],
  "version": "0.70.3",
  "features": {
    "llm": true,
    "mcp": true,
    "browserSteps": true,
    "visualSelector": true,
    "screenshots": true,
    "restock": true
  },
  "apiKey": "…",            // only when authenticated, for the existing public API
  "settingsSummary": { "pagerSize": 50, "timeagoFormat": "long" }
}
```
- The bootstrap endpoint is `GET /api/v1/ui/bootstrap`. It is allowed pre-login and returns only auth-needed fields; the API key and feature/settings details are included only when authenticated (or when no password is set, in which case the instance is already open).
- Theme is applied before React renders (inline script in the shell) to avoid a flash of wrong theme.

### 5.3 Authentication flow

- SPA shell is served to anonymous users and renders the login screen.
- `GET /api/v1/ui/bootstrap` returns `authenticated`, `passwordEnabled`, `csrfToken`, locale, and (if authenticated) the API key.
- Login: `POST /api/v1/ui/login` with `{password}` and `X-CSRFToken`; sets the Flask-Login session; returns the bootstrap payload.
- Logout: `POST /api/v1/ui/logout` with CSRF; clears the session; the SPA clears TanStack Query caches and shows login.
- Existing public API calls use `x-api-key` from the bootstrap. New UI API calls use the session cookie + `X-CSRFToken` for mutations.
- All new `/api/v1/ui/*` endpoints use a `login_required_json` decorator: if a password is enabled and the session is not authenticated, return `401 JSON`, not an HTML redirect. CSRF is validated with Flask-WTF `validate_csrf`.
- `EventSource` uses the session cookie; no custom headers.
- Security notes:
  - The API key is already visible to authenticated users in Settings → API; the bootstrap does not widen access.
  - CORS remains same-origin for the SPA; no credentialed cross-origin access is introduced.
  - New UI endpoints are CSRF-protected for all mutations.
  - The old API's behavior is unchanged.

### 5.4 API client and data flow

- `api/client.ts`: `fetch` wrapper with:
  - base URL from bootstrap,
  - `credentials: 'same-origin'`,
  - `X-CSRFToken` for non-GET `/api/v1/ui/*`,
  - `x-api-key` for existing `/api/v1/*`,
  - JSON parsing, 204 handling, error normalization (`{status, message, fields}`),
  - abort signals,
  - one automatic retry for idempotent GETs only.
- TanStack Query:
  - `['watches']` — list (single fetch, not paginated server-side; virtualized client-side).
  - `['watch', uuid]` — detail.
  - `['watch', uuid, 'history']`.
  - `['watch', uuid, 'snapshot', ts]`.
  - `['tags']`.
  - `['settings']`.
  - `['queue']`.
  - `['system']`.
  - `['notifications', 'logs']`.
  - `['i18n', locale]`.
- SSE handlers patch only affected keys:
  - `watch.updated` → update item in `['watches']` and `['watch', uuid]`.
  - `watch.deleted` → remove from `['watches']`, remove detail queries.
  - `watch.check.finished` → update item; invalidate `['watch', uuid, 'history']` only if `last_changed` changed.
  - `watch.change_detected` → update item + invalidate history/diff for that watch.
  - `queue.updated` → set `['queue']` and sidebar counts.
  - `stats.updated` → set unread/error counts.
  - `notification.sent` → toast/invalidate logs.
- No list-wide invalidation on every check. If an event is ambiguous, patch the known fields; only fall back to a single refetch for that watch.
- Forms use React Hook Form + Zod, with server error mapping.

### 5.5 Errors, loading, empty states

- Every screen:
  - **Loading**: skeleton matching the final layout (not a spinner-only page).
  - **Empty**: icon, plain-language explanation, primary action (Add watch / Import / Create group).
  - **Error**: what failed, retry button, request id/status when available.
- Global error boundary catches render errors and offers "Reload" / "Back to watches".
- Offline banner when `navigator.onLine` is false; SSE indicator shows reconnecting.
- Mutations show optimistic state where safe (pause/mute/recheck) and roll back on error; destructive actions always confirm.
- Toasts are non-blocking, stack at most 3, and are announced to screen readers.

### 5.6 Internationalisation

- `GET /api/v1/ui/i18n/<locale>` returns `{locale, messages: {msgid: msgstr}, plurals: {...}}` from existing `.po` catalogs.
- `t('msgid')` falls back to the msgid itself (English).
- `tn('singular', 'plural', count)` uses `Intl.PluralRules`; the catalog provides the forms.
- New strings are extracted from TSX by `frontend/scripts/extract-i18n.mjs` and merged into the existing catalogs by a small Python/`msgmerge` step; CI checks for drift.
- Dates/times use `Intl.DateTimeFormat`; relative times use `Intl.RelativeTimeFormat`; prices use `Intl.NumberFormat` with the currency from the API; numbers use the locale.
- Language picker updates the session via `POST /api/v1/ui/locale` (or existing `/set-language/<locale>`) and reloads the catalog.
- RTL: not currently supported by existing locales; use logical CSS properties so it is not blocked if added later.

### 5.7 Performance

- Dashboard: single list fetch; `@tanstack/react-virtual` for rows; `content-visibility` for cards; memoized row components; no per-row API calls.
- 500+ watches target: first paint < 1.5s on a mid-range phone; scrolling at 60fps with virtualization; filters/sort < 50ms.
- Diff: compute line diff in a Web Worker for snapshots > 200KB; character diff only for the visible changed line pairs; virtualize lines > 2000.
- Images: lazy load favicons/screenshots; `decoding="async"`; fixed aspect ratios to avoid layout shift.
- Bundle: route-level code splitting; Lucide icons tree-shaken; no heavy editor; price chart lazy-loaded only on the price tab.
- Cache: TanStack Query stale times tuned per resource; static assets immutable; API responses `no-store` where they contain watch data.

### 5.8 Security

- All HTML rendered as text; no `dangerouslySetInnerHTML` for user content. Diff output is rendered as structured spans, not raw HTML.
- URLs validated by the backend; frontend also uses `safeHref()` to block `javascript:`.
- CSRF header on all `/api/v1/ui/*` mutations.
- API key kept in memory only; never in localStorage/sessionStorage.
- No credentials in URLs.
- Confirm destructive actions; type-to-confirm for "clear all history"/"delete group with many watches" if needed.
- External links use `rel="noopener noreferrer"`.

---

## 6. Realtime design with SSE

### 6.1 Endpoint

`GET /api/v1/ui/events`

- Auth: Flask session cookie (required when a password is set).
- Query: optional `?last_event_id=<id>` as a fallback when the `Last-Event-ID` header is unavailable.
- Response headers:
  - `Content-Type: text/event-stream; charset=utf-8`
  - `Cache-Control: no-cache, no-transform`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no`
  - `Content-Encoding: identity`
- Initial frame includes `retry: 3000`.
- Heartbeat comment every 15 seconds (`: heartbeat <timestamp>\n\n`), plus an optional `event: heartbeat` every 30 seconds for clients that want a counter.
- On connect: send `event: hello` with `{event_id, server_time, queue_size, checking_now, unread_changes_count, error_count}`.
- On reconnect with `Last-Event-ID`:
  - If the ID is in the in-memory ring buffer, replay events after it, then continue.
  - If the ID is older than the buffer, send `event: resync` with `{reason: "gap"}`; the client performs exactly one full refetch.
  - If no ID, send `hello` only.
- Event IDs: monotonically increasing integer per process; each event has `id: <n>`.
- Ring buffer: last 1000 events. Slow subscribers get a bounded `queue.Queue(maxsize=256)`; if full, the connection is closed and the client reconnects/resyncs.

### 6.2 Event catalog

| Event | Payload | UI effect |
|---|---|---|
| `hello` | `{event_id, server_time, queue_size, checking_now, unread_changes_count, error_count}` | Initialize header/status counters. |
| `watch.created` | `{uuid, watch: {…small fields…}}` | Insert into `['watches']`; toast "Watch added". |
| `watch.updated` | `{uuid, changed: {paused?, muted?, title?, tags?, fetch_backend?, …}}` | Patch the item; no list reload. |
| `watch.deleted` | `{uuid}` | Remove item + detail queries. |
| `watch.queued` | `{uuid, position?, priority?}` | Mark row queued; update queue count. |
| `watch.check_started` | `{uuid, started_at}` | Show "Checking now" spinner on that row. |
| `watch.check_finished` | `{uuid, last_checked, last_changed, history_n, has_error, fetch_time, error_text?}` | Clear spinner; update times; if changed, mark unread and update history. |
| `watch.change_detected` | `{uuid, last_changed, history_n, from_version?, to_version?}` | Add unseen badge; update row; invalidate that watch's history/diff. |
| `watch.error` | `{uuid, error_text, last_error}` | Show error state; toast (optional, throttled). |
| `notification.sent` | `{uuid, timestamp, error?}` | Toast success/failure; invalidate notification logs when open. |
| `queue.updated` | `{queue_size, checking_now, running: [{uuid, started_at}], queued: [{uuid, position}]?}` | Update queue page and sidebar counts. |
| `stats.updated` | `{unread_changes_count, error_count, watch_count}` | Update badges. |
| `llm.summary_ready` | `{uuid, from_version, to_version}` | Stop summary spinner; fetch the one summary result. |
| `favicon.updated` | `{uuid}` | Refresh the favicon URL with a cache-busting token. |
| `resync` | `{reason}` | Exactly one refetch of current queries. |
| `heartbeat` | `{server_time}` | Update connection indicator; no data fetch. |

Payloads stay small: identifiers + changed fields, never full snapshots or diffs. The SPA fetches the large data only when a screen needs it.

### 6.3 Server implementation

- `changedetectionio/realtime/sse.py`:
  - `EventBroker` singleton: `subscribe()`, `unsubscribe()`, `publish(event_type, data)`.
  - `init_sse(app, datastore)`: connect blinker signals and start the broker.
  - `sse_stream()` generator: replay, queue wait with timeout, heartbeat, cleanup on `GeneratorExit`.
- Signal translation:
  - Existing signals: `watch_check_update`, `watch_deleted`, `queue_length`, `notification_event`, `llm_summary_ready`, `watch_favicon_bump`, `general_stats_update`, `watch_small_status_comment`.
  - New minimal signals: `watch_created`, `watch_updated`, `watch_queued`, `watch_check_started`, `watch_change_detected`.
  - Emit `watch_created`/`watch_updated` from `CreateWatch`, `PUT /watch`, clone/share/bulk operations, and edit save. Do not duplicate event logic in every route: add a small `emit_watch_event()` helper used by the API/UI API.
  - Emit `watch_queued` in `queue_item_async_safe` or its callers, with the UUID.
  - Emit `watch_check_started` from the worker where `watch_small_status_comment` is already emitted.
  - Emit `watch_change_detected` from the worker where `changed_detected` is known, after the history is written.
  - Enrich `notification_event` with success/error (or publish `notification.sent` from the notification queue).
- Do not call `url_for` or render templates inside event serialization; use raw values and ISO/Unix timestamps.
- Flask-Compress: ensure `text/event-stream` is not compressed. Current MIME list does not include it, but add an explicit exclusion if needed.
- The SSE endpoint must be registered before/independent of Socket.IO; it works even when `socket_io_enabled` is false? Decision: the existing UI setting `socket_io_enabled` becomes "Realtime updates" for the new UI. If false, the SSE endpoint returns `204` and the SPA shows "Live updates off". The old Socket.IO setting continues to control the old UI.

### 6.4 Client implementation

- `createEventSource()` in `api/sse.ts`:
  - Single `EventSource(`${apiBase}/ui/events`)`.
  - `withCredentials` is automatic for same-origin.
  - Listen to named events and dispatch to query cache handlers.
  - `onopen`: if this is a reconnect, set a flag and perform exactly one refetch of the active queries (not a polling loop).
  - `onerror`: set status to `reconnecting`; let `EventSource` retry; do not create duplicates.
  - `onmessage`/named events: parse JSON, dedupe by `event.lastEventId`.
  - On unmount/logout: close the stream.
- Connection indicator:
  - `Live` (green dot) when open.
  - `Reconnecting` (amber pulsing dot) after error.
  - `Off` (gray/red) when realtime is disabled or the browser is offline.
  - Show a tooltip with the last event time and a "Retry now" action.
- No `setInterval` data fetches. A single `setInterval` at 30s may update relative-time labels; it performs no network I/O.

### 6.5 Production / deployment notes

- Default Docker: single process, Werkzeug threaded. SSE works. Each open tab holds one connection; a typical deployment has a handful.
- Nginx:
  ```nginx
  location /api/v1/ui/events {
      proxy_pass http://changedetection;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_buffering off;
      proxy_cache off;
      proxy_read_timeout 3600s;
      gzip off;
      add_header X-Accel-Buffering no;
  }
  ```
- If using gunicorn:
  - `gthread` worker with `--threads` comfortably above the number of concurrent SSE clients, or `gevent`.
  - Multi-worker deployments need sticky sessions or a shared broker; otherwise events generated in worker A are not seen by clients in worker B. The plan documents this limitation and keeps the default single-process deployment correct.
- If using a CDN/reverse proxy that buffers by default, test with `curl -N` and verify frames arrive immediately.
- Add a health check to the README: open `/app`, confirm the connection indicator is "Live", trigger a recheck, see the row update without a reload.

---

## 7. Backend gaps and minimal endpoints to add

All new endpoints are additive. No old route or behavior is removed. New `/api/v1/ui/*` endpoints use the Flask session + CSRF; existing `/api/v1/*` keeps `x-api-key`.

### 7.1 Auth / bootstrap / i18n

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/ui/bootstrap` | Auth state, CSRF token, locale, languages, feature flags, base path, settings summary, API key when authenticated. |
| POST | `/api/v1/ui/login` | JSON password login; sets session; returns bootstrap. |
| POST | `/api/v1/ui/logout` | JSON logout. |
| POST | `/api/v1/ui/locale` | Set session locale; returns new locale (or reuse `/set-language/<locale>`). |
| GET | `/api/v1/ui/i18n/<locale>` | Existing `.po` catalog as JSON. |

### 7.2 Realtime

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/ui/events` | Single SSE stream (session auth). |

### 7.3 Dashboard / bulk / queue

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/ui/watches/bulk` | `{op, uuids, extra_data}` for all bulk operations; reuses `_handle_operations`. |
| GET | `/api/v1/ui/watches/ids` | UUIDs matching a filter (for select-all-matching without fetching details). Optional: the SPA can filter the full list. |
| POST | `/api/v1/ui/watches/{uuid}/recheck` | Queue one watch (POST, CSRF-safe). |
| POST | `/api/v1/ui/watches/{uuid}/clone` | Clone and return new UUID. |
| POST | `/api/v1/ui/watches/{uuid}/share` | Share watch config and return URL. |
| POST | `/api/v1/ui/watches/{uuid}/mark-viewed` | Mark viewed. |
| POST | `/api/v1/ui/watches/{uuid}/clear-errors` | Clear last error. |
| POST | `/api/v1/ui/watches/{uuid}/clear-history` | Clear history (or reuse `DELETE /api/v1/watch/{uuid}/history`). |
| GET | `/api/v1/ui/queue` | JSON snapshot (alias/wrapper of `/queue.json`). |
| POST | `/api/v1/ui/queue/clear` | Clear queue, returns count. |
| POST | `/api/v1/ui/queue/cancel` | Cancel running UUID. |

### 7.4 Watch detail / preview / diff

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/ui/watches/{uuid}/preview` | Preview data: version, text, trigger/ignore/block line numbers, error text, screenshot flags. |
| POST | `/api/v1/ui/watches/{uuid}/filters/preview` | Apply current unsaved filter form values and return before/after text + highlights. |
| POST | `/api/v1/ui/watches/{uuid}/conditions/verify` | Verify one condition rule against the current snapshot. |
| GET | `/api/v1/ui/watches/{uuid}/screenshot` | Latest screenshot image (and `?error=1` for the error screenshot). |
| GET | `/api/v1/ui/watches/{uuid}/visual-selector` | Decompressed element data JSON + screenshot URL. |
| POST | `/api/v1/ui/watches/{uuid}/summary` | Start/return AI change summary for a version pair. |
| GET | `/api/v1/ui/watches/{uuid}/summary` | Read summary status/result. |
| GET | `/api/v1/ui/watches/{uuid}/processor-data` | Restock/image processor data for the graph. |
| GET | `/api/v1/ui/watches/{uuid}/processor-chart` | Processor chart image/JSON (as provided by the processor). |
| GET | `/api/v1/ui/watches/{uuid}/processor-export.xlsx` | Processor XLSX export. |
| POST | `/api/v1/ui/watches/{uuid}/extract` | Regex extract → CSV. |
| GET | `/api/v1/ui/watches/{uuid}/download-patch` | Download difference patch. |

Diff text itself can be computed client-side from two existing snapshot endpoints for character mode; the existing `/difference` API remains available for server-rendered line/word diffs.

### 7.5 Browser Steps / visual add

- Reuse the existing JSON endpoints:
  - `POST /browser-steps/browsersteps_start_session?uuid=...`
  - `POST /browser-steps/browsersteps_update?uuid=...&browsersteps_session_id=...`
  - `GET /browser-steps/browsersteps_image?uuid=...&step_n=...`
  - `POST /add-watch-ui/snapshot`
- If we want all calls under `/api/v1/ui`, add thin aliases:
  - `POST /api/v1/ui/watches/{uuid}/browser-steps/session`
  - `POST /api/v1/ui/watches/{uuid}/browser-steps/action`
  - `POST /api/v1/ui/add-watch/preview`
- The alias endpoints reuse the same functions; no new browser logic.

### 7.6 Groups / tags

- Existing `/api/v1/tag` covers create/update/delete/get.
- Add:
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/ui/groups/{uuid}/unlink` | Remove the tag from all watches, keep the tag. |
| POST | `/api/v1/ui/groups/{uuid}/mute` | Toggle mute (POST, CSRF-safe). |
| POST | `/api/v1/ui/groups/{uuid}/recheck` | Recheck all watches in the group. |
| GET | `/api/v1/ui/groups` | Full group list with colours, patterns, counts (or enrich `/api/v1/tags`). |

### 7.7 Settings / notifications / MCP / plugins

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/ui/settings` | Read `settings.application`, `settings.requests`, UI options, LLM, MCP summary, feature flags. Secrets are masked. |
| PUT | `/api/v1/ui/settings` | Validate with existing forms and save. Sections: general, fetching, filters, ui, rss, proxies, notifications, llm, mcp. |
| POST | `/api/v1/ui/settings/password` | Set/remove password (or part of settings). |
| POST | `/api/v1/ui/settings/api-key/reset` | Regenerate API key. |
| GET | `/api/v1/ui/notifications/logs` | Notification debug log (JSON). |
| POST | `/api/v1/ui/notifications/test` | Send a test notification. |
| GET | `/api/v1/ui/notifications/apprise/services` | Alias of the existing JSON service catalog (optional). |
| GET/PUT | `/api/v1/ui/mcp` | MCP settings. |
| GET/POST | `/api/v1/ui/mcp/tokens` | List/add token. |
| POST | `/api/v1/ui/mcp/tokens/{id}` | Update token. |
| POST | `/api/v1/ui/mcp/tokens/{id}/revoke` | Revoke token. |
| GET | `/api/v1/ui/mcp/oauth/grants` | List grants. |
| POST | `/api/v1/ui/mcp/oauth/grants/{id}/revoke` | Revoke grant. |
| GET | `/api/v1/ui/plugins` | Plugin settings tabs + field metadata (type, label, choices, help). |
| PUT | `/api/v1/ui/plugins/{id}` | Save plugin settings. |

Custom plugin templates cannot be generically rendered; those tabs link to the legacy settings page. This preserves the feature and is called out in the parity checklist.

### 7.8 Import / export / backups

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/ui/import/xlsx` | Multipart XLSX import (Wachete/custom mapping). |
| POST | `/api/v1/ui/import/distill` | Distill.io JSON import. |
| POST | `/api/v1/ui/import/urls` | Optional alias of `/api/v1/import` for form-style URL lists with tags. |
| GET | `/api/v1/ui/backups` | List backups. |
| POST | `/api/v1/ui/backups` | Create backup. |
| DELETE | `/api/v1/ui/backups/{filename}` | Remove one/all backups. |
| GET | `/api/v1/ui/backups/{filename}/download` | Download backup. |
| POST | `/api/v1/ui/backups/restore` | Multipart restore with include/replace options. |
| GET | `/api/v1/ui/export/watches.json` | Export watch configs (no history). Could |
| GET | `/api/v1/ui/export/watches.csv` | Export watch configs as CSV. Could |

### 7.9 Minimal changes to existing API / models

- Enrich `GET /api/v1/watch` list items with `history_n`, `fetch_time`, and `error_text` (compiled error text) so the dashboard can render without N+1 calls. Keep the existing fields unchanged.
- Enrich `GET /api/v1/tags` list items with `tag_colour`, `url_match_pattern`, `overrides_watch`, `notification_muted`, and `watch_count` (computed) so the Groups screen is one request.
- Add `watch.created` / `watch.updated` events from create/update paths (backend, not API schema).
- Optionally add a `format_price` helper endpoint? Not needed; use `Intl.NumberFormat`.
- Optionally add `timezone` list to bootstrap or `/api/v1/ui/settings`; or use the browser's `Intl.supportedValuesOf('timeZone')` with a server-provided current value. Use the browser API to avoid a backend change.

### 7.10 Endpoint conventions

- All new endpoints return JSON (`application/json`), except binary downloads and SSE.
- Errors: `{ "error": "message", "fields": {"field": ["message"]} }` with proper HTTP status.
- Mutations are `POST`/`PUT`/`DELETE`, never side-effecting GET.
- CSRF header: `X-CSRFToken`.
- Pagination (where needed): `{items, page, perPage, total, totalPages}`.
- Timestamps: Unix seconds (same as existing API), plus ISO strings where useful.
- No new endpoint leaks secrets; API keys/passwords are masked on GET.

---

## 8. Build order and risks

### 8.1 Build order

**Phase 2 — Foundation (approved plan first):**
1. Backend scaffolding:
   - SSE broker + signals + `/api/v1/ui/events`.
   - Bootstrap/login/logout/session + CSRF helpers.
   - `/api/v1/ui` blueprint + auth decorators + error format.
   - i18n catalog endpoint.
   - Minimal existing API enrichment (`watch` list fields, `tags` list fields).
   - Tests for auth, SSE, and new endpoints.
2. Frontend foundation:
   - Vite/React/TS/Tailwind project.
   - Design tokens, primitives, app shell, bottom tabs/sidebar.
   - Theme system + language picker.
   - API client, query client, error normalizer.
   - Login screen.
   - SSE client + connection indicator + query cache patching.
   - Error boundary, toasts, empty/loading components.

**Phase 3 — Screens, in this order:**
1. Dashboard + quick add watch.
2. Watch detail: history, diff (line/word/character), preview, screenshot, error states.
3. Watch edit: general, request, filters/triggers, conditions, notifications, AI, stats, schedule, restock settings.
4. Groups and global settings.
5. Import/export/backups/queue/notification log.
6. Price/restock graph.
7. Browser Steps and Visual Selector.
8. Plugin tabs, MCP settings, PWA, polish.

After each screen: test at 360px, 768px, 1280px, light and dark; run keyboard/a11y checks; report.

**Phase 4 — Quality and handoff:**
- End-to-end flows: add watch, edit, see a change, read the diff, save a notification setting, import a list.
- Keyboard/a11y audit (axe + manual).
- 500+ watch performance test (virtualization, filter, bulk select).
- SSE reconnect/resync test, proxy buffering test.
- README: develop/build/serve/switch from old UI.
- Parity checklist complete.
- User approval.

### 8.2 Why Browser Steps and Visual Selector are last

They are the hardest and riskiest:
- They depend on Playwright/Chromium being available.
- They use live screenshots, canvas coordinate mapping, and per-step error state.
- Mobile interaction (tap vs drag, pinch zoom, small targets) needs careful design.
- They must not block the core dashboard/diff/edit work.

They are still **Must** and are included in the plan. If the browser backend is not configured, the UI shows a clear "requires a browser fetcher" explanation and the rest of the watch edit page still works.

### 8.3 Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| SSE thread-per-connection under Werkzeug | Many tabs could exhaust threads | Document limits; keep single-process default; recommend gthread/gevent for high concurrency; one stream per tab; close on logout/unload. |
| Reverse proxy buffers SSE | "Live" never updates | Send `X-Accel-Buffering: no`, `no-transform`; document nginx config; test with `curl -N`. |
| Multi-worker deployment loses events | Some clients miss updates | Document single-process default; sticky sessions or a shared broker if multi-worker. |
| Backend gaps are larger than expected | Schedule slip | Additive `/api/v1/ui` endpoints; reuse existing functions; build in the listed order; no big-bang rewrite. |
| Old UI and new UI share backend state | Regression risk | Do not modify old routes/templates; add signals/endpoints only; run old test suite; feature-flag new UI at `/app`. |
| Diff performance on huge snapshots | UI freezes | Web Worker; line virtualization; character diff only for visible changed lines; cap initial render. |
| Canvas/visual selector on mobile | Unusable interactions | Full-screen mode; tap-to-select; zoom controls; large hit targets; test on 360px. |
| Browser Steps requires Playwright | Feature unavailable on plain installs | Clear capability message; hide/disable with explanation; never crash the edit page. |
| i18n drift | Missing translations | Catalog endpoint + extraction script + CI check; English fallback. |
| Plugin custom templates | Can't render generically | Generic WTForms renderer for simple fields; link to legacy for custom templates; parity checklist notes it. |
| API key in SPA memory | Key exposure on XSS | Strict output escaping, no raw HTML, CSP-friendly build, key only in memory, not persisted; new endpoints use session+CSRF. |
| 500+ watches | Slow list | Single fetch, virtualization, memoized rows, no per-row calls, server list enrichment. |
| Destructive actions | Data loss | Confirmation dialogs, explicit labels, no optimistic delete, clear-history separate from delete. |
| Date/timezone confusion | Wrong schedules | Browser timezone list, server current time, explicit timezone labels, tests around DST. |
| Translation of new strings | Untranslated UI | Reuse existing msgids; add new strings to catalogs; fallback to English. |

---

## 9. Definition of done and parity checklist

The project is done when:

- All **Must** and **Should** features in section 1 work at 360px, 768px, and 1280px, in light and dark mode.
- No data polling for live updates; SSE is the only realtime transport for the new UI.
- The dashboard stays smooth with 500+ watches (virtualized, no per-row fetches).
- Login/logout, password-disabled mode, CSRF, and sub-path deployments work.
- The built frontend is served by Flask without Node.js at runtime.
- Existing translations are available; new strings have an extraction path.
- Browser Steps and Visual Selector work when a capable browser is configured, and degrade with a clear message when not.
- `docs/new-frontend/PARITY.md` maps every old feature to its new location and status.
- `docs/new-frontend/README.md` explains development, build, serving, switching from the old UI, and SSE/proxy requirements.
- The user has tested and approved the result.

Parity checklist format (to be filled during implementation):

| Old feature | Old location | New location | Status |
|---|---|---|---|
| Quick add watch | Dashboard form | Dashboard quick add | Not started |
| Bulk pause/mute/recheck | Dashboard toolbar | Selection action bar | Not started |
| ... | ... | ... | ... |

---

## 10. Questions for the user (max 5)

1. **Route strategy**: I recommend serving the new UI at `/app` during development and switching `/` to redirect to `/app` only after your approval, keeping the old routes available as a fallback. Is that acceptable, or do you want the new UI at `/` from the start?
2. **Backend additions**: The plan needs additive endpoints under `/api/v1/ui/*` (settings, bulk actions, queue, previews, backups, MCP, SSE) plus small enrichments to the existing watch/tag list responses. Do you approve these minimal backend additions? (No existing endpoint or old UI behavior will be removed.)
3. **Plugin parity**: For plugin settings, I plan a generic renderer for simple WTForms fields and a link to the legacy settings page for plugins that ship custom templates. Is that acceptable, or must every plugin screen be fully re-rendered in the new design?
4. **Priority of advanced screens**: I plan AI/LLM as **Must**, MCP server settings and plugin tabs as **Should**, and MCP OAuth consent as **Should** (reusing the legacy consent page initially). Do you agree with that split?
5. **Translations**: I plan to reuse the existing `.po/.mo` catalogs via a JSON endpoint and add new UI strings to the existing translation workflow, with English fallback. Is that the desired approach, or should the new UI be English-only for the first version?

---

## Approval gate

**No application code will be written until you reply with "approved" (and answer the questions above, if needed).**

After approval, Phase 2 starts with the backend SSE/auth/UI-API scaffolding and the frontend foundation. The old frontend remains untouched.
