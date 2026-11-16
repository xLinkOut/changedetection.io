# New frontend — Pulse

This folder contains the planning and handoff material for the new changedetection.io frontend.

**Current status:** Phase 0 (exploration) and Phase 1 (plan) are complete. Phase 2 is in progress: the `/api/v2` backend, SSE stream, Pulse shell and the main Wave 1 screens are implemented and smoke-tested. See [`PHASE-2-PROGRESS.md`](./PHASE-2-PROGRESS.md) for what works and the known gaps.

**Branch:** `new-frontend`

## Read in this order

1. [`DECISIONS.md`](./DECISIONS.md) — authoritative approved decisions and handoff checklist.
2. [`PHASE-0-EXPLORATION.md`](./PHASE-0-EXPLORATION.md) — how the old frontend, auth, APIs, realtime, production serving and translations work; complete old-UI inventory.
3. [`PHASE-1-PLAN.md`](./PHASE-1-PLAN.md) — feature inventory, IA, wireframes, design system, architecture, SSE design, backend gaps, build order and risks.
4. [`PARITY.md`](./PARITY.md) — Wave 1, legacy-link and later-wave checklist.
5. [`PHASE-2-PROGRESS.md`](./PHASE-2-PROGRESS.md) — implemented endpoints/screens, verification and known gaps.
6. [`../../frontend/README.md`](../../frontend/README.md) — develop, build, serve, SSE proxy notes and layout.

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

## Next steps

1. Review the first Pulse milestone with the user (dashboard, watch detail, watch edit, groups, settings, queue, SSE).
2. Close the Wave 1 gaps listed in `PHASE-2-PROGRESS.md`: error summary, diff minimap, extract-to-CSV, 500+ performance, a11y audit, remaining Italian strings.
3. Finish the Wave 1 parity checklist and only then discuss switching `/` to `/pulse`.

## Working rules

- Mobile-first: test 360px, 768px, 1280px.
- Light and dark themes.
- No Node.js at runtime; build output is served by Flask.
- Small commits with clear messages.
- Never fake a feature. If it is legacy in Wave 1, link to it and mark it as legacy.
