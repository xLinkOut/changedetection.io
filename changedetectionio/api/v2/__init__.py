"""Browser-first JSON API for the Pulse frontend.

Authentication is the normal Flask session plus CSRF (`X-CSRFToken`), never the
v1 API key. The v1 API and the legacy UI are untouched; these handlers reuse the
same datastore/service functions where it makes sense.
"""

from __future__ import annotations

import difflib
import glob
import io
import os
import re
import threading
import time
import zipfile
from datetime import UTC, datetime
from pathlib import Path

import flask_login
from flask import (
    Blueprint,
    Response,
    current_app,
    jsonify,
    make_response,
    request,
    send_from_directory,
    session,
)
from loguru import logger
from werkzeug.exceptions import HTTPException

from changedetectionio import queuedWatchMetaData, worker_pool
from changedetectionio.api.v2.helpers import (
    ApiV2Error,
    bootstrap_payload,
    feature_flags,
    i18n_payload,
    json_error,
    login_required_json,
    password_enabled,
    processor_options,
)
from changedetectionio.api.v2.serializers import (
    facets_snapshot,
    json_safe,
    serialize_group,
    serialize_watch_full,
    serialize_watch_row,
    stats_snapshot,
)
from changedetectionio.api.v2.settings import (
    apply_settings_update,
    clear_password,
    set_password,
    settings_payload,
)
from changedetectionio.realtime.sse import broker, format_event

_UNSET = object()

BACKUP_FILENAME_FORMAT = 'changedetection-backup-{}.zip'
BACKUP_FILENAME_RE = re.compile(r'^changedetection-backup-\d+\.zip$')
MAX_IMPORT_URLS = 5000
MAX_RESTORE_UPLOAD_BYTES = int(os.getenv('MAX_RESTORE_UPLOAD_MB', 256)) * 1024 * 1024


def _uuid_like(value: str) -> bool:
    try:
        from uuid import UUID

        return str(UUID(value)) == value.lower()
    except (ValueError, AttributeError):
        return False


def _resolve_watch_tags(datastore, tags):
    """Turn group names or UUIDs into a de-duplicated list of UUIDs, creating names."""
    if tags is None:
        return None
    if isinstance(tags, str):
        tags = [part.strip() for part in tags.split(',') if part.strip()]
    if not isinstance(tags, list):
        raise ApiV2Error('tags must be a list of group names or UUIDs', fields={'tags': ['Must be a list']})

    resolved = []
    for entry in tags:
        if not isinstance(entry, str):
            raise ApiV2Error('tags entries must be text', fields={'tags': ['Entries must be text']})
        entry = entry.strip()
        if not entry:
            continue
        if _uuid_like(entry):
            # v1's `tags` field accepts UUIDs as-is, even unknown ones. Keep
            # that contract for callers that already know the UUID.
            tag_uuid = entry
        else:
            tag_uuid = datastore.tag_uuid_for_title(entry) or datastore.add_tag(title=entry)
        if tag_uuid and tag_uuid not in resolved:
            resolved.append(tag_uuid)
    return resolved


def _queue_watches(uuids, update_q):
    """Queue a list of watches, skipping ones already queued or running."""
    from changedetectionio import worker_pool as pool

    busy = set(update_q.get_queued_uuids()) | set(pool.get_running_uuids())
    queued = set()
    for uuid in uuids:
        if uuid in busy:
            continue
        if pool.queue_item_async_safe(
            update_q, queuedWatchMetaData.PrioritizedItem(priority=1, item={'uuid': uuid})
        ):
            queued.add(uuid)
    return queued


def _emit(name, **kwargs):
    try:
        from blinker import signal

        signal(name).send(**kwargs)
    except Exception:
        logger.exception(f'v2: could not emit signal {name}')


def _backup_list(datastore):
    pattern = os.path.join(datastore.datastore_path, BACKUP_FILENAME_FORMAT.format('*'))
    backups = []
    for path in glob.glob(pattern):
        backups.append(
            {
                'filename': os.path.basename(path),
                'size_bytes': os.path.getsize(path),
                'created_at': int(os.path.getctime(path)),
            }
        )
    backups.sort(key=lambda item: item['created_at'], reverse=True)
    return backups


