# Pulse frontend

Pulse is the new changedetection.io UI. It is a Vite + React + TypeScript SPA
served by Flask at `/pulse`.

The legacy UI is untouched and remains at its existing routes.

## Requirements

- Node.js 20+ for development and building.
- No Node.js at runtime: `npm run build` writes plain static files to
  `changedetectionio/static/pulse/`, which Flask serves.

## Development

```bash
# terminal 1: Flask
cd ..
python changedetection.py -d /path/to/datastore -p 5000

# terminal 2: Vite
npm install
npm run dev
# open http://localhost:5173/pulse/
```

Vite proxies `/api`, `/static`, `/login` and `/logout` to Flask on port 5000.
Set `VITE_*` or edit `vite.config.ts` if your Flask port differs.

## Build

```bash
npm run build
```

This runs `tsc -b` and Vite. Output:

- `changedetectionio/static/pulse/manifest.json`
- `changedetectionio/static/pulse/assets/*`

Commit the built files with the source change, so production images do not need
a Node build stage.

## Design system

- Visual reference: [`../docs/new-frontend/DESIGN.md`](../docs/new-frontend/DESIGN.md).
- Tokens: `src/styles/globals.css` (indigo `#5347CE`, violet `#887CFD`,
  azure `#4896FE`, teal `#16C8C7`; light/dark variants).
- Font: SF Pro Display first, then SF Pro Text, `-apple-system`, Inter,
  Segoe UI Variable, Ubuntu Sans and system fallbacks. SF Pro is not bundled.
- Motion: `prefers-reduced-motion` disables every animation; page entrance is
  opacity-only so it cannot break fixed action bars.
- Theme and language are also in **Settings → Interface** for phones.

## Keyboard

- `⌘K` / `Ctrl+K`: command palette, searches watches on the server and jumps to
  screens. Arrow keys move, Enter opens, Escape closes, Tab stays inside.
- The dashboard banner has a 44px close button and remembers its collapsed
  state in this browser; the collapsed strip keeps the live counts visible.
- Watch tabs and segmented controls support Left/Right/Home/End with roving
  tabindex; dialogs return focus to the trigger.
- Every screen is audited for accessible names, labels, heading order, focus
  visibility, 44px tap targets and WCAG AA contrast.

## How it talks to the backend

- Only `/api/v2` is used by the SPA. It is authenticated with the Flask session
  and `X-CSRFToken` (not the v1 API key).
- `/api/v1` remains for external clients and is not called by Pulse.
- Live updates use one `EventSource` at `GET /api/v2/events`:
  - event ids and `Last-Event-ID` replay,
  - `resync` when the replay window is missed,
  - heartbeats,
  - one refetch after a reconnect,
  - no polling for live data.

## SSE reverse-proxy notes

Disable buffering for `/api/v2/events`; otherwise the connection indicator may
say “Live” while updates arrive late. Example nginx:

```nginx
location /api/v2/events {
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

The default Docker deployment is a single threaded Werkzeug process, which
works for a handful of open tabs. For many concurrent SSE clients use a
threaded/gevent server and a shared broker or sticky sessions.

## i18n

- English is the source; Italian is the first Pulse catalog.
- `GET /api/v2/i18n/<locale>` returns the existing Babel `.po` catalog as JSON.
- `npm run i18n:extract` writes `i18n-strings.json` with `t()`/`tn()` msgids and
  common translatable object fields (`title`, `label`, `description`) so data
  arrays are not missed.
- All 840 current Pulse strings have Italian translations. Strings with no
  translation fall back to English.
- Compile after editing the catalog:
  `pybabel compile -d changedetectionio/translations -l it`.

## Layout

```
src/
├── app/          router, providers, error boundary
├── components/   design-system primitives, brand mark, layout, palette
├── features/     auth, dashboard, watch, watch-edit, groups,
│                 settings, queue, import, notifications
├── lib/          API client, queries, SSE, i18n, theme, formatting, diff
└── styles/       Tailwind entry and design tokens
```

The build splits vendor code into `react`, `query`, `radix` and `diff` chunks;
the app entry stays around 324 kB (79 kB gzip).

The dashboard requests one page at a time (`per_page` from the pager-size
setting); pager size 0 requests every watch.

## Useful checks

```bash
npm run typecheck
npm run build
```

Manual smoke test:

1. Open `/pulse` and sign in.
2. Add a watch.
3. Recheck it and watch the row update without a reload.
4. Open Changes, switch to Words/Character, apply a diff filter.
5. Open Edit, change the title, save.
6. Open Settings → AI and save without a provider configured.
7. Open Queue and confirm it updates live.
