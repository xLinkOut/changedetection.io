# New frontend — Pulse

This folder contains the planning and handoff material for the new changedetection.io frontend.

**Current status:** Phase 0 (exploration) and Phase 1 (plan) are complete. The plan is approved with a narrowed Wave 1 scope. **No application code has been written yet.**

**Branch:** `new-frontend`

## Read in this order

1. [`DECISIONS.md`](./DECISIONS.md) — authoritative approved decisions and handoff checklist.
2. [`PHASE-0-EXPLORATION.md`](./PHASE-0-EXPLORATION.md) — how the old frontend, auth, APIs, realtime, production serving and translations work; complete old-UI inventory.
3. [`PHASE-1-PLAN.md`](./PHASE-1-PLAN.md) — feature inventory, IA, wireframes, design system, architecture, SSE design, backend gaps, build order and risks.
4. [`PARITY.md`](./PARITY.md) — Wave 1, legacy-link and later-wave checklist.

## Approved decisions in one screen

- New frontend name: **Pulse**
- URL: **`/pulse`**
- New API: **`/api/v2`** (session + CSRF, browser-first). `/api/v1` stays unchanged for external clients.
- The browser never receives the v1 API key.
- Wave 1: homepage/dashboard, single-watch edit, watch detail/diff/preview, groups, basic settings, import URL list, queue, SSE, AI/LLM, English + Italian.
- Wave 1 legacy links: Browser Steps, Visual Selector, XLSX/Distill import, MCP, plugins, Apprise builder, advanced image diff, share-as-image, MCP OAuth consent, PWA install.
- No polling for live data in Pulse: SSE only.
- Old frontend stays untouched and fully available.
- Do not delete the old frontend until parity is complete and the user agrees.

## Next step after context compaction

Start Phase 2:

1. Create `/api/v2` (auth/bootstrap/login/logout, JSON errors, session + CSRF).
2. Add the SSE broker and `GET /api/v2/events`.
3. Add the v2 endpoints needed for Wave 1 (dashboard watches, watch detail/history, watch update, tags/groups, settings, queue, import URL list).
4. Scaffold `frontend/` (Vite + React + TypeScript + Tailwind).
5. Build the Pulse shell/theme/API client/login/SSE client.
6. Build the dashboard first, then watch detail, then watch edit.

## Working rules

- Mobile-first: test 360px, 768px, 1280px.
- Light and dark themes.
- No Node.js at runtime; build output is served by Flask.
- Small commits with clear messages.
- Never fake a feature. If it is legacy in Wave 1, link to it and mark it as legacy.
