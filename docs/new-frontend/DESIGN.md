# Pulse — visual direction

Status: **implemented 2026-11-17**, supersedes the neutral "calm admin dashboard"
style from the first milestone.

The first Pulse build worked but looked like every other monitoring dashboard.
This direction gives it a point of view: **a signal room, not a settings panel**.
Everything still serves the monitoring job; the identity lives in colour, type,
surface and motion, not in extra screens.

## 1. Idea

Monitoring is about separating a signal from noise. The UI borrows that language:

- a **pulse trace** as the product mark;
- a **live equalizer** where activity is real (SSE connection and checks);
- a **signal spine** on each watch row/card, coloured by state;
- a **change map** beside the diff;
- an **aurora** of the four brand colours behind primary surfaces.

Nothing is decorated with fake data. Bars move only when the app is connected or
checking; counts always come from `/api/v2`.

## 2. Palette

| Token | Hex | Use |
|---|---|---|
| indigo | `#5347CE` | primary action, active nav, focus |
| violet | `#887CFD` | unread/activity, gradient mid-point |
| azure | `#4896FE` | in-progress, info, gradient mid-point |
| teal | `#16C8C7` | healthy/live, success, gradient end |

The four form one gradient, `120deg` in that order. It is used on the logo,
primary buttons, active filters, the mobile add button and the signal traces.
It is deliberately **not** used for body text or large backgrounds; the aurora
uses the same colours at 10–30% opacity with blur.

Neutrals are violet-tinted, never pure grey:

- Light: paper `#F6F5FC`, surface `#FFFFFF`, border `#E3E0F2`, ink `#17142B`.
- Dark: void `#08070F`, surface `#110F1E`, border `#282440`, ink `#F4F2FF`.
- The desktop sidebar is always deep indigo (`#141129 → #201A42`), so the app has
  a control-room edge even in light mode.

## 3. Typography

- **SF Pro Display** first, then SF Pro Text, `-apple-system`, Inter, Segoe UI
  Variable, Ubuntu Sans, system fallbacks. SF Pro is not redistributed with the
  project; Apple devices use the installed face, other platforms use the closest
  system face.
- Display numbers use tabular numerals and `-0.04em` tracking.
- Headings use `-0.022em` tracking and line-height near 1.05.
- The interface stays at 13–15px; only the hero, page titles and stat numbers
  become large.

## 4. Surface recipes

- `.pulse-card`: 18px radius, 1px tinted border, two-layer soft shadow.
- `.signal-hero`: layered radial gradients (violet, azure, teal) over surface,
  plus a 1px gradient hairline and a 3.5% noise grain.
- `.signal-gradient-border`: mask-based 1px gradient border.
- `.glass`: translucent surface with 20px blur for the desktop command bar and
  the mobile dock.
- `.signal-spine`: 3px state-coloured bar on the left of every watch row/card.
- `.unread-sheen`: a slow teal-to-violet hairline sweep on unread cards.
- `.scanning`: a soft light sweep while a check is running.
- `.equalizer`: 3–5px bars, transform-only animation, disabled under
  `prefers-reduced-motion`.

The mobile dock is a floating glass bar with four destinations and a raised
gradient add action. The desktop sidebar is a dark panel with a slim gradient
active marker.

## 5. Motion

- Page entrance: opacity only (never transform, because transformed ancestors
  break `position: fixed` action bars).
- Cards and settings tiles lift ~2px on hover with a violet-tinted shadow.
- Status pips use the existing ping; activity bars breathe.
- Every animation is disabled by the global `prefers-reduced-motion` rule.
- The diff change map is clickable: the only "animated" navigation it needs is
  smooth scroll.

## 6. Signature interactions

- **⌘K / Ctrl+K** opens a command palette from any screen. It searches watches
  on the server and navigates to screens; arrow keys and Enter work.
- Active diff layout is a quiet two-option switch; diff mode (lines/words/chars)
  carries the gradient so the toolbar has one primary choice.
- Watch detail tabs wrap on phones instead of hiding tabs off-screen.
- Every destructive action keeps a confirmation dialog.
- The language control is in the top bar on desktop and in
  Settings → Interface on phones, next to the local appearance controls.

## 7. Language

English is the source. Italian is a first-class catalog for Pulse. Rules:

- Do not translate literally when the result is stiff. `Live` stays `Live`;
  `Offline` stays `Offline`.
- A watch is a **monitoraggio** (plural **monitoraggi**). Use "sito/pagina" only
  when talking about the actual website.
- Keep product/technical names in English: SSE, AI, API, Apprise, Jinja2, RSS,
  WebSocket, proxy, backup.
- Prefer verbs people use: "Ricontrolla", "Segna come letto", "Aggiungi".
- Avoid "Sano" for healthy (use **Attivo**), "Rifornimento" for restock (use
  **Disponibilità**), "In linea" for inline (use **Unificato**).
- UI copy is sentence case; only eyebrows/table headers are uppercase.

All 797 strings currently used by Pulse have an Italian translation. New strings
must be added to `changedetectionio/translations/it/LC_MESSAGES/messages.po`
and `.mo` recompiled with `pybabel compile -d changedetectionio/translations -l it`.

## 8. Implementation notes

- Tokens live in `frontend/src/styles/globals.css`; Tailwind exposes them as
  `bg`, `surface`, `fg`, `primary`, `violet`, `azure`, `teal`, etc.
- The mark is `components/brand/PulseMark.tsx`.
- The command palette is `components/layout/CommandPalette.tsx`.
- The diff map is `features/watch/DiffMinimap.tsx` and receives the same
  `DiffPart[]` as the diff viewer.
- Vendor code is split into `react`, `query`, `radix` and `diff` chunks; the app
  entry is ~311 kB (76 kB gzip) after the split.
- Target sizes remain 360 / 768 / 1280 px, light and dark, with 44px tap targets.
