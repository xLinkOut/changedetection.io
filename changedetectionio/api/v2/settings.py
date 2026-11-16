"""Read and update global settings for `/api/v2`.

Pulse edits the same datastore keys as the legacy settings page. Values are
validated against the same constraints (ranges, timezone names, Apprise URLs,
LLM schema) so the two UIs cannot drift apart.
"""

from __future__ import annotations

import base64
import hashlib
import os
import sys
import time

from changedetectionio.api.v2.helpers import ApiV2Error


def _expect_bool(value, field):
    if isinstance(value, bool):
        return value
    raise ApiV2Error(f'{field} must be true or false', fields={field: ['Must be true or false']})


def _expect_int(value, field, minimum=None, maximum=None, allow_none=False):
    if value is None and allow_none:
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        raise ApiV2Error(f'{field} must be a number', fields={field: ['Must be a number']})
    if minimum is not None and value < minimum:
        raise ApiV2Error(
            f'{field} must be at least {minimum}',
            fields={field: [f'Must be at least {minimum}']},
        )
    if maximum is not None and value > maximum:
        raise ApiV2Error(
            f'{field} must be at most {maximum}',
            fields={field: [f'Must be at most {maximum}']},
        )
    return value


def _expect_str(value, field, allow_none=False, max_length=20000):
    if value is None and allow_none:
        return None
    if not isinstance(value, str):
        raise ApiV2Error(f'{field} must be text', fields={field: ['Must be text']})
    if len(value) > max_length:
        raise ApiV2Error(f'{field} is too long', fields={field: [f'Must be at most {max_length} characters']})
    return value


def _expect_str_list(value, field):
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise ApiV2Error(f'{field} must be a list of text values', fields={field: ['Must be a list of text values']})
    return value


def _expect_dict(value, field):
    if not isinstance(value, dict):
        raise ApiV2Error(f'{field} must be an object', fields={field: ['Must be an object']})
    return value


def _validate_timezone(name, field):
    if not name:
        return name
    from zoneinfo import available_timezones

    if name not in available_timezones():
        raise ApiV2Error(
            f'{field} is not a valid IANA timezone',
            fields={field: ['Not a valid timezone name']},
        )
    return name


def _validate_time_between_check(value, field):
    value = _expect_dict(value, field)
    result = {}
    for part in ('weeks', 'days', 'hours', 'minutes', 'seconds'):
        part_value = value.get(part)
        if part_value in (None, ''):
            result[part] = None
        else:
            result[part] = _expect_int(part_value, f'{field}.{part}', minimum=0, maximum=10000)
    return result


def _validate_schedule(value, field):
    value = _expect_dict(value, field)
    from changedetectionio.api.Watch import validate_time_schedule_limit

    error = validate_time_schedule_limit(value)
    if error:
        raise ApiV2Error(error, fields={field: [error]})

    if value.get('timezone'):
        _validate_timezone(value['timezone'], f'{field}.timezone')
    return value


def _settings_application(datastore):
    return datastore.data['settings']['application']


def _settings_requests(datastore):
    return datastore.data['settings']['requests']


def _masked_llm(llm: dict) -> dict:
    from changedetectionio.model.LLMSettings import LLMSettings

    settings = LLMSettings.model_validate(llm or {}).model_dump()
    settings['api_key_set'] = bool(settings.get('api_key'))
    settings['api_key'] = ''
    return settings


