"""Native serializers for the browser-first `/api/v2` API.

The v1 API deliberately keeps its old, lean response shapes. Pulse needs
dashboard-shaped rows (tags with colours, queue/worker state, restock data,
unread state) in one response, so those shapes live here and are never exposed
through `/api/v1`.
"""

from __future__ import annotations

import hashlib

from changedetectionio.blueprint.tags.colour import safe_css_colour


def json_safe(value):
    """Recursively convert a datastore value into something Flask can JSON-encode.

    Watch/tag objects subclass ``dict`` and can hold processor-specific objects
    (for example ``Restock``). Everything non-primitive is stringified rather
    than leaking an object repr or crashing the response.
    """
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [json_safe(v) for v in value]
    return str(value)


def _auto_colour(title: str) -> str:
    """Stable, readable fallback colour for groups without a custom colour."""
    palette = (
        '#5347CE', '#887CFD', '#4896FE', '#16C8C7', '#6E5CF0',
        '#3E82F0', '#2BB8C4', '#7A6BF5', '#5B8DEF', '#20B8B0',
    )
    digest = hashlib.sha256((title or '').encode('utf-8')).digest()
    return palette[digest[0] % len(palette)]


def group_colour(tag) -> str:
    custom = safe_css_colour(tag.get('tag_colour') if isinstance(tag, dict) else '')
    return custom or _auto_colour(tag.get('title', '') if isinstance(tag, dict) else '')


def tag_brief(tag) -> dict:
    return {
        'uuid': tag.get('uuid'),
        'title': tag.get('title') or '',
        'colour': group_colour(tag),
    }


def tags_for_watch(datastore, watch_uuid: str) -> list[dict]:
    tags = datastore.get_all_tags_for_watch(uuid=watch_uuid)
    return [tag_brief(tag) for tag in tags.values()]


def _restock_payload(watch) -> dict | None:
    if not watch.has_restock_info:
        return None

    restock = watch.get('restock') or {}
    try:
        change_percent = restock.get_price_change_percent()
    except AttributeError:
        # Older/plugin writes can leave a plain dict behind.
        from changedetectionio.processors.restock_diff import Restock

        restock = Restock(restock)
        change_percent = restock.get_price_change_percent()

    return {
        'in_stock': restock.get('in_stock'),
        'price': json_safe(restock.get('price')),
        'last_price': json_safe(restock.get('last_price')),
        'currency': restock.get('currency') or '',
        'price_change_percent': change_percent,
    }


def serialize_watch_row(
    datastore,
    watch,
    *,
    queued_uuids=None,
    running_uuids=None,
    processor_badges=None,
) -> dict:
    """One dashboard row. Keep this cheap: no snapshot reads, no disk scans."""
    queued_uuids = queued_uuids or frozenset()
    running_uuids = running_uuids or frozenset()
    uuid = watch.get('uuid')
    processor = watch.get('processor') or 'text_json_diff'
    processor_badges = processor_badges or {}

    return {
        'uuid': uuid,
        'url': watch.get('url') or '',
        'title': watch.get('title') or watch.get('page_title') or watch.get('url') or '',
        'page_title': watch.get('page_title') or '',
        'link': watch.get('url') or '',
        'tags': tags_for_watch(datastore, uuid),
        'paused': bool(watch.get('paused')),
        'notification_muted': bool(watch.get('notification_muted')),
        'last_checked': int(watch.get('last_checked') or 0),
        'last_changed': int(watch.last_changed or 0),
        'last_error': bool(watch.get('last_error')),
        'error_text': watch.get('last_error') or '',
        'last_notification_error': watch.get('last_notification_error') or '',
        'history_n': watch.history_n,
        'viewed': bool(watch.viewed),
        'has_unviewed': bool(watch.has_unviewed),
        'fetch_time': watch.get('fetch_time'),
        'checking_now': uuid in running_uuids,
        'queued': uuid in queued_uuids,
        'check_status': watch.get('__check_status') or '',
        'processor': processor,
        'processor_badge': processor_badges.get(processor, processor),
        'has_restock_info': bool(watch.has_restock_info),
        'restock': _restock_payload(watch),
        'has_favicon': bool(watch.get_favicon_filename()),
        'has_browser_steps': bool(watch.has_browser_steps),
        'is_pdf': bool(watch.is_pdf),
        'date_created': int(watch.get('date_created') or 0),
    }


def serialize_live_watch(datastore, watch, *, queued_uuids=None, running_uuids=None) -> dict:
    """A smaller payload for SSE patches (no tag fan-out, no disk stat for screenshots)."""
    queued_uuids = queued_uuids or frozenset()
    running_uuids = running_uuids or frozenset()
    uuid = watch.get('uuid')

    return {
        'uuid': uuid,
        'url': watch.get('url') or '',
        'title': watch.get('title') or watch.get('page_title') or watch.get('url') or '',
        'paused': bool(watch.get('paused')),
        'notification_muted': bool(watch.get('notification_muted')),
        'last_checked': int(watch.get('last_checked') or 0),
        'last_changed': int(watch.last_changed or 0),
        'last_error': bool(watch.get('last_error')),
        'error_text': watch.get('last_error') or '',
        'history_n': watch.history_n,
        'viewed': bool(watch.viewed),
        'has_unviewed': bool(watch.has_unviewed),
        'fetch_time': watch.get('fetch_time'),
        'checking_now': uuid in running_uuids,
        'queued': uuid in queued_uuids,
        'check_status': watch.get('__check_status') or '',
        'processor': watch.get('processor') or 'text_json_diff',
        'has_restock_info': bool(watch.has_restock_info),
        'restock': _restock_payload(watch),
        'has_favicon': bool(watch.get_favicon_filename()),
    }


