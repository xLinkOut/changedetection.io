"""Shared helpers for the `/api/v2` browser-first API."""

from __future__ import annotations

import os
from functools import lru_cache, wraps

import flask_login
from flask import current_app, jsonify, request
from flask_wtf.csrf import generate_csrf

from changedetectionio import __version__


class ApiV2Error(Exception):
    def __init__(self, message, status=400, fields=None, code=None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.fields = fields or {}
        self.code = code


def json_error(message, status=400, fields=None, code=None):
    body = {'error': message, 'fields': fields or {}}
    if code:
        body['code'] = code
    return jsonify(body), status


def password_enabled(datastore) -> bool:
    return bool(
        datastore.data['settings']['application'].get('password')
        or os.getenv('SALTED_PASS', False)
    )


def user_is_authenticated(datastore) -> bool:
    return (not password_enabled(datastore)) or bool(flask_login.current_user.is_authenticated)


def login_required_json(func):
    """JSON 401 instead of Flask-Login's HTML redirect."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        datastore = current_app.config['DATASTORE']
        if not user_is_authenticated(datastore):
            return json_error('Authentication required', 401, code='auth_required')
        return func(*args, **kwargs)

    return wrapper


def script_root() -> str:
    return (request.script_root or '').rstrip('/')


def api_base() -> str:
    return f'{script_root()}/api/v2'


def app_base() -> str:
    return f'{script_root()}/pulse'


def feature_flags(datastore) -> dict:
    from changedetectionio.llm.evaluator import get_llm_config, is_llm_features_disabled

    app_settings = datastore.data['settings']['application']
    ui_settings = app_settings.get('ui', {})
    return {
        'llm': bool(get_llm_config(datastore)),
        'llmFeaturesDisabled': is_llm_features_disabled(),
        'screenshots': True,
        'restock': datastore.any_watches_have_processor_by_name('restock_diff'),
        'shareWatch': bool(ui_settings.get('use_share_watch')),
        'favicons': bool(ui_settings.get('favicons_enabled', True)),
        'realtime': bool(ui_settings.get('socket_io_enabled', True)),
        'sharedDiffAccess': bool(app_settings.get('shared_diff_access')),
        'apiKeyEnabled': bool(app_settings.get('api_access_token_enabled', True)),
        'passwordLocked': bool(os.getenv('SALTED_PASS', False)),
        'legacyBrowserSteps': True,
        'legacyVisualSelector': True,
    }


def languages_payload() -> list[dict]:
    from changedetectionio.languages import get_available_languages

    available = get_available_languages()
    # Wave 1 ships English + Italian in Pulse. The legacy UI keeps all 25.
    codes = [code for code in ('en_GB', 'en_US', 'it') if code in available]
    if not codes:
        codes = ['en_GB']
    return [
        {'code': code, 'name': available.get(code, {}).get('name', code)}
        for code in codes
    ]


def current_locale() -> str:
    from flask_babel import get_locale

    return str(get_locale() or current_app.config.get('BABEL_DEFAULT_LOCALE', 'en_GB'))


def bootstrap_payload(datastore, update_q=None) -> dict:
    authenticated = user_is_authenticated(datastore)
    app_settings = datastore.data['settings']['application']
    ui_settings = app_settings.get('ui', {})

    payload = {
        'app': 'pulse',
        'version': __version__,
        'basePath': script_root(),
        'appBase': app_base(),
        'apiBase': api_base(),
        'authenticated': authenticated,
        'passwordEnabled': password_enabled(datastore),
        'csrfToken': generate_csrf(),
        'locale': current_locale(),
        'languages': languages_payload(),
        'serverTime': int(__import__('time').time()),
    }

    if authenticated:
        from changedetectionio.api.v2.serializers import stats_snapshot

        payload.update(
            {
                'features': feature_flags(datastore),
                'settings': {
                    'pagerSize': app_settings.get('pager_size', 50),
                    'timeagoFormat': ui_settings.get('timeago_format', 'long'),
                    'usePageTitleInList': bool(ui_settings.get('use_page_title_in_list', True)),
                    'faviconsEnabled': bool(ui_settings.get('favicons_enabled', True)),
                    'openDiffInNewTab': bool(ui_settings.get('open_diff_in_new_tab', True)),
                    'sidebarMode': ui_settings.get('sidebar_mode', 'expandable'),
                    'allPaused': bool(app_settings.get('all_paused')),
                    'allMuted': bool(app_settings.get('all_muted')),
                },
                'stats': stats_snapshot(datastore, update_q),
                'processors': processor_options(),
                'fetchers': fetcher_options(datastore),
            }
        )

    return payload


def processor_options() -> list[dict]:
    from changedetectionio import processors

    badges = processors.get_processor_badge_texts()
    descriptions = processors.get_processor_descriptions()
    return [
        {
            'value': name,
            'label': descriptions.get(name, name),
            'badge': badges.get(name, name),
        }
        for name, _description in processors.available_processors()
    ]


def fetcher_options(datastore) -> list[dict]:
    from changedetectionio import content_fetchers

    options = [{'value': 'system', 'label': 'System default'}]
    for value, label in content_fetchers.available_fetchers():
        options.append({'value': value, 'label': label})
    for value, label in datastore.extra_browsers:
        options.append({'value': value, 'label': label})
    return options


@lru_cache(maxsize=8)
def _read_po_catalog(path: str):
    from babel.messages.pofile import read_po

    messages = {}
    plurals = {}
    with open(path, 'rb') as handle:
        catalog = read_po(handle)
    for message in catalog:
        if not message.id:
            continue
        if message.pluralizable:
            id_singular = message.id[0]
            if isinstance(message.string, (list, tuple)):
                forms = [form for form in message.string if form]
            else:
                forms = [message.string] if message.string else []
            if forms:
                plurals[id_singular] = forms
            continue
        if message.string:
            messages[message.id] = message.string
    return messages, plurals


def i18n_payload(locale: str) -> dict:
    """Return a `.po` catalog as JSON. English is the source and needs no catalog."""
    from pathlib import Path

    from changedetectionio.languages import get_language_codes

    supported = get_language_codes()
    if locale not in supported:
        locale = 'en_GB'

    if locale.startswith('en'):
        return {'locale': locale, 'messages': {}, 'plurals': {}}

    base = Path(__file__).resolve().parents[2]
    path = base / 'translations' / locale / 'LC_MESSAGES' / 'messages.po'
    overlay = os.getenv('TRANSLATION_OVERLAY_DIR')
    messages, plurals = {}, {}

    if path.exists():
        messages, plurals = _read_po_catalog(str(path))

    if overlay:
        overlay_path = Path(overlay) / locale / 'LC_MESSAGES' / 'messages.po'
        if overlay_path.exists():
            overlay_messages, overlay_plurals = _read_po_catalog(str(overlay_path))
            messages = {**messages, **overlay_messages}
            plurals = {**plurals, **overlay_plurals}

    return {'locale': locale, 'messages': messages, 'plurals': plurals}