def settings_payload(datastore) -> dict:
    from zoneinfo import available_timezones

    from changedetectionio.blueprint.menu_modes import MENU_SIDEBAR_ACTIONMODES
    from changedetectionio.blueprint.rss import RSS_FORMAT_TYPES, RSS_TEMPLATE_TYPE_OPTIONS
    from changedetectionio.llm.evaluator import get_llm_settings
    from changedetectionio.notification import valid_notification_formats
    from changedetectionio.pluggy_interface import get_active_plugins

    app_settings = _settings_application(datastore)
    requests_settings = _settings_requests(datastore)
    ui_settings = app_settings.get('ui', {})

    llm = _masked_llm(get_llm_settings(datastore).model_dump())

    return {
        'general': {
            'time_between_check': requests_settings.get('time_between_check') or {},
            'time_schedule_limit': requests_settings.get('time_schedule_limit') or {},
            'history_snapshot_max_length': app_settings.get('history_snapshot_max_length'),
            'filter_failure_notification_threshold_attempts': app_settings.get(
                'filter_failure_notification_threshold_attempts', 6
            ),
            'password_set': bool(app_settings.get('password')),
            'password_locked': bool(os.getenv('SALTED_PASS', False)),
            'shared_diff_access': bool(app_settings.get('shared_diff_access')),
            'empty_pages_are_a_change': bool(app_settings.get('empty_pages_are_a_change')),
            'default_proxy': requests_settings.get('proxy'),
            'scheduler_timezone_default': app_settings.get('scheduler_timezone_default'),
            'all_paused': bool(app_settings.get('all_paused')),
            'all_muted': bool(app_settings.get('all_muted')),
        },
        'fetching': {
            'fetch_backend': app_settings.get('fetch_backend'),
            'webdriver_delay': app_settings.get('webdriver_delay'),
            'workers': requests_settings.get('workers', 5),
            'jitter_seconds': requests_settings.get('jitter_seconds', 0),
            'timeout': requests_settings.get('timeout', 45),
            'default_ua': requests_settings.get('default_ua') or {},
            'min_recheck_seconds': int(os.getenv('MINIMUM_SECONDS_RECHECK_TIME', 3)),
        },
        'filters': {
            'ignore_whitespace': bool(app_settings.get('ignore_whitespace')),
            'render_anchor_tag_content': bool(app_settings.get('render_anchor_tag_content')),
            'global_subtractive_selectors': list(app_settings.get('global_subtractive_selectors') or []),
            'global_ignore_text': list(app_settings.get('global_ignore_text') or []),
            'strip_ignored_lines': bool(app_settings.get('strip_ignored_lines')),
        },
        'ui': {
            'open_diff_in_new_tab': bool(ui_settings.get('open_diff_in_new_tab', True)),
            'realtime_updates': bool(ui_settings.get('socket_io_enabled', True)),
            'favicons_enabled': bool(ui_settings.get('favicons_enabled', True)),
            'use_page_title_in_list': bool(ui_settings.get('use_page_title_in_list', True)),
            'use_share_watch': bool(ui_settings.get('use_share_watch')),
            'pager_size': app_settings.get('pager_size', 50),
            'timeago_format': ui_settings.get('timeago_format', 'long'),
            'sidebar_mode': ui_settings.get('sidebar_mode', 'expandable'),
            'sidebar_modes': [{'value': value, 'label': label} for value, label in MENU_SIDEBAR_ACTIONMODES],
        },
        'api': {
            'api_access_token_enabled': bool(app_settings.get('api_access_token_enabled', True)),
            'api_key': app_settings.get('api_access_token'),
        },
        'notifications': {
            'notification_urls': list(app_settings.get('notification_urls') or []),
            'notification_title': app_settings.get('notification_title'),
            'notification_body': app_settings.get('notification_body'),
            'notification_format': app_settings.get('notification_format'),
            'base_url': app_settings.get('base_url'),
            'formats': [{'value': value, 'label': label} for value, label in valid_notification_formats.items()],
        },
        'llm': llm,
        'rss': {
            'rss_hide_muted_watches': bool(app_settings.get('rss_hide_muted_watches', True)),
            'rss_diff_length': app_settings.get('rss_diff_length', 5),
            'rss_reader_mode': bool(app_settings.get('rss_reader_mode')),
            'rss_content_format': app_settings.get('rss_content_format'),
            'rss_template_type': app_settings.get('rss_template_type'),
            'rss_template_override': app_settings.get('rss_template_override'),
            'rss_access_token': app_settings.get('rss_access_token'),
            'content_formats': [{'value': value, 'label': label} for value, label in RSS_FORMAT_TYPES.items()],
            'template_types': [{'value': value, 'label': label} for value, label in RSS_TEMPLATE_TYPE_OPTIONS.items()],
        },
        'proxies': {
            'extra_proxies': list(requests_settings.get('extra_proxies') or []),
            'extra_browsers': list(requests_settings.get('extra_browsers') or []),
            'proxy_list': list(datastore.proxy_list.keys()) if datastore.proxy_list else [],
        },
        'info': {
            'version': __import__('changedetectionio', fromlist=['__version__']).__version__,
            'uptime_seconds': int(time.time() - datastore.start_time),
            'python_version': f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}',
            'watch_limit': datastore.watch_limit,
            'watch_count': len(datastore.data['watching']),
            'active_plugins': [
                plugin.get('name', str(plugin)) if isinstance(plugin, dict) else str(plugin)
                for plugin in get_active_plugins()
            ],
            'server_time': int(time.time()),
            'available_timezones': sorted(available_timezones()),
        },
    }