def serialize_watch_full(datastore, watch) -> dict:
    """The watch edit/detail payload: stored fields plus resolved read-only extras."""
    from changedetectionio.api import get_processor_api_fields

    data = {
        key: value
        for key, value in json_safe(dict(watch)).items()
        if not key.startswith('_')
    }
    data.pop('default', None)

    uuid = watch.get('uuid')
    data['uuid'] = uuid
    data['title'] = watch.label
    data['page_title'] = watch.get('page_title') or ''
    data['link'] = watch.open_link
    data['tags'] = tags_for_watch(datastore, uuid)
    data['tag_uuids'] = list(datastore.get_all_tags_for_watch(uuid=uuid).keys())
    data['history_n'] = watch.history_n
    data['last_changed'] = int(watch.last_changed or 0)
    data['viewed'] = bool(watch.viewed)
    data['has_unviewed'] = bool(watch.has_unviewed)
    data['has_restock_info'] = bool(watch.has_restock_info)
    data['restock'] = _restock_payload(watch)
    data['has_favicon'] = bool(watch.get_favicon_filename())
    data['has_screenshot'] = bool(watch.get_screenshot())
    data['has_browser_steps'] = bool(watch.has_browser_steps)
    data['is_pdf'] = bool(watch.is_pdf)
    data['fetch_backend_resolved'] = watch.get_fetch_backend
    data['fetcher_supports_screenshots'] = bool(watch.fetcher_supports_screenshots)

    # Resolved processor config (group override wins) and processor state.
    data.update(json_safe(get_processor_api_fields(watch, datastore, context='get')))

    # AI inheritance information for the edit screen. These are read-only hints;
    # the writable fields are already part of the watch dict above.
    try:
        from changedetectionio.llm.evaluator import (
            get_effective_summary_prompt,
            llm_enabled_for_watch,
            tag_llm_decision,
        )

        enabled, source = llm_enabled_for_watch(watch, datastore)
        data['llm_effective'] = {
            'enabled': enabled,
            'source': source,
            'summary_prompt': get_effective_summary_prompt(watch, datastore),
            'groups': [
                {
                    'uuid': tag.get('uuid'),
                    'title': tag.get('title'),
                    'decision': tag_llm_decision(tag),
                    'llm_intent': tag.get('llm_intent') or '',
                    'llm_change_summary': tag.get('llm_change_summary') or '',
                }
                for tag in datastore.get_all_tags_for_watch(uuid=uuid).values()
                if tag.get('llm_backend_profile') is not None
                or tag.get('llm_intent')
                or tag.get('llm_change_summary')
            ],
        }
    except Exception:
        data['llm_effective'] = None

    return data


def serialize_group(datastore, tag, *, watch_count=None, processor_badges=None) -> dict:
    from changedetectionio.api import get_processor_api_fields

    data = json_safe(dict(tag))
    uuid = tag.get('uuid')
    data['uuid'] = uuid
    data['colour'] = group_colour(tag)
    data['tag_colour'] = safe_css_colour(tag.get('tag_colour') or '')
    data['url_match_pattern'] = tag.get('url_match_pattern') or ''
    data['notification_muted'] = bool(tag.get('notification_muted'))
    data['overrides_watch'] = bool(tag.get('overrides_watch'))
    if watch_count is None:
        watch_count = sum(
            1
            for watch in datastore.data['watching'].values()
            if uuid in datastore.get_all_tags_for_watch(watch['uuid'])
        )
    data['watch_count'] = watch_count
    data.update(json_safe(get_processor_api_fields(tag, datastore, context='get')))
    if processor_badges:
        data['processor_badge'] = processor_badges.get(data.get('processor'), data.get('processor'))
    return data


def stats_snapshot(datastore, update_q=None) -> dict:
    from changedetectionio import worker_pool

    error_count = sum(
        1 for watch in datastore.data['watching'].values() if watch.get('last_error')
    )
    return {
        'watch_count': len(datastore.data['watching']),
        'unread_changes_count': datastore.unread_changes_count,
        'error_count': error_count,
        'queue_size': update_q.qsize() if update_q is not None else 0,
        'checking_now': len(worker_pool.get_running_uuids()),
    }


def facets_snapshot(datastore, watches) -> dict:
    """Status/processor facet counts for a filtered dashboard view."""
    from changedetectionio.blueprint.watchlist.filters import watch_is_deal

    counts = {
        'all': 0,
        'unread': 0,
        'deals': 0,
        'errors': 0,
        'healthy': 0,
    }
    processors = {}
    for watch in watches:
        processor = watch.get('processor') or 'text_json_diff'
        processors[processor] = processors.get(processor, 0) + 1

        counts['all'] += 1
        if not (watch.viewed or watch.last_changed == 0):
            counts['unread'] += 1
        if watch_is_deal(watch):
            counts['deals'] += 1
        if watch.get('last_error'):
            counts['errors'] += 1
        else:
            counts['healthy'] += 1

    return {'status': counts, 'processors': processors}
