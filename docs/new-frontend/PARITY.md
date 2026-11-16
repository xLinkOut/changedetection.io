# Pulse — feature parity checklist

Status legend:
- **Pulse** — implemented/rebuilt in the new UI.
- **Legacy link** — remains in the old UI for Wave 1; Pulse links to it.
- **Later** — planned for a later wave.
- **N/A** — not a user-facing feature.

Update this file as work progresses. A feature is not "done" until it works at 360px, 768px and 1280px, in light and dark mode, with keyboard access.

## Wave 1 — essential tools

| Old feature | Old location | New location | Wave 1 status |
|---|---|---|---|
| Password login | `/login` | `/pulse/login` | Not started |
| Logout | top menu | Pulse user menu | Not started |
| Language selector | header modal | Pulse settings/user menu (English + Italian) | Not started |
| Light/dark/system theme | header toggle | Pulse top bar/settings | Not started |
| Global search | search modal | Pulse dashboard search | Not started |
| Global pause/resume | top menu | Pulse global status menu | Not started |
| Global mute/unmute | top menu | Pulse global status menu | Not started |
| Unread badge | sidebar | Pulse sidebar/tab badge | Not started |
| Queue/checking counts | sidebar | Pulse sidebar/status | Not started |
| Watch list/cards | `/` | `/pulse` | Not started |
| Watch status/error/unread | dashboard rows | Pulse watch cards/rows | Not started |
| Last checked/changed | dashboard rows | Pulse watch cards/rows | Not started |
| Favicon | dashboard rows | Pulse watch cards/rows | Not started |
| Tags on watch | dashboard rows | Pulse watch cards/rows | Not started |
| Processor badge | dashboard rows | Pulse watch cards/rows | Not started |
| Restock/price display | dashboard rows | Pulse watch cards/rows | Not started |
| Quick add URL + Watch | dashboard form | Pulse dashboard quick add | Not started |
| Advanced quick add (processor/tags/LLM intent) | dashboard form | Pulse add sheet | Not started |
| Tag/group filter | dashboard | Pulse filters | Not started |
| Status filters (All/Unread/Deals/Errors/Healthy) | dashboard | Pulse filters | Not started |
| Processor filter | dashboard | Pulse filters | Not started |
| Sort | dashboard | Pulse filters | Not started |
| Pagination/virtualization | dashboard | Pulse virtualized list | Not started |
| Bulk pause/unpause/mute/unmute/recheck | dashboard toolbar | Pulse selection bar | Not started |
| Bulk mark viewed/unviewed | dashboard toolbar | Pulse selection bar | Not started |
| Bulk clear errors | dashboard toolbar | Pulse selection bar | Not started |
| Bulk delete (confirm) | dashboard toolbar | Pulse selection bar | Not started |
| Select all matching | dashboard | Pulse selection bar | Not started |
| Mark all viewed (filtered) | dashboard | Pulse dashboard action | Not started |
| Recheck all (filtered) | dashboard | Pulse dashboard action | Not started |
| Row recheck/edit/history/preview | dashboard rows | Pulse watch card/row actions | Not started |
| Live row updates | Socket.IO | Pulse SSE | Not started |
| Watch history/version list | `/diff/<uuid>` | `/pulse/watches/:uuid/changes` | Not started |
| Diff by lines/words | `/diff/<uuid>` | Pulse diff viewer | Not started |
| Diff by character | (not in old UI, requested) | Pulse diff viewer | Not started |
| Diff filters | `/diff/<uuid>` | Pulse diff toolbar | Not started |
| Diff previous/next | `/diff/<uuid>` | Pulse diff keyboard/buttons | Not started |
| Diff minimap | `/diff/<uuid>` | Pulse diff minimap | Not started |
| AI change summary | `/diff/<uuid>` | Pulse diff summary | Not started |
| Text preview highlights | `/preview/<uuid>` | Pulse preview tab | Not started |
| Screenshot/error screenshot | `/diff`, `/preview` | Pulse screenshot/error tabs | Not started |
| Error text | `/diff` | Pulse error tab | Not started |
| Download diff patch | `/diff` | Pulse diff action | Not started |
| Price/restock graph | `/diff`, dashboard | Pulse price tab | Not started |
| Watch edit General | `/edit/<uuid>` | `/pulse/watches/:uuid/edit/general` | Not started |
| Watch edit Request | `/edit/<uuid>` | Pulse edit Request tab | Not started |
| Watch edit Filters & Triggers | `/edit/<uuid>` | Pulse edit Filters tab | Not started |
| Watch edit Conditions | `/edit/<uuid>` | Pulse edit Conditions tab | Not started |
| Watch edit Notifications | `/edit/<uuid>` | Pulse edit Notifications tab | Not started |
| Watch edit AI/LLM | `/edit/<uuid>` | Pulse edit AI tab | Not started |
| Watch edit Schedule | `/edit/<uuid>` | Pulse edit General/Schedule | Not started |
| Watch edit Restock | `/edit/<uuid>` | Pulse edit Restock tab | Not started |
| Watch edit Stats | `/edit/<uuid>` | Pulse edit Stats | Not started |
| Watch delete/clear history | `/edit/<uuid>` | Pulse edit danger actions | Not started |
| Groups list/create/edit/delete/mute/recheck | `/tags/*` | `/pulse/groups` | Not started |
| Group colour/URL pattern/AI/filters/notifications/restock | `/tags/edit/<uuid>` | Pulse group edit | Not started |
| Global settings core | `/settings` | `/pulse/settings/*` | Not started |
| Global notifications basic | `/settings/notifications` | `/pulse/settings/notifications` | Not started |
| AI/LLM provider settings | `/settings/ai/llm` | `/pulse/settings/ai` | Not started |
| API key display/reset | `/settings#api` | `/pulse/settings/api` | Not started |
| RSS settings | `/settings#rss` | `/pulse/settings/rss` | Not started |
| Time/timezone | `/settings#timedate` | `/pulse/settings/general` | Not started |
| Proxies/extra browsers | `/settings#proxies` | `/pulse/settings/proxies` | Not started |
| Backups create/list/download/remove/restore | `/backups/*` | `/pulse/settings/backups` | Not started |
| Import URL list | `/imports/import` | `/pulse/import` | Not started |
| Queue snapshot/cancel/clear | `/queue` | `/pulse/queue` | Not started |
| Queue live updates | Socket.IO + 8s polling | Pulse SSE | Not started |
| Notification sent event | Socket.IO stub | Pulse toast/log | Not started |
| Connection indicator | old offline notice | Pulse indicator | Not started |
| Mobile navigation | hamburger drawer | Pulse bottom tabs | Not started |
| Keyboard accessibility | partial | Pulse full audit | Not started |
| Italian translations | old UI only | Pulse English + Italian | Not started |

