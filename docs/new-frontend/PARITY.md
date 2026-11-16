# Pulse — feature parity checklist

Status legend:
- **Pulse** — implemented/rebuilt in the new UI.
- **Legacy link** — remains in the old UI for Wave 1; Pulse links to it.
- **Partial** — the main path works, but a secondary option or polish item is still missing.
- **Later** — planned for a later wave.
- **N/A** — not a user-facing feature.

Update this file as work progresses. A feature is not "done" until it works at 360px, 768px and 1280px, in light and dark mode, with keyboard access.

## Wave 1 — essential tools

| Old feature | Old location | New location | Wave 1 status |
|---|---|---|---|
| Password login | `/login` | `/pulse/login` | Pulse |
| Logout | top menu | Pulse user menu | Pulse |
| Language selector | header modal | Pulse settings/user menu (English + Italian) | Pulse (partial IT) |
| Light/dark/system theme | header toggle | Pulse top bar/settings | Pulse |
| Global search | search modal | Pulse dashboard search | Pulse |
| Global pause/resume | top menu | Pulse global status menu | Pulse |
| Global mute/unmute | top menu | Pulse global status menu | Pulse |
| Unread badge | sidebar | Pulse sidebar/tab badge | Pulse |
| Queue/checking counts | sidebar | Pulse sidebar/status | Pulse |
| Watch list/cards | `/` | `/pulse` | Pulse |
| Watch status/error/unread | dashboard rows | Pulse watch cards/rows | Pulse |
| Last checked/changed | dashboard rows | Pulse watch cards/rows | Pulse |
| Favicon | dashboard rows | Pulse watch cards/rows | Pulse |
| Tags on watch | dashboard rows | Pulse watch cards/rows | Pulse |
| Processor badge | dashboard rows | Pulse watch cards/rows | Pulse |
| Restock/price display | dashboard rows | Pulse watch cards/rows | Pulse |
| Quick add URL + Watch | dashboard form | Pulse dashboard quick add | Pulse |
| Advanced quick add (processor/tags/LLM intent) | dashboard form | Pulse add sheet | Partial |
| Tag/group filter | dashboard | Pulse filters | Pulse |
| Status filters (All/Unread/Deals/Errors/Healthy) | dashboard | Pulse filters | Pulse |
| Processor filter | dashboard | Pulse filters | Pulse |
| Sort | dashboard | Pulse filters | Pulse |
| Pagination/virtualization | dashboard | Pulse virtualized list | Partial |
| Bulk pause/unpause/mute/unmute/recheck | dashboard toolbar | Pulse selection bar | Pulse |
| Bulk mark viewed/unviewed | dashboard toolbar | Pulse selection bar | Pulse |
| Bulk clear errors | dashboard toolbar | Pulse selection bar | Pulse |
| Bulk delete (confirm) | dashboard toolbar | Pulse selection bar | Pulse |
| Select all matching | dashboard | Pulse selection bar | Pulse |
| Mark all viewed (filtered) | dashboard | Pulse dashboard action | Pulse |
| Recheck all (filtered) | dashboard | Pulse dashboard action | Pulse |
| Row recheck/edit/history/preview | dashboard rows | Pulse watch card/row actions | Pulse |
| Live row updates | Socket.IO | Pulse SSE | Pulse |
| Watch history/version list | `/diff/<uuid>` | `/pulse/watches/:uuid/changes` | Pulse |
| Diff by lines/words | `/diff/<uuid>` | Pulse diff viewer | Pulse |
| Diff by character | (not in old UI, requested) | Pulse diff viewer | Pulse |
| Diff filters | `/diff/<uuid>` | Pulse diff toolbar | Pulse |
| Diff previous/next | `/diff/<uuid>` | Pulse diff keyboard/buttons | Pulse |
| Diff minimap | `/diff/<uuid>` | Pulse diff minimap | Not started |
| AI change summary | `/diff/<uuid>` | Pulse diff summary | Pulse |
| Text preview highlights | `/preview/<uuid>` | Pulse preview tab | Pulse |
| Screenshot/error screenshot | `/diff`, `/preview` | Pulse screenshot/error tabs | Pulse |
| Error text | `/diff` | Pulse error tab | Pulse |
| Download diff patch | `/diff` | Pulse diff action | Pulse |
| Price/restock graph | `/diff`, dashboard | Pulse price tab | Pulse |
| Watch edit General | `/edit/<uuid>` | `/pulse/watches/:uuid/edit/general` | Pulse |
| Watch edit Request | `/edit/<uuid>` | Pulse edit Request tab | Pulse |
| Watch edit Filters & Triggers | `/edit/<uuid>` | Pulse edit Filters tab | Pulse |
| Watch edit Conditions | `/edit/<uuid>` | Pulse edit Conditions tab | Pulse |
| Watch edit Notifications | `/edit/<uuid>` | Pulse edit Notifications tab | Pulse |
| Watch edit AI/LLM | `/edit/<uuid>` | Pulse edit AI tab | Pulse |
| Watch edit Schedule | `/edit/<uuid>` | Pulse edit General/Schedule | Pulse |
| Watch edit Restock | `/edit/<uuid>` | Pulse edit Restock tab | Pulse |
| Watch edit Stats | `/edit/<uuid>` | Pulse edit Stats | Pulse |
| Watch delete/clear history | `/edit/<uuid>` | Pulse edit danger actions | Pulse |
| Groups list/create/edit/delete/mute/recheck | `/tags/*` | `/pulse/groups` | Pulse |
| Group colour/URL pattern/AI/filters/notifications/restock | `/tags/edit/<uuid>` | Pulse group edit | Pulse |
| Global settings core | `/settings` | `/pulse/settings/*` | Pulse |
| Global notifications basic | `/settings/notifications` | `/pulse/settings/notifications` | Pulse |
| AI/LLM provider settings | `/settings/ai/llm` | `/pulse/settings/ai` | Pulse |
| API key display/reset | `/settings#api` | `/pulse/settings/api` | Pulse |
| RSS settings | `/settings#rss` | `/pulse/settings/rss` | Pulse |
| Time/timezone | `/settings#timedate` | `/pulse/settings/general` | Pulse |
| Proxies/extra browsers | `/settings#proxies` | `/pulse/settings/proxies` | Pulse |
| Backups create/list/download/remove/restore | `/backups/*` | `/pulse/settings/backups` | Pulse |
| Import URL list | `/imports/import` | `/pulse/import` | Pulse |
| Queue snapshot/cancel/clear | `/queue` | `/pulse/queue` | Pulse |
| Queue live updates | Socket.IO + 8s polling | Pulse SSE | Pulse |
| Notification sent event | Socket.IO stub | Pulse toast/log | Pulse |
| Connection indicator | old offline notice | Pulse indicator | Pulse |
| Mobile navigation | hamburger drawer | Pulse bottom tabs | Pulse |
| Keyboard accessibility | partial | Pulse full audit | Partial |
| Italian translations | old UI only | Pulse English + Italian | Partial |