def construct_blueprint(datastore, update_q):  # noqa: C901 - route registration is inherently long
    bp = Blueprint('api_v2', __name__)

    @bp.errorhandler(ApiV2Error)
    def handle_api_error(error):
        return json_error(error.message, error.status, error.fields, error.code)

    @bp.errorhandler(HTTPException)
    def handle_http_error(error):
        return json_error(error.description or error.name, error.code or 500)

    @bp.errorhandler(Exception)
    def handle_unexpected(error):
        logger.exception(f'v2: unhandled error on {request.method} {request.path}')
        return json_error('Internal server error', 500)

    def watch_or_404(uuid):
        watch = datastore.data['watching'].get(uuid)
        if not watch:
            raise ApiV2Error(f'No watch exists with the UUID of {uuid}', 404, code='watch_not_found')
        return watch

    def _error_text(watch):
        """Processor errors live in last_error; HTTP/fetch errors in last-error.txt."""
        text = watch.get_error_text()
        if text:
            return text
        stored = watch.get('last_error')
        return stored if isinstance(stored, str) else ''

    def tag_or_404(uuid):
        tag = datastore.data['settings']['application'].get('tags', {}).get(uuid)
        if not tag:
            raise ApiV2Error(f'No group exists with the UUID of {uuid}', 404, code='group_not_found')
        return tag

    # ------------------------------------------------------------------
    # Auth, bootstrap, i18n
    # ------------------------------------------------------------------
    @bp.route('/bootstrap', methods=['GET'])
    def bootstrap():
        return jsonify(bootstrap_payload(datastore, update_q))

    @bp.route('/login', methods=['POST'])
    def login():
        body = request.get_json(silent=True) or {}
        if not password_enabled(datastore) or flask_login.current_user.is_authenticated:
            return jsonify(bootstrap_payload(datastore, update_q))

        from changedetectionio.flask_app import User

        user = User()
        user.id = 'defaultuser@changedetection.io'
        if not user.check_password(body.get('password') or ''):
            return json_error('Incorrect password', 401, code='invalid_password')

        flask_login.login_user(user, remember=True)
        return jsonify(bootstrap_payload(datastore, update_q))

    @bp.route('/logout', methods=['POST'])
    def logout():
        flask_login.logout_user()
        return jsonify(bootstrap_payload(datastore, update_q))

    @bp.route('/locale', methods=['POST'])
    def set_locale():
        body = request.get_json(silent=True) or {}
        locale = (body.get('locale') or '').strip()
        from changedetectionio.languages import get_language_codes

        if locale not in get_language_codes():
            return json_error('Unsupported locale', 400, code='invalid_locale')
        session.permanent = True
        session['locale'] = locale
        try:
            from flask_babel import refresh

            refresh()
        except Exception:
            pass
        return jsonify({'locale': locale})

    @bp.route('/i18n/<string:locale>', methods=['GET'])
    def i18n(locale):
        return jsonify(i18n_payload(locale))

    # ------------------------------------------------------------------
    # SSE
    # ------------------------------------------------------------------
    @bp.route('/events', methods=['GET'])
    @login_required_json
    def events():
        realtime = datastore.data['settings']['application'].get('ui', {}).get('socket_io_enabled', True)
        if not realtime:
            return Response(status=204)

        last_event_id = request.headers.get('Last-Event-ID') or request.args.get('last_event_id')
        try:
            last_event_id = int(last_event_id) if last_event_id not in (None, '') else None
        except (TypeError, ValueError):
            last_event_id = None

        def stream():
            yield 'retry: 3000\n\n'
            subscriber, replay, gap = broker.subscribe(last_event_id)
            last_heartbeat = time.time()
            try:
                if gap:
                    yield format_event(
                        None,
                        'resync',
                        {'reason': 'gap', 'server_time': int(time.time())},
                    )
                for event_id, event_type, data in replay:
                    yield format_event(event_id, event_type, data)

                initial = stats_snapshot(datastore, update_q)
                initial['server_time'] = int(time.time())
                initial['last_event_id'] = broker.last_event_id
                yield format_event(None, 'hello', initial)

                while True:
                    if broker.is_overflowed(subscriber):
                        break
                    try:
                        event_id, event_type, data = subscriber.get(timeout=5)
                        yield format_event(event_id, event_type, data)
                    except Exception as empty:
                        import queue as queue_module

                        if isinstance(empty, queue_module.Empty):
                            now = time.time()
                            yield f': heartbeat {int(now)}\n\n'
                            if now - last_heartbeat >= 30:
                                last_heartbeat = now
                                yield format_event(
                                    None,
                                    'heartbeat',
                                    {'server_time': int(now)},
                                )
                        else:
                            raise
            finally:
                broker.unsubscribe(subscriber)

        response = Response(stream(), mimetype='text/event-stream')
        response.headers['Cache-Control'] = 'no-cache, no-transform'
        response.headers['X-Accel-Buffering'] = 'no'
        response.headers['Connection'] = 'keep-alive'
        return response

    # ------------------------------------------------------------------
    # Dashboard / watches
    # ------------------------------------------------------------------
    def _dashboard_watches():
        from changedetectionio.blueprint.watchlist import filters as wl_filters

        args = {
            'tag': request.args.get('tag'),
            'q': request.args.get('q'),
            'processor': request.args.get('processor'),
        }
        status = (request.args.get('status') or 'all').lower()
        args.update(
            {
                'unread': '1' if status == 'unread' else None,
                'with_errors': '1' if status == 'errors' else None,
                'healthy': '1' if status == 'healthy' else None,
                'deals': '1' if status == 'deals' else None,
            }
        )
        filters = wl_filters.list_filters_from_args(datastore, args)
        context = []
        for watch in datastore.data['watching'].values():
            if not wl_filters.watch_matches_tag(datastore, watch, filters):
                continue
            if not wl_filters.watch_passes_search(watch, filters):
                continue
            context.append(watch)

        facets = facets_snapshot(datastore, context)
        watches = [
            watch
            for watch in context
            if (not filters['processor'] or watch.get('processor') == filters['processor'])
            and wl_filters.watch_passes_status(watch, filters)
        ]

        sort = (request.args.get('sort') or 'last_changed').lower()
        order = (request.args.get('order') or 'desc').lower()
        sort_keys = {
            'date_created': lambda w: int(w.get('date_created') or 0),
            'title': lambda w: (w.get('title') or w.get('page_title') or w.get('url') or '').lower(),
            'paused': lambda w: bool(w.get('paused')),
            'muted': lambda w: bool(w.get('notification_muted')),
            'last_checked': lambda w: int(w.get('last_checked') or 0),
            'last_changed': lambda w: int(w.last_changed or 0),
        }
        watches.sort(key=sort_keys.get(sort, sort_keys['last_changed']), reverse=(order != 'asc'))
        return context, watches, facets

    @bp.route('/watches', methods=['GET'])
    @login_required_json
    def list_watches():
        from changedetectionio import processors

        context, watches, facets = _dashboard_watches()
        per_page = request.args.get('per_page', type=int)
        page = max(1, request.args.get('page', type=int, default=1))
        total = len(watches)
        if per_page and per_page > 0:
            start = (page - 1) * per_page
            page_watches = watches[start:start + per_page]
            total_pages = max(1, (total + per_page - 1) // per_page)
        else:
            page_watches = watches
            total_pages = 1
            per_page = 0

        queued_uuids = set(update_q.get_queued_uuids())
        running_uuids = set(worker_pool.get_running_uuids())
        badges = processors.get_processor_badge_texts()

        return jsonify(
            {
                'items': [
                    serialize_watch_row(
                        datastore,
                        watch,
                        queued_uuids=queued_uuids,
                        running_uuids=running_uuids,
                        processor_badges=badges,
                    )
                    for watch in page_watches
                ],
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': total_pages,
                'facets': facets,
                'stats': stats_snapshot(datastore, update_q),
            }
        )

    @bp.route('/watches/ids', methods=['GET'])
    @login_required_json
    def watch_ids():
        _context, watches, _facets = _dashboard_watches()
        return jsonify({'uuids': [watch['uuid'] for watch in watches], 'total': len(watches)})

    @bp.route('/watches', methods=['POST'])
    @login_required_json
    def create_watch():
        from changedetectionio.api.operations import ApiError
        from changedetectionio.api.operations import create_watch as create_watch_operation

        body = request.get_json(silent=True) or {}
        if body.get('tags') is not None:
            body['tags'] = _resolve_watch_tags(datastore, body.get('tags'))
        if body.get('group_tags') is not None and 'tags' not in body:
            body['tags'] = _resolve_watch_tags(datastore, body.get('group_tags'))

        # The v1 OpenAPI schema declares notification_muted as boolean, but the
        # legacy UI and Pulse use null for "inherit the global setting". Apply
        # that one ternary outside the v1 validator so the v1 contract is
        # untouched.
        muted = body.pop('notification_muted', _UNSET)
        try:
            uuid = create_watch_operation(datastore, body)
        except ApiError as error:
            raise ApiV2Error(error.message, error.status) from error

        if muted is not _UNSET:
            watch = datastore.data['watching'][uuid]
            watch['notification_muted'] = muted
            watch.commit()
            _emit('watch_updated', watch_uuid=uuid)
        watch = watch_or_404(uuid)
        return jsonify(serialize_watch_full(datastore, watch)), 201

    @bp.route('/watches/<uuid>', methods=['GET'])
    @login_required_json
    def get_watch(uuid):
        return jsonify(serialize_watch_full(datastore, watch_or_404(uuid)))

    @bp.route('/watches/<uuid>', methods=['PUT'])
    @login_required_json
    def update_watch(uuid):
        from changedetectionio.api.operations import ApiError
        from changedetectionio.api.operations import update_watch as update_watch_operation

        watch_or_404(uuid)
        body = request.get_json(silent=True) or {}
        if body.get('tags') is not None:
            body['tags'] = _resolve_watch_tags(datastore, body.get('tags'))
        if body.get('group_tags') is not None and 'tags' not in body:
            body['tags'] = _resolve_watch_tags(datastore, body.get('group_tags'))

        # See create_watch(): notification_muted has a "system default" null in
        # the UI but is boolean-only in the v1 schema.
        muted = body.pop('notification_muted', _UNSET)
        try:
            update_watch_operation(datastore, uuid, body)
        except ApiError as error:
            raise ApiV2Error(error.message, error.status) from error

        if muted is not _UNSET:
            watch = datastore.data['watching'][uuid]
            watch['notification_muted'] = muted
            watch.commit()
            _emit('watch_updated', watch_uuid=uuid)

        return jsonify(serialize_watch_full(datastore, watch_or_404(uuid)))

    @bp.route('/watches/<uuid>', methods=['DELETE'])
    @login_required_json
    def delete_watch(uuid):
        watch_or_404(uuid)
        datastore.delete(uuid)
        return jsonify({'deleted': uuid})

    @bp.route('/watches/bulk', methods=['POST'])
    @login_required_json
    def bulk_watches():
        from changedetectionio.blueprint.ui import _handle_operations

        body = request.get_json(silent=True) or {}
        op = (body.get('op') or '').strip()
        uuids = body.get('uuids') or []
        if not op:
            raise ApiV2Error('op is required', fields={'op': ['Required']})
        if not isinstance(uuids, list) or any(not isinstance(uuid, str) for uuid in uuids):
            raise ApiV2Error('uuids must be a list of UUIDs', fields={'uuids': ['Must be a list']})
        uuids = [uuid for uuid in uuids if uuid in datastore.data['watching']]

        result = _handle_operations(
            op=op,
            uuids=uuids,
            datastore=datastore,
            extra_data=body.get('extra_data'),
            worker_pool=worker_pool,
            update_q=update_q,
            queuedWatchMetaData=queuedWatchMetaData,
            watch_check_update=current_app.config.get('watch_check_update_SIGNAL'),
            emit_flash=False,
        )
        return jsonify({'op': op, 'count': len(uuids), 'result': result})

    @bp.route('/watches/<uuid>/recheck', methods=['POST'])
    @login_required_json
    def recheck_watch(uuid):
        watch_or_404(uuid)
        if worker_pool.is_watch_running(uuid) or uuid in set(update_q.get_queued_uuids()):
            return jsonify({'queued': False, 'reason': 'already_queued'})
        worker_pool.queue_item_async_safe(
            update_q, queuedWatchMetaData.PrioritizedItem(priority=1, item={'uuid': uuid})
        )
        return jsonify({'queued': True})

    @bp.route('/watches/<uuid>/clone', methods=['POST'])
    @login_required_json
    def clone_watch(uuid):
        source = watch_or_404(uuid)
        new_uuid = datastore.clone(uuid)
        if not new_uuid:
            raise ApiV2Error('Could not clone this watch', 409, code='clone_refused')
        if not source.get('paused'):
            worker_pool.queue_item_async_safe(
                update_q, queuedWatchMetaData.PrioritizedItem(priority=5, item={'uuid': new_uuid})
            )
        _emit('watch_created', watch_uuid=new_uuid)
        return jsonify(serialize_watch_full(datastore, watch_or_404(new_uuid))), 201

    @bp.route('/watches/<uuid>/mark-viewed', methods=['POST'])
    @login_required_json
    def mark_viewed(uuid):
        from changedetectionio.pluggy_interface import set_watch_last_viewed

        watch_or_404(uuid)
        set_watch_last_viewed(datastore, uuid, time.time(), source='pulse_mark_viewed')
        return jsonify({'uuid': uuid, 'viewed': True})

    @bp.route('/watches/<uuid>/clear-errors', methods=['POST'])
    @login_required_json
    def clear_errors(uuid):
        watch = watch_or_404(uuid)
        watch['last_error'] = False
        watch['last_notification_error'] = False
        watch.commit()
        _emit('watch_updated', watch_uuid=uuid)
        return jsonify({'uuid': uuid, 'cleared': True})

    @bp.route('/watches/<uuid>/clear-history', methods=['POST'])
    @login_required_json
    def clear_history(uuid):
        watch_or_404(uuid)
        datastore.clear_watch_history(uuid)
        _emit('watch_updated', watch_uuid=uuid)
        return jsonify({'uuid': uuid, 'cleared': True})

    # ------------------------------------------------------------------
    # Filters & conditions helpers
    # ------------------------------------------------------------------
    FILTER_FORM_FIELDS = (
        'include_filters',
        'subtractive_selectors',
        'trigger_text',
        'ignore_text',
        'text_should_not_be_present',
        'extract_text',
        'extract_lines_containing',
        'check_unique_lines',
        'remove_duplicate_lines',
        'sort_text_alphabetically',
        'trim_text_whitespace',
        'strip_ignored_lines',
        'filter_text_added',
        'filter_text_replaced',
        'filter_text_removed',
        'webdriver_js_execute_code',
        'llm_intent',
    )

    def _filter_form_data(watch, overrides=None):
        from werkzeug.datastructures import MultiDict

        data = {key: watch.get(key) for key in FILTER_FORM_FIELDS if key in watch}
        if overrides:
            if not isinstance(overrides, dict):
                raise ApiV2Error('overrides must be an object', fields={'overrides': ['Must be an object']})
            for key, value in overrides.items():
                if key in FILTER_FORM_FIELDS:
                    data[key] = value

        # The preview helper builds a WTForms form, and WTForms needs a
        # multidict for repeated fields (the string-list filters).
        form_data = MultiDict()
        for key, value in data.items():
            if value is None:
                continue
            if isinstance(value, (list, tuple)):
                for item in value:
                    form_data.add(key, item)
            else:
                form_data.add(key, value)
        return form_data

    @bp.route('/watches/<uuid>/filters/preview', methods=['POST'])
    @login_required_json
    def filters_preview(uuid):
        from changedetectionio.processors.text_json_diff import prepare_filter_prevew

        watch = watch_or_404(uuid)
        body = request.get_json(silent=True) or {}
        data = _filter_form_data(watch, body.get('overrides'))
        try:
            result = prepare_filter_prevew(
                datastore=datastore, form_data=data, watch_uuid=uuid
            )
        except Exception as error:
            logger.exception(f'v2: filter preview failed for {uuid}')
            raise ApiV2Error(f'Could not build the preview: {error}', 400) from error
        return jsonify(json_safe(result))

    @bp.route('/watches/<uuid>/conditions/options', methods=['GET'])
    @login_required_json
    def condition_options(uuid):
        from changedetectionio.conditions import get_field_choices, get_operator_choices

        watch_or_404(uuid)
        return jsonify(
            {
                'fields': [
                    {'value': value, 'label': str(label)}
                    for value, label in get_field_choices()
                    if value
                ],
                'operators': [
                    {'value': value, 'label': str(label)}
                    for value, label in get_operator_choices()
                    if value
                ],
            }
        )

    @bp.route('/watches/<uuid>/conditions/verify', methods=['POST'])
    @login_required_json
    def verify_condition(uuid):
        from copy import deepcopy

        from changedetectionio.conditions import execute_ruleset_against_all_plugins
        from changedetectionio.processors.text_json_diff import prepare_filter_prevew

        watch = watch_or_404(uuid)
        body = request.get_json(silent=True) or {}
        rule = body.get('rule')
        if not isinstance(rule, dict) or not all(rule.get(key) for key in ('field', 'operator', 'value')):
            raise ApiV2Error(
                'A condition rule needs field, operator and value',
                fields={'rule': ['Incomplete rule']},
            )

        try:
            preview = prepare_filter_prevew(
                datastore=datastore, form_data=_filter_form_data(watch), watch_uuid=uuid
            )
            tmp_watch_data = deepcopy(dict(watch))
            tmp_watch_data['conditions'] = [rule]
            tmp_watch_data['conditions_match_logic'] = 'ALL'
            result = execute_ruleset_against_all_plugins(
                current_watch_uuid=uuid,
                application_datastruct={'watching': {uuid: tmp_watch_data}},
                ephemeral_data={'text': preview.get('after_filter', '')},
            )
        except Exception as error:
            logger.exception(f'v2: condition verify failed for {uuid}')
            raise ApiV2Error(f'Could not verify this rule: {error}', 400) from error

        return jsonify(
            {
                'passes': bool(result.get('result')),
                'data': json_safe(result.get('executed_data')),
            }
        )

    # ------------------------------------------------------------------
    # History, snapshots, preview, diff support
    # ------------------------------------------------------------------
    @bp.route('/watches/<uuid>/history', methods=['GET'])
    @login_required_json
    def watch_history(uuid):
        watch = watch_or_404(uuid)
        versions = []
        history = watch.history
        timestamps = list(history.keys())
        for index, timestamp in enumerate(timestamps):
            try:
                size = os.path.getsize(history[timestamp])
            except OSError:
                size = None
            versions.append(
                {
                    'timestamp': timestamp,
                    'iso': datetime.fromtimestamp(int(timestamp), tz=UTC).isoformat(),
                    'size': size,
                    'is_latest': index == len(timestamps) - 1,
                }
            )
        return jsonify(
            {
                'uuid': uuid,
                'versions': versions,
                'history_n': watch.history_n,
                'last_changed': int(watch.last_changed or 0),
                'viewed': bool(watch.viewed),
                'from_version_suggested': watch.get_from_version_based_on_last_viewed,
            }
        )

    @bp.route('/watches/<uuid>/snapshots/<timestamp>', methods=['GET'])
    @login_required_json
    def watch_snapshot(uuid, timestamp):
        watch = watch_or_404(uuid)
        history = watch.history
        if timestamp == 'latest':
            if not history:
                raise ApiV2Error('No history available', 404, code='no_history')
            timestamp = list(history.keys())[-1]
        if timestamp not in history:
            raise ApiV2Error('Snapshot not found', 404, code='snapshot_not_found')

        try:
            content = watch.get_history_snapshot(timestamp=timestamp)
        except Exception as error:
            logger.error(f'v2: could not read snapshot {uuid}/{timestamp}: {error}')
            raise ApiV2Error('Could not read snapshot', 500) from error

        response = make_response(content)
        response.headers['Content-Type'] = 'text/plain; charset=utf-8'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Cache-Control'] = 'no-store'
        return response

    @bp.route('/watches/<uuid>/preview', methods=['GET'])
    @login_required_json
    def watch_preview(uuid):
        from changedetectionio import html_tools
        from changedetectionio.pluggy_interface import get_fetcher_capabilities

        watch = watch_or_404(uuid)
        versions = list(watch.history.keys())
        version = request.args.get('version')
        if version not in versions:
            version = versions[-1] if versions else None

        content = ''
        triggered = ignored = blocked = []
        if version:
            content = watch.get_history_snapshot(timestamp=version)
            triggered = html_tools.strip_ignore_text(
                content=content, wordlist=watch.get('trigger_text'), mode='line numbers'
            )
            ignored = html_tools.strip_ignore_text(
                content=content, wordlist=watch.get('ignore_text'), mode='line numbers'
            )
            blocked = html_tools.strip_ignore_text(
                content=content, wordlist=watch.get('text_should_not_be_present'), mode='line numbers'
            )

        capabilities = {}
        try:
            capabilities = get_fetcher_capabilities(watch, datastore)
        except Exception:
            logger.exception('v2: could not resolve fetcher capabilities')

        return jsonify(
            {
                'uuid': uuid,
                'version': version,
                'versions': versions,
                'content': content,
                'triggered_lines': triggered,
                'ignored_lines': ignored,
                'blocked_lines': blocked,
                'error_text': _error_text(watch),
                'has_error_screenshot': bool(watch.get_error_snapshot()),
                'has_screenshot': bool(watch.get_screenshot()),
                'capabilities': json_safe(capabilities),
            }
        )

    @bp.route('/watches/<uuid>/screenshot', methods=['GET'])
    @login_required_json
    def watch_screenshot(uuid):
        watch = watch_or_404(uuid)
        filename = 'last-error-screenshot.png' if request.args.get('error') else 'last-screenshot.png'
        if not os.path.isfile(os.path.join(watch.data_dir, filename)):
            raise ApiV2Error('Screenshot not available', 404, code='screenshot_not_found')
        response = send_from_directory(watch.data_dir, filename, mimetype='image/png')
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response

    @bp.route('/watches/<uuid>/download-html', methods=['GET'])
    @login_required_json
    def download_latest_html(uuid):
        watch = watch_or_404(uuid)
        history = list(watch.history.keys())
        if not history:
            raise ApiV2Error('No snapshot available', 404, code='no_history')
        latest = history[-1]
        content = watch.get_fetched_html(latest)
        if not content:
            raise ApiV2Error('No fetched HTML available', 404, code='no_html')
        if isinstance(content, str):
            content = content.encode('utf-8')
        response = make_response(content)
        response.headers['Content-Type'] = 'text/plain; charset=utf-8'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Content-Disposition'] = f'attachment; filename="{uuid}-{latest}.html"'
        return response

    @bp.route('/watches/<uuid>/data-package', methods=['GET'])
    @login_required_json
    def download_data_package(uuid):
        watch = watch_or_404(uuid)
        memory_file = io.BytesIO()
        with zipfile.ZipFile(
            memory_file, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=8
        ) as archive:
            watch_json_path = os.path.join(watch.data_dir, 'watch.json')
            if os.path.isfile(watch_json_path):
                archive.write(watch_json_path, arcname=os.path.join(uuid, 'watch.json'))
            if os.path.isdir(watch.data_dir):
                for path in Path(watch.data_dir).glob('*'):
                    if path.is_file() and path.name != 'watch.json':
                        archive.write(path, arcname=os.path.join(uuid, path.name))
        memory_file.seek(0)
        stamp = datetime.now().strftime('%Y%m%d%H%M%S')
        response = make_response(memory_file.getvalue())
        response.headers['Content-Type'] = 'application/zip'
        response.headers['Content-Disposition'] = (
            f'attachment; filename="watch-data-{uuid[:8]}-{stamp}.zip"'
        )
        return response

    @bp.route('/watches/<uuid>/favicon', methods=['GET'])
    @login_required_json
    def watch_favicon(uuid):
        from changedetectionio.favicon_utils import get_favicon_mime_type

        watch = watch_or_404(uuid)
        filename = watch.get_favicon_filename()
        if not filename:
            raise ApiV2Error('Favicon not available', 404, code='favicon_not_found')
        filepath = os.path.join(watch.data_dir, filename)
        mime = get_favicon_mime_type(filepath)
        if 'text' in mime:
            raise ApiV2Error('Favicon not available', 404, code='favicon_not_found')
        response = send_from_directory(watch.data_dir, filename)
        response.headers['Content-Type'] = mime
        response.headers['Cache-Control'] = 'max-age=300, must-revalidate'
        return response

    @bp.route('/watches/<uuid>/error', methods=['GET'])
    @login_required_json
    def watch_error(uuid):
        watch = watch_or_404(uuid)
        return jsonify(
            {
                'uuid': uuid,
                'last_error': bool(watch.get('last_error')),
                'error_text': _error_text(watch),
                'last_notification_error': watch.get('last_notification_error') or False,
                'has_error_screenshot': bool(watch.get_error_snapshot()),
            }
        )

    @bp.route('/watches/<uuid>/processor-data', methods=['GET'])
    @login_required_json
    def watch_processor_data(uuid):
        watch = watch_or_404(uuid)
        processor_name = watch.get('processor', 'text_json_diff')
        from changedetectionio.processors import get_processor_submodule

        module = get_processor_submodule(processor_name, 'difference')
        if not module or not hasattr(module, 'get_data'):
            raise ApiV2Error(
                f"Processor '{processor_name}' does not provide difference data",
                404,
                code='processor_data_unavailable',
            )
        return jsonify(json_safe(module.get_data(watch=watch, datastore=datastore, request=request)))

    @bp.route('/watches/<uuid>/download-patch', methods=['GET'])
    @login_required_json
    def download_patch(uuid):
        watch = watch_or_404(uuid)
        dates = list(watch.history.keys())
        if len(dates) < 2:
            raise ApiV2Error('Not enough history', 400, code='no_history')
        from_version = request.args.get('from_version', dates[-2])
        to_version = request.args.get('to_version', dates[-1])
        if from_version not in watch.history or to_version not in watch.history:
            raise ApiV2Error('Snapshot not found', 404, code='snapshot_not_found')
        try:
            from_text = watch.get_history_snapshot(timestamp=from_version)
            to_text = watch.get_history_snapshot(timestamp=to_version)
        except Exception as error:
            logger.error(f'v2: download-patch could not read snapshots for {uuid}: {error}')
            raise ApiV2Error('Could not read snapshots', 500) from error

        diff_lines = difflib.unified_diff(
            from_text.splitlines(keepends=True),
            to_text.splitlines(keepends=True),
            fromfile=f'snapshot-{from_version}',
            tofile=f'snapshot-{to_version}',
            lineterm='',
        )
        patch = ''.join(diff_lines) or '(no differences)\n'
        response = make_response(patch)
        response.headers['Content-Type'] = 'text/plain; charset=utf-8'
        response.headers['Content-Disposition'] = f'attachment; filename="watch-{uuid}.patch"'
        return response

    # ------------------------------------------------------------------
    # AI change summary
    # ------------------------------------------------------------------
    def _summary_context(uuid):
        from changedetectionio.llm.evaluator import (
            DiffPrefs,
            build_summary_cache_prompt,
            get_effective_summary_prompt,
            get_llm_config,
            get_llm_settings,
            resolve_llm_timeout,
        )

        watch = watch_or_404(uuid)
        llm_cfg = datastore.data.get('settings', {}).get('application', {}).get('llm', {})
        if not get_llm_config(datastore):
            raise ApiV2Error('AI is not configured', 400, code='llm_not_configured')

        dates = list(watch.history.keys())
        if len(dates) < 2:
            raise ApiV2Error('Not enough history', 400, code='no_history')

        prefs = DiffPrefs(
            all_changes=request.args.get('all_changes', '0') == '1',
            ignore_whitespace=request.args.get('ignore_whitespace', '0') == '1',
            show_removed=request.args.get('removed', '1') == '1',
            show_added=request.args.get('added', '1') == '1',
        )
        from_version = request.args.get('from_version', dates[-2])
        to_version = request.args.get('to_version', dates[-1])
        if from_version not in watch.history or to_version not in watch.history:
            raise ApiV2Error('Snapshot not found', 404, code='snapshot_not_found')

        settings = get_llm_settings(datastore)
        cache_prompt = build_summary_cache_prompt(
            effective_prompt=get_effective_summary_prompt(watch, datastore),
            max_summary_tokens=settings.max_summary_tokens,
            prefs=prefs,
            model=settings.model,
        )
        return {
            'watch': watch,
            'dates': dates,
            'prefs': prefs,
            'from_version': from_version,
            'to_version': to_version,
            'cache_prompt': cache_prompt,
            'job_key': f'{uuid}|{from_version}|{to_version}|'
            f'{watch._llm_summary_prompt_hash(cache_prompt)}',
            'llm_timeout': resolve_llm_timeout(llm_cfg),
        }

    def _pending_summary(ctx):
        from changedetectionio.llm.summary_jobs import summary_jobs

        started = summary_jobs.run_started_at(ctx['job_key'])
        now = time.time()
        timeout_at = int((started or now) + ctx['llm_timeout'] + 15)
        return {
            'summary': None,
            'error': None,
            'status': 'pending',
            'timeout_at': timeout_at,
            'expires_in': max(0, timeout_at - int(now)),
        }

    @bp.route('/watches/<uuid>/summary', methods=['POST'])
    @login_required_json
    def start_summary(uuid):  # noqa: C901 - the summary lifecycle has several guards
        ctx = _summary_context(uuid)
        watch = ctx['watch']
        cached = watch.get_llm_diff_summary(
            ctx['from_version'], ctx['to_version'], prompt=ctx['cache_prompt']
        )
        if cached:
            return jsonify({'summary': cached, 'error': None, 'cached': True, 'status': 'done'})

        from changedetectionio.llm.summary_jobs import SummaryJobFailed, summary_jobs

        stored = summary_jobs.take_error(ctx['job_key'])
        if stored:
            code, message = stored
            return jsonify({'summary': None, 'error': message, 'status': 'error'}), code
        if summary_jobs.is_pending(ctx['job_key']):
            return jsonify(_pending_summary(ctx)), 202

        from changedetectionio.llm.evaluator import (
            LLMInputTooLargeError,
            get_global_token_budget_month,
            is_global_token_budget_exceeded,
            summarise_change,
        )

        if is_global_token_budget_exceeded(datastore):
            budget = get_global_token_budget_month(datastore)
            used = (datastore.data['settings']['application'].get('llm') or {}).get('tokens_this_month', 0)
            return (
                jsonify(
                    {
                        'summary': None,
                        'budget_exceeded': True,
                        'error': f'Monthly AI token budget of {budget:,} tokens reached ({used:,} used).',
                        'status': 'error',
                    }
                ),
                429,
            )

        try:
            from_text = watch.get_history_snapshot(timestamp=ctx['from_version'])
            to_text = watch.get_history_snapshot(timestamp=ctx['to_version'])
        except Exception as error:
            logger.error(f'v2: summary could not read snapshots for {uuid}: {error}')
            raise ApiV2Error('Could not read snapshots', 500) from error

        def _prep(text):
            if not ctx['prefs'].ignore_whitespace:
                return text.splitlines()
            return [' '.join(line.split()) for line in text.splitlines()]

        lines = list(difflib.unified_diff(_prep(from_text), _prep(to_text), lineterm='', n=3))
        diff_text = '\n'.join(lines[2:]) if len(lines) > 2 else '\n'.join(lines)
        if not diff_text.strip():
            return jsonify({'summary': None, 'error': 'No differences found', 'status': 'error'})

        def _job():
            try:
                summary = summarise_change(watch, datastore, diff=diff_text, current_snapshot=to_text)
            except LLMInputTooLargeError as error:
                raise SummaryJobFailed(str(error), http_status=400) from error
            except Exception as error:
                logger.exception(f'v2: AI summary failed for {uuid}')
                raise SummaryJobFailed(str(error), http_status=500) from error
            if not summary:
                raise SummaryJobFailed('AI returned an empty summary', http_status=200)
            watch.save_llm_diff_summary(
                summary, ctx['from_version'], ctx['to_version'], prompt=ctx['cache_prompt']
            )

        def _settled(_key):
            _emit(
                'llm_summary_ready',
                watch_uuid=uuid,
                from_version=ctx['from_version'],
                to_version=ctx['to_version'],
            )

        summary_jobs.submit(ctx['job_key'], _job, on_settled=_settled)
        from changedetectionio.pluggy_interface import set_watch_last_viewed

        set_watch_last_viewed(datastore, uuid, time.time(), source='pulse_ai_summary')
        return jsonify(_pending_summary(ctx)), 202

    @bp.route('/watches/<uuid>/summary', methods=['GET'])
    @login_required_json
    def poll_summary(uuid):
        ctx = _summary_context(uuid)
        watch = ctx['watch']
        cached = watch.get_llm_diff_summary(
            ctx['from_version'], ctx['to_version'], prompt=ctx['cache_prompt']
        )
        if cached:
            return jsonify({'summary': cached, 'error': None, 'cached': True, 'status': 'done'})

        from changedetectionio.llm.summary_jobs import summary_jobs

        stored = summary_jobs.take_error(ctx['job_key'])
        if stored:
            code, message = stored
            return jsonify({'summary': None, 'error': message, 'status': 'error'}), code
        if summary_jobs.is_pending(ctx['job_key']):
            return jsonify(_pending_summary(ctx)), 202
        return jsonify({'summary': None, 'error': None, 'status': 'idle'})

    # ------------------------------------------------------------------
    # Groups / tags
    # ------------------------------------------------------------------
    def _group_counts():
        counts = {}
        for watch in datastore.data['watching'].values():
            for tag_uuid in datastore.get_all_tags_for_watch(watch['uuid']):
                counts[tag_uuid] = counts.get(tag_uuid, 0) + 1
        return counts

    @bp.route('/groups', methods=['GET'])
    @login_required_json
    def list_groups():
        from changedetectionio import processors

        counts = _group_counts()
        badges = processors.get_processor_badge_texts()
        groups = [
            serialize_group(datastore, tag, watch_count=counts.get(uuid, 0), processor_badges=badges)
            for uuid, tag in sorted(
                datastore.data['settings']['application'].get('tags', {}).items(),
                key=lambda item: item[1].get('title', '').lower(),
            )
        ]
        return jsonify(
            {
                'items': groups,
                'total': len(groups),
                'stats': stats_snapshot(datastore, update_q),
            }
        )

    @bp.route('/groups/<uuid>', methods=['GET'])
    @login_required_json
    def get_group(uuid):
        tag = tag_or_404(uuid)
        counts = _group_counts()
        data = serialize_group(datastore, tag, watch_count=counts.get(uuid, 0))
        data['matching_watches'] = [
            {
                'uuid': watch['uuid'],
                'title': watch.get('title') or watch.get('page_title') or watch.get('url'),
                'url': watch.get('url'),
                'paused': bool(watch.get('paused')),
            }
            for watch in datastore.data['watching'].values()
            if tag.matches_url(watch.get('url', '')) or uuid in datastore.get_all_tags_for_watch(watch['uuid'])
        ]
        return jsonify(data)

    @bp.route('/groups', methods=['POST'])
    @login_required_json
    def create_group():
        from changedetectionio.api.operations import ApiError, create_tag

        body = request.get_json(silent=True) or {}
        try:
            uuid = create_tag(datastore, body)
        except ApiError as error:
            raise ApiV2Error(error.message, error.status) from error
        return jsonify(serialize_group(datastore, tag_or_404(uuid))), 201

    @bp.route('/groups/<uuid>', methods=['PUT'])
    @login_required_json
    def update_group(uuid):
        from changedetectionio.api.operations import ApiError, update_tag

        tag_or_404(uuid)
        try:
            update_tag(datastore, uuid, request.get_json(silent=True) or {})
        except ApiError as error:
            raise ApiV2Error(error.message, error.status) from error
        return jsonify(serialize_group(datastore, tag_or_404(uuid)))

    @bp.route('/groups/<uuid>', methods=['DELETE'])
    @login_required_json
    def delete_group(uuid):
        from changedetectionio.api.operations import ApiError, delete_tag

        tag_or_404(uuid)
        try:
            delete_tag(datastore, uuid)
        except ApiError as error:
            raise ApiV2Error(error.message, error.status) from error
        return jsonify({'deleted': uuid})

    @bp.route('/groups/<uuid>/unlink', methods=['POST'])
    @login_required_json
    def unlink_group(uuid):
        tag_or_404(uuid)
        removed = 0
        for watch in datastore.data['watching'].values():
            if watch.get('tags') and uuid in watch['tags']:
                watch['tags'].remove(uuid)
                watch.commit()
                removed += 1
                _emit('watch_updated', watch_uuid=watch['uuid'])
        return jsonify({'unlinked': removed})

    @bp.route('/groups/<uuid>/mute', methods=['POST'])
    @login_required_json
    def mute_group(uuid):
        tag = tag_or_404(uuid)
        body = request.get_json(silent=True) or {}
        muted = body.get('muted')
        tag['notification_muted'] = (not bool(tag.get('notification_muted'))) if muted is None else bool(muted)
        tag.commit()
        _emit('group_updated', uuid=uuid)
        return jsonify({'uuid': uuid, 'notification_muted': bool(tag['notification_muted'])})

    @bp.route('/groups/<uuid>/recheck', methods=['POST'])
    @login_required_json
    def recheck_group(uuid):
        tag_or_404(uuid)
        uuids = [
            watch['uuid']
            for watch in datastore.data['watching'].values()
            if not watch.get('paused') and uuid in datastore.get_all_tags_for_watch(watch['uuid'])
        ]
        queued = _queue_watches(uuids, update_q)
        return jsonify({'queued': len(queued), 'total': len(uuids)})

    # ------------------------------------------------------------------
    # Settings, notifications, system
    # ------------------------------------------------------------------
    @bp.route('/settings', methods=['GET'])
    @login_required_json
    def get_settings():
        return jsonify(settings_payload(datastore))

    @bp.route('/settings', methods=['PUT'])
    @login_required_json
    def update_settings():
        def adjust_workers(old_count, new_count):
            from changedetectionio.flask_app import notification_q

            result = worker_pool.adjust_async_worker_count(
                new_count=new_count,
                update_q=update_q,
                notification_q=notification_q,
                app=current_app._get_current_object(),
                datastore=datastore,
            )
            if result.get('status') == 'error':
                logger.error(f"v2: could not adjust workers: {result.get('message')}")

        result = apply_settings_update(
            datastore, request.get_json(silent=True) or {}, on_workers_changed=adjust_workers
        )
        return jsonify({'updated': result['updated'], 'settings': settings_payload(datastore)})

    @bp.route('/settings/password', methods=['POST'])
    @login_required_json
    def update_password():
        body = request.get_json(silent=True) or {}
        if body.get('remove'):
            clear_password(datastore)
            flask_login.logout_user()
            return jsonify({'password_set': False, 'password_locked': bool(os.getenv('SALTED_PASS', False))})
        set_password(datastore, body.get('password') or '')
        flask_login.logout_user()
        return jsonify({'password_set': True, 'password_locked': bool(os.getenv('SALTED_PASS', False))})

    @bp.route('/settings/api-key/reset', methods=['POST'])
    @login_required_json
    def reset_api_key():
        import secrets

        new_key = secrets.token_hex(16)
        datastore.data['settings']['application']['api_access_token'] = new_key
        datastore.commit()
        return jsonify({'api_key': new_key})

    @bp.route('/notifications/logs', methods=['GET'])
    @login_required_json
    def notification_logs():
        from changedetectionio.flask_app import notification_debug_log

        return jsonify({'lines': list(notification_debug_log)})

    @bp.route('/notifications/test', methods=['POST'])
    @login_required_json
    def test_notification():
        import apprise

        from changedetectionio.api.operations import ApiError, validate_notification_urls
        from changedetectionio.notification.apprise_plugin.assets import apprise_asset

        body = request.get_json(silent=True) or {}
        urls = body.get('urls')
        if urls is None:
            urls = list(datastore.data['settings']['application'].get('notification_urls') or [])
        if isinstance(urls, str):
            urls = [line.strip() for line in urls.splitlines() if line.strip()]
        if not isinstance(urls, list) or not urls:
            raise ApiV2Error('No notification URLs configured', 400, code='no_notification_urls')
        try:
            validate_notification_urls(urls)
        except ApiError as error:
            raise ApiV2Error(
                error.message,
                error.status,
                fields={'urls': [error.message]},
            ) from error

        apobj = apprise.Apprise(asset=apprise_asset)
        for url in urls:
            if not apobj.add(url):
                raise ApiV2Error(f'Invalid notification URL: {url}', 400, code='invalid_notification_url')

        title = body.get('title') or 'changedetection.io test notification'
        message = body.get('body') or 'This is a test notification sent from Pulse.'
        try:
            ok = apobj.notify(title=title, body=message)
        except Exception as error:
            logger.error(f'v2: test notification failed: {error}')
            raise ApiV2Error(str(error), 502, code='notification_failed') from error
        return jsonify({'sent': bool(ok), 'count': len(urls)})

    @bp.route('/system/info', methods=['GET'])
    @login_required_json
    def system_info():
        from changedetectionio.pluggy_interface import get_active_plugins

        queue_snapshot = _queue_snapshot()
        return jsonify(
            {
                'version': __import__('changedetectionio', fromlist=['__version__']).__version__,
                'new_version_available': bool(current_app.config.get('NEW_VERSION_AVAILABLE')),
                'uptime_seconds': int(time.time() - datastore.start_time),
                'watch_limit': datastore.watch_limit,
                'watch_count': len(datastore.data['watching']),
                'active_plugins': [
                    plugin.get('name', str(plugin)) if isinstance(plugin, dict) else str(plugin)
                    for plugin in get_active_plugins()
                ],
                'processors': processor_options(),
                'features': feature_flags(datastore),
                'queue': queue_snapshot,
                'stats': stats_snapshot(datastore, update_q),
                'server_time': int(time.time()),
            }
        )

    # ------------------------------------------------------------------
    # Queue
    # ------------------------------------------------------------------
    def _queue_snapshot():
        from changedetectionio.blueprint.ui.queue import _snapshot

        page = max(1, request.args.get('page', type=int, default=1))
        per_page = request.args.get('per_page', type=int, default=50)
        per_page = max(1, min(per_page, 500))
        return _snapshot(datastore, update_q, page=page, per_page=per_page)

    @bp.route('/queue', methods=['GET'])
    @login_required_json
    def queue_snapshot():
        return jsonify(_queue_snapshot())

    @bp.route('/queue/clear', methods=['POST'])
    @login_required_json
    def queue_clear():
        before = update_q.qsize()
        update_q.clear()
        _emit('queue_length', length=0)
        return jsonify({'removed': before, 'queue_size': update_q.qsize()})

    @bp.route('/queue/cancel', methods=['POST'])
    @login_required_json
    def queue_cancel():
        from changedetectionio.flask_app import notification_q

        body = request.get_json(silent=True) or {}
        uuid = (body.get('uuid') or '').strip()
        if not uuid:
            raise ApiV2Error('uuid is required', fields={'uuid': ['Required']})
        result = worker_pool.cancel_running_uuid(
            uuid,
            update_q=update_q,
            notification_q=notification_q,
            app=current_app._get_current_object(),
            datastore=datastore,
        )
        if not result.get('cancelled'):
            return jsonify({'ok': False, **result}), 404
        _emit('watch_updated', watch_uuid=uuid)
        return jsonify({'ok': True, **result})

    # ------------------------------------------------------------------
    # Import
    # ------------------------------------------------------------------
    @bp.route('/import/urls', methods=['POST'])
    @login_required_json
    def import_urls():  # noqa: C901 - import validation and per-line errors
        from changedetectionio import processors
        from changedetectionio.blueprint.imports.importer import split_url_and_tags
        from changedetectionio.validate_url import is_safe_valid_url

        body = request.get_json(silent=True) or {}
        raw = body.get('urls')
        if not isinstance(raw, str) or not raw.strip():
            raise ApiV2Error('urls is required', fields={'urls': ['Paste at least one URL']})

        processor = (body.get('processor') or '').strip() or None
        if processor:
            available = {name for name, _label in processors.available_processors()}
            if processor not in available:
                raise ApiV2Error('Unknown processor', fields={'processor': ['Unknown processor']})

        dedupe = body.get('dedupe', True) is not False
        paused = bool(body.get('paused'))
        global_tags = body.get('tags') or []
        if isinstance(global_tags, str):
            global_tags = [part.strip() for part in global_tags.split(',') if part.strip()]

        lines = raw.splitlines()
        if len(lines) > MAX_IMPORT_URLS:
            lines = lines[:MAX_IMPORT_URLS]

        imported, skipped, errors, uuids = 0, 0, [], []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            url, line_tags = split_url_and_tags(line)
            url = url.strip()
            if not url or not is_safe_valid_url(url):
                errors.append({'line': line, 'error': 'Invalid or unsupported URL'})
                continue
            if dedupe and datastore.url_exists(url):
                skipped += 1
                continue
            if datastore.watch_limit_reached():
                errors.append({'line': line, 'error': datastore.watch_limit_message()})
                break

            tag_names = [part.strip() for part in line_tags.split(',') if part.strip()]
            for tag in global_tags:
                if tag not in tag_names:
                    tag_names.append(tag)
            extras = {}
            if processor:
                extras['processor'] = processor
            if paused:
                extras['paused'] = True

            new_uuid = datastore.add_watch(
                url=url,
                tag=','.join(tag_names),
                extras=extras or None,
                save_immediately=False,
            )
            if new_uuid:
                imported += 1
                uuids.append(new_uuid)
                _emit('watch_created', watch_uuid=new_uuid)
            else:
                errors.append({'line': line, 'error': 'Could not add this URL'})

        datastore.commit()
        return jsonify(
            {
                'imported': imported,
                'skipped': skipped,
                'errors': errors,
                'uuids': uuids,
            }
        )

    # ------------------------------------------------------------------
    # Backups
    # ------------------------------------------------------------------
    @bp.route('/backups', methods=['GET'])
    @login_required_json
    def list_backups():
        items = _backup_list(datastore)
        return jsonify({'items': items, 'total': len(items)})

    @bp.route('/backups', methods=['POST'])
    @login_required_json
    def create_backup():
        from changedetectionio.blueprint.backups import create_backup as create_backup_file

        backups = _backup_list(datastore)
        if len(backups) > int(os.getenv('MAX_NUMBER_BACKUPS', 100)):
            raise ApiV2Error('Maximum number of backups reached', 409, code='backup_limit')
        thread = threading.Thread(
            target=create_backup_file,
            args=(datastore.datastore_path, datastore.data.get('watching')),
            kwargs={'tags': datastore.data['settings']['application'].get('tags', {})},
            daemon=True,
            name='PulseBackupCreator',
        )
        thread.start()
        return jsonify({'status': 'started'}), 202

    @bp.route('/backups/<string:filename>', methods=['DELETE'])
    @login_required_json
    def delete_backup(filename):
        if filename == 'all':
            for backup in _backup_list(datastore):
                os.unlink(os.path.join(datastore.datastore_path, backup['filename']))
            return jsonify({'deleted': 'all'})
        if not BACKUP_FILENAME_RE.match(filename):
            raise ApiV2Error('Invalid backup filename', 400, code='invalid_filename')
        path = os.path.join(datastore.datastore_path, filename)
        if not os.path.isfile(path):
            raise ApiV2Error('Backup not found', 404, code='backup_not_found')
        os.unlink(path)
        return jsonify({'deleted': filename})

    @bp.route('/backups/<string:filename>/download', methods=['GET'])
    @login_required_json
    def download_backup(filename):
        if filename == 'latest':
            backups = _backup_list(datastore)
            if not backups:
                raise ApiV2Error('No backups available', 404, code='backup_not_found')
            filename = backups[0]['filename']
        if not BACKUP_FILENAME_RE.match(filename):
            raise ApiV2Error('Invalid backup filename', 400, code='invalid_filename')
        path = os.path.abspath(os.path.join(datastore.datastore_path, filename))
        if not path.startswith(os.path.abspath(datastore.datastore_path) + os.sep):
            raise ApiV2Error('Backup not found', 404, code='backup_not_found')
        if not os.path.isfile(path):
            raise ApiV2Error('Backup not found', 404, code='backup_not_found')
        return send_from_directory(
            os.path.abspath(datastore.datastore_path), filename, as_attachment=True
        )

    @bp.route('/backups/restore', methods=['POST'])
    @login_required_json
    def restore_backup():
        from changedetectionio.blueprint.backups.restore import import_from_zip

        files = [file for file in request.files.getlist('file') if file and file.filename]
        if not files:
            raise ApiV2Error('No backup file uploaded', 400, code='no_file')
        if any(not file.filename.lower().endswith('.zip') for file in files):
            raise ApiV2Error('Backup must be a .zip file', 400, code='invalid_file')

        total = 0
        streams = []
        for file in files:
            raw = file.read(MAX_RESTORE_UPLOAD_BYTES + 1)
            total += len(raw)
            if total > MAX_RESTORE_UPLOAD_BYTES:
                raise ApiV2Error('Backup file is too large', 413, code='file_too_large')
            try:
                stream = io.BytesIO(raw)
                with zipfile.ZipFile(stream):
                    pass
                stream.seek(0)
            except zipfile.BadZipFile as error:
                raise ApiV2Error('Invalid or corrupted zip file', 400, code='invalid_file') from error
            streams.append((file.filename, stream))

        include_groups = body_flag(request.form.get('include_groups'), True)
        include_groups_replace = body_flag(request.form.get('include_groups_replace'), True)
        include_watches = body_flag(request.form.get('include_watches'), True)
        include_watches_replace = body_flag(request.form.get('include_watches_replace'), True)

        results = []
        for filename, stream in streams:
            try:
                results.append(import_from_zip(
                    stream,
                    datastore,
                    include_groups=include_groups,
                    include_groups_replace=include_groups_replace,
                    include_watches=include_watches,
                    include_watches_replace=include_watches_replace,
                ))
            except Exception as error:
                logger.exception(f'v2: restore failed for {filename}')
                results.append({'filename': filename, 'error': str(error)})

        _emit('general_stats_update')
        return jsonify({'results': results})

    return bp


def body_flag(value, default=True):
    if value is None:
        return default
    return str(value).lower() in ('1', 'true', 'yes', 'on', 'y')