def apply_settings_update(datastore, payload, on_workers_changed=None) -> dict:  # noqa: C901
    """Validate and persist a partial settings update. Raises ApiV2Error."""
    if not isinstance(payload, dict):
        raise ApiV2Error('Body must be a JSON object')

    app_settings = _settings_application(datastore)
    requests_settings = _settings_requests(datastore)
    changed_sections = []

    general = payload.get('general')
    if general is not None:
        general = _expect_dict(general, 'general')
        if 'time_between_check' in general:
            requests_settings['time_between_check'] = _validate_time_between_check(
                general['time_between_check'], 'general.time_between_check'
            )
        if 'time_schedule_limit' in general:
            requests_settings['time_schedule_limit'] = _validate_schedule(
                general['time_schedule_limit'], 'general.time_schedule_limit'
            )
        if 'history_snapshot_max_length' in general:
            app_settings['history_snapshot_max_length'] = _expect_int(
                general['history_snapshot_max_length'],
                'general.history_snapshot_max_length',
                minimum=2,
                allow_none=True,
            )
        if 'filter_failure_notification_threshold_attempts' in general:
            app_settings['filter_failure_notification_threshold_attempts'] = _expect_int(
                general['filter_failure_notification_threshold_attempts'],
                'general.filter_failure_notification_threshold_attempts',
                minimum=0,
                maximum=999,
            )
        for key in ('shared_diff_access', 'empty_pages_are_a_change', 'all_paused', 'all_muted'):
            if key in general:
                app_settings[key] = _expect_bool(general[key], f'general.{key}')
        if 'default_proxy' in general:
            proxy = general['default_proxy']
            available = list(datastore.proxy_list.keys()) if datastore.proxy_list else []
            if proxy not in (None, '') and proxy not in available:
                raise ApiV2Error(
                    'general.default_proxy is not a configured proxy',
                    fields={'general.default_proxy': ['Not a configured proxy']},
                )
            requests_settings['proxy'] = proxy or None
        if 'scheduler_timezone_default' in general:
            app_settings['scheduler_timezone_default'] = _validate_timezone(
                general['scheduler_timezone_default'] or None,
                'general.scheduler_timezone_default',
            )
        changed_sections.append('general')

    fetching = payload.get('fetching')
    if fetching is not None:
        fetching = _expect_dict(fetching, 'fetching')
        if 'fetch_backend' in fetching:
            from changedetectionio import content_fetchers

            valid = {name for name, _label in content_fetchers.available_fetchers()}
            if fetching['fetch_backend'] not in valid:
                raise ApiV2Error(
                    'fetching.fetch_backend is not an available fetcher',
                    fields={'fetching.fetch_backend': ['Not an available fetcher']},
                )
            app_settings['fetch_backend'] = fetching['fetch_backend']
        if 'webdriver_delay' in fetching:
            app_settings['webdriver_delay'] = _expect_int(
                fetching['webdriver_delay'], 'fetching.webdriver_delay', minimum=1, allow_none=True
            )
        if 'workers' in fetching:
            old_workers = requests_settings.get('workers', 5)
            requests_settings['workers'] = _expect_int(
                fetching['workers'], 'fetching.workers', minimum=1, maximum=50
            )
            if on_workers_changed and requests_settings['workers'] != old_workers:
                on_workers_changed(old_workers, requests_settings['workers'])
        if 'jitter_seconds' in fetching:
            requests_settings['jitter_seconds'] = _expect_int(
                fetching['jitter_seconds'], 'fetching.jitter_seconds', minimum=0, maximum=9999
            )
        if 'timeout' in fetching:
            requests_settings['timeout'] = _expect_int(
                fetching['timeout'], 'fetching.timeout', minimum=1, maximum=999
            )
        if 'default_ua' in fetching:
            ua = _expect_dict(fetching['default_ua'], 'fetching.default_ua')
            requests_settings['default_ua'] = {
                str(key): _expect_str(value, f'fetching.default_ua.{key}', allow_none=True, max_length=1000)
                for key, value in ua.items()
            }
        changed_sections.append('fetching')

    filters = payload.get('filters')
    if filters is not None:
        filters = _expect_dict(filters, 'filters')
        for key in ('ignore_whitespace', 'render_anchor_tag_content', 'strip_ignored_lines'):
            if key in filters:
                app_settings[key] = _expect_bool(filters[key], f'filters.{key}')
        for key in ('global_subtractive_selectors', 'global_ignore_text'):
            if key in filters:
                app_settings[key] = _expect_str_list(filters[key], f'filters.{key}')
        changed_sections.append('filters')

    ui = payload.get('ui')
    if ui is not None:
        ui = _expect_dict(ui, 'ui')
        current_ui = dict(app_settings.get('ui') or {})
        mapping = {
            'open_diff_in_new_tab': 'open_diff_in_new_tab',
            'realtime_updates': 'socket_io_enabled',
            'favicons_enabled': 'favicons_enabled',
            'use_page_title_in_list': 'use_page_title_in_list',
            'use_share_watch': 'use_share_watch',
        }
        for incoming, stored in mapping.items():
            if incoming in ui:
                current_ui[stored] = _expect_bool(ui[incoming], f'ui.{incoming}')
        if 'pager_size' in ui:
            app_settings['pager_size'] = _expect_int(ui['pager_size'], 'ui.pager_size', minimum=0, maximum=10000)
        if 'timeago_format' in ui:
            if ui['timeago_format'] not in ('long', 'short'):
                raise ApiV2Error('ui.timeago_format must be long or short', fields={'ui.timeago_format': ['Must be long or short']})
            current_ui['timeago_format'] = ui['timeago_format']
        if 'sidebar_mode' in ui:
            from changedetectionio.blueprint.menu_modes import MENU_SIDEBAR_ACTIONMODES

            valid = {value for value, _label in MENU_SIDEBAR_ACTIONMODES}
            if ui['sidebar_mode'] not in valid:
                raise ApiV2Error('ui.sidebar_mode is not valid', fields={'ui.sidebar_mode': ['Not a valid mode']})
            current_ui['sidebar_mode'] = ui['sidebar_mode']
        app_settings['ui'] = current_ui
        changed_sections.append('ui')

    api = payload.get('api')
    if api is not None:
        api = _expect_dict(api, 'api')
        if 'api_access_token_enabled' in api:
            app_settings['api_access_token_enabled'] = _expect_bool(
                api['api_access_token_enabled'], 'api.api_access_token_enabled'
            )
        changed_sections.append('api')

    notifications = payload.get('notifications')
    if notifications is not None:
        notifications = _expect_dict(notifications, 'notifications')
        if 'notification_urls' in notifications:
            from changedetectionio.api.operations import ApiError, validate_notification_urls

            urls = _expect_str_list(notifications['notification_urls'], 'notifications.notification_urls')
            try:
                validate_notification_urls(urls)
            except ApiError as error:
                raise ApiV2Error(
                    error.message,
                    error.status,
                    fields={'notifications.notification_urls': [error.message]},
                ) from error
            app_settings['notification_urls'] = urls
        for key in ('notification_title', 'notification_body', 'base_url'):
            if key in notifications:
                app_settings[key] = _expect_str(
                    notifications[key], f'notifications.{key}', allow_none=True
                )
        if 'notification_format' in notifications:
            from changedetectionio.notification import valid_notification_formats

            if notifications['notification_format'] not in valid_notification_formats:
                raise ApiV2Error(
                    'notifications.notification_format is not valid',
                    fields={'notifications.notification_format': ['Not a valid format']},
                )
            app_settings['notification_format'] = notifications['notification_format']
        changed_sections.append('notifications')

    llm = payload.get('llm')
    if llm is not None:
        from changedetectionio.model.LLMSettings import LLMSettings

        llm = _expect_dict(llm, 'llm').copy()
        for protected in LLMSettings.PROTECTED_FIELDS:
            llm.pop(protected, None)
        for read_only in ('api_key_set',):
            llm.pop(read_only, None)
        current = dict(app_settings.get('llm') or {})
        clear_key = bool(llm.pop('api_key_clear', False))
        if clear_key:
            llm['api_key'] = ''
        elif not llm.get('api_key'):
            # An empty api_key from the masked GET means "leave the stored key alone".
            llm.pop('api_key', None)
        try:
            merged = LLMSettings.model_validate({**current, **llm})
        except Exception as exc:
            raise ApiV2Error(f'llm: {exc}', fields={'llm': [str(exc)]}) from exc
        app_settings['llm'] = merged.model_dump()
        changed_sections.append('llm')

    rss = payload.get('rss')
    if rss is not None:
        from changedetectionio.blueprint.rss import RSS_FORMAT_TYPES, RSS_TEMPLATE_TYPE_OPTIONS

        rss = _expect_dict(rss, 'rss')
        for key in ('rss_hide_muted_watches', 'rss_reader_mode'):
            if key in rss:
                app_settings[key] = _expect_bool(rss[key], f'rss.{key}')
        if 'rss_diff_length' in rss:
            app_settings['rss_diff_length'] = _expect_int(
                rss['rss_diff_length'], 'rss.rss_diff_length', minimum=0, maximum=999
            )
        if 'rss_content_format' in rss:
            if rss['rss_content_format'] not in RSS_FORMAT_TYPES:
                raise ApiV2Error('rss.rss_content_format is not valid', fields={'rss.rss_content_format': ['Not valid']})
            app_settings['rss_content_format'] = rss['rss_content_format']
        if 'rss_template_type' in rss:
            if rss['rss_template_type'] not in RSS_TEMPLATE_TYPE_OPTIONS:
                raise ApiV2Error('rss.rss_template_type is not valid', fields={'rss.rss_template_type': ['Not valid']})
            app_settings['rss_template_type'] = rss['rss_template_type']
        if 'rss_template_override' in rss:
            app_settings['rss_template_override'] = _expect_str(
                rss['rss_template_override'], 'rss.rss_template_override', allow_none=True, max_length=100000
            )
        changed_sections.append('rss')

    proxies = payload.get('proxies')
    if proxies is not None:
        proxies = _expect_dict(proxies, 'proxies')
        for key, required_prefix in (
            ('extra_proxies', ('http://', 'https://', 'socks5://')),
            ('extra_browsers', ('ws://', 'wss://')),
        ):
            if key not in proxies:
                continue
            rows = proxies[key]
            if not isinstance(rows, list):
                raise ApiV2Error(f'proxies.{key} must be a list', fields={f'proxies.{key}': ['Must be a list']})
            cleaned = []
            for index, row in enumerate(rows):
                row = _expect_dict(row, f'proxies.{key}[{index}]')
                name = (row.get('proxy_name') or row.get('browser_name') or '').strip()
                url = (row.get('proxy_url') or row.get('browser_connection_url') or '').strip()
                if not name and not url:
                    continue
                if not name or not url:
                    raise ApiV2Error(
                        f'proxies.{key}[{index}] needs both a name and a URL',
                        fields={f'proxies.{key}': ['Both a name and a URL are required']},
                    )
                if not url.lower().startswith(required_prefix):
                    raise ApiV2Error(
                        f'proxies.{key}[{index}] has an unsupported URL',
                        fields={f'proxies.{key}': [f'URL must start with {", ".join(required_prefix)}']},
                    )
                if key == 'extra_proxies':
                    cleaned.append({'proxy_name': name, 'proxy_url': url})
                else:
                    cleaned.append({'browser_name': name, 'browser_connection_url': url})
            requests_settings[key] = cleaned
        changed_sections.append('proxies')

    datastore.commit()

    # Global settings affect inherited watch configuration, so force a reprocess.
    if changed_sections:
        datastore.clear_all_last_checksums()

    return {'updated': changed_sections}


def set_password(datastore, password: str):
    if not isinstance(password, str) or not password:
        raise ApiV2Error('password is required', fields={'password': ['Password is required']})
    if len(password) > 1000:
        raise ApiV2Error('password is too long', fields={'password': ['Password is too long']})
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    datastore.data['settings']['application']['password'] = base64.b64encode(salt + key).decode()
    datastore.commit()


def clear_password(datastore):
    if os.getenv('SALTED_PASS', False):
        raise ApiV2Error(
            'The password is locked by the SALTED_PASS environment variable',
            status=409,
            code='password_locked',
        )
    datastore.remove_password()