## Wave 1 — legacy links

| Feature | Legacy location | Pulse link | Status |
|---|---|---|---|
| Browser Steps | `/edit/<uuid>#browser-steps` | Watch edit → Advanced → Browser Steps (legacy) | Legacy link |
| Visual Selector | `/edit/<uuid>#visualselector` | Watch edit → Advanced → Visual Selector (legacy) | Legacy link |
| XLSX import | `/imports/import#xlsx` | Import → XLSX (legacy) | Legacy link |
| Distill.io import | `/imports/import#distill-io` | Import → Distill.io (legacy) | Legacy link |
| MCP settings/tokens | `/settings/ai/mcp` | Settings → MCP (legacy) | Legacy link |
| Plugin settings | `/settings` plugin tabs | Settings → Plugins (legacy) | Legacy link |
| Apprise URL builder | watch/group/global notification forms | Notifications → "Open legacy builder" | Legacy link |
| Advanced image diff | watch edit + diff pages | Watch edit/detail → "Open legacy" | Legacy link |
| Share diff as image | diff page selection | Diff → "Open legacy" | Legacy link |
| MCP OAuth consent | `/oauth/authorize` | Unchanged legacy flow | Legacy link |
| PWA install page/QR | `/settings#general` | Settings → PWA (legacy) | Legacy link |

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