## Wave 1 — legacy links

| Feature | Legacy location | Pulse link | Status |
|---|---|---|---|
| Browser Steps | `/edit/<uuid>#browser-steps` | Watch edit → Advanced → Browser Steps (legacy) | Not started |
| Visual Selector | `/edit/<uuid>#visualselector` | Watch edit → Advanced → Visual Selector (legacy) | Not started |
| XLSX import | `/imports/import#xlsx` | Import → XLSX (legacy) | Not started |
| Distill.io import | `/imports/import#distill-io` | Import → Distill.io (legacy) | Not started |
| MCP settings/tokens | `/settings/ai/mcp` | Settings → MCP (legacy) | Not started |
| Plugin settings | `/settings` plugin tabs | Settings → Plugins (legacy) | Not started |
| Apprise URL builder | watch/group/global notification forms | Notifications → "Open legacy builder" | Not started |
| Advanced image diff | watch edit + diff pages | Watch edit/detail → "Open legacy" | Not started |
| Share diff as image | diff page selection | Diff → "Open legacy" | Not started |
| MCP OAuth consent | `/oauth/authorize` | Unchanged legacy flow | Not started |
| PWA install page/QR | `/settings#general` | Settings → PWA (legacy) | Not started |

## Later waves

| Feature | Target | Status |
|---|---|---|
| Browser Steps in Pulse | Later wave | Not started |
| Visual Selector in Pulse | Later wave | Not started |
| XLSX/Distill import in Pulse | Later wave | Not started |
| MCP settings/tokens in Pulse | Later wave | Not started |
| Plugin settings in Pulse | Later wave | Not started |
| Apprise builder in Pulse | Later wave | Not started |
| Advanced image diff in Pulse | Later wave | Not started |
| Share-as-image in Pulse | Later wave | Not started |
| PWA install page in Pulse | Later wave | Not started |
| All 25 locales in Pulse | Later wave | Not started |

## Open questions / notes

- Exact Pulse branding/logo: use the existing changedetection.io wordmark initially.
- Legacy links must be visibly marked "Legacy" and open in the old UI without losing the user's place.
- The old UI remains fully usable; do not delete it until full parity and user approval.
