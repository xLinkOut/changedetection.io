#!/usr/bin/env python3
"""Tests for the browser-first /api/v2 API and the Pulse shell."""

import json

from .util import set_original_response


def _csrf(client):
    response = client.get('/api/v2/bootstrap')
    assert response.status_code == 200
    return response.get_json()['csrfToken']


def _json_headers(client):
    return {
        'content-type': 'application/json',
        'X-CSRFToken': _csrf(client),
    }


def test_pulse_shell_and_bootstrap(client, live_server):
    response = client.get('/pulse/')
    assert response.status_code == 200
    body = response.get_data(as_text=True)
    assert 'id="root"' in body
    assert '/pulse/assets/' in body
    assert 'window.__PULSE' not in body

    bootstrap = client.get('/api/v2/bootstrap').get_json()
    assert bootstrap['app'] == 'pulse'
    assert bootstrap['apiBase'] == '/api/v2'
    assert bootstrap['appBase'] == '/pulse'
    assert bootstrap['authenticated'] is True
    assert bootstrap['passwordEnabled'] is False
    assert bootstrap['csrfToken']
    assert bootstrap['languages']


def test_v2_watch_lifecycle(client, live_server, datastore_path):
    set_original_response(datastore_path=datastore_path)
    headers = _json_headers(client)

    response = client.post(
        '/api/v2/watches',
        data=json.dumps(
            {
                'url': 'https://example.com/v2-test',
                'title': 'V2 test',
                'tags': ['v2 group'],
                'paused': True,
            }
        ),
        headers=headers,
    )
    assert response.status_code == 201, response.get_data(as_text=True)
    watch = response.get_json()
    uuid = watch['uuid']
    assert watch['title'] == 'V2 test'
    assert watch['tags'][0]['title'] == 'v2 group'

    listing = client.get('/api/v2/watches').get_json()
    assert listing['total'] == 1
    row = listing['items'][0]
    assert row['uuid'] == uuid
    # Dashboard-shaped fields exist in one response.
    for key in ('tags', 'checking_now', 'queued', 'history_n', 'fetch_time', 'processor'):
        assert key in row
    assert listing['facets']['status']['all'] == 1
    assert listing['stats']['watch_count'] == 1

    assert client.get(f'/api/v2/watches/{uuid}').status_code == 200
    assert client.get('/api/v2/watches/not-a-uuid').status_code == 404

    # A rich edit payload, including the ternary "system default" value that
    # the v1 schema does not accept.
    update = {
        'url': 'https://example.com/v2-test',
        'title': 'V2 test updated',
        'paused': False,
        'notification_muted': None,
        'include_filters': ['#main'],
        'trigger_text': ['hello'],
        'strip_ignored_lines': None,
        'use_page_title_in_list': None,
        'conditions': [{'field': 'page_filtered_text', 'operator': 'in', 'value': 'hello'}],
        'time_between_check_use_default': True,
        'headers': {},
        'notification_format': 'System default',
        'llm_backend_profile': True,
        'processor_config_restock_diff': {'in_stock_processing': 'in_stock_only'},
    }
    response = client.put(
        f'/api/v2/watches/{uuid}', data=json.dumps(update), headers=headers
    )
    assert response.status_code == 200, response.get_data(as_text=True)
    saved = client.get(f'/api/v2/watches/{uuid}').get_json()
    assert saved['title'] == 'V2 test updated'
    assert saved['notification_muted'] is None
    assert saved['include_filters'] == ['#main']
    assert saved['conditions'][0]['field'] == 'page_filtered_text'

    # Bulk operation
    response = client.post(
        '/api/v2/watches/bulk',
        data=json.dumps({'op': 'pause', 'uuids': [uuid]}),
        headers=headers,
    )
    assert response.status_code == 200
    assert response.get_json()['count'] == 1
    assert client.get(f'/api/v2/watches/{uuid}').get_json()['paused'] is True

    ids = client.get('/api/v2/watches/ids').get_json()
    assert ids['uuids'] == [uuid]

    assert client.delete(f'/api/v2/watches/{uuid}', headers=headers).status_code == 200
    assert client.get('/api/v2/watches').get_json()['total'] == 0


def test_v2_groups_and_settings(client, live_server):
    headers = _json_headers(client)

    response = client.post(
        '/api/v2/groups',
        data=json.dumps({'title': 'V2 group'}),
        headers=headers,
    )
    assert response.status_code == 201
    group = response.get_json()
    group_uuid = group['uuid']
    assert group['title'] == 'V2 group'

    response = client.put(
        f'/api/v2/groups/{group_uuid}',
        data=json.dumps(
            {
                'title': 'V2 group updated',
                'tag_colour': '#4f8ef7',
                'url_match_pattern': '*example.com*',
                'overrides_watch': False,
                'include_filters': ['#main'],
                'strip_ignored_lines': False,
                'llm_backend_profile': None,
                'notification_muted': False,
                'notification_urls': [],
                'notification_format': 'System default',
                'processor_config_restock_diff': {'in_stock_processing': 'in_stock_only'},
            }
        ),
        headers=headers,
    )
    assert response.status_code == 200, response.get_data(as_text=True)
    assert client.get('/api/v2/groups').get_json()['total'] == 1

    response = client.post(
        f'/api/v2/groups/{group_uuid}/mute',
        data=json.dumps({'muted': True}),
        headers=headers,
    )
    assert response.status_code == 200
    assert response.get_json()['notification_muted'] is True

    response = client.post(f'/api/v2/groups/{group_uuid}/unlink', headers=headers)
    assert response.status_code == 200

    settings = client.get('/api/v2/settings').get_json()
    assert settings['general']['password_set'] is False
    assert settings['fetching']['workers'] >= 1
    assert settings['llm']['api_key'] == ''
    assert settings['proxies']['extra_proxies'] == []

    response = client.put(
        '/api/v2/settings',
        data=json.dumps({'ui': {'timeago_format': 'short'}}),
        headers=headers,
    )
    assert response.status_code == 200
    assert response.get_json()['settings']['ui']['timeago_format'] == 'short'
    # Restore, so later tests see the default.
    client.put(
        '/api/v2/settings',
        data=json.dumps({'ui': {'timeago_format': 'long'}}),
        headers=headers,
    )

    assert client.delete(f'/api/v2/groups/{group_uuid}', headers=headers).status_code == 200


def test_v2_requires_json_auth_and_csrf(client, live_server):
    datastore = live_server.app.config['DATASTORE']

    # CSRF is required for mutations. The test config disables CSRF globally,
    # so turn it on just for this request.
    live_server.app.config['WTF_CSRF_ENABLED'] = True
    try:
        response = client.post('/api/v2/watches/bulk', data='{}', headers={'content-type': 'application/json'})
        assert response.status_code == 400
        assert response.is_json
        assert response.get_json()['code'] == 'csrf_failed'
    finally:
        live_server.app.config['WTF_CSRF_ENABLED'] = False

    from changedetectionio.api.v2.settings import set_password

    set_password(datastore, 'pulse-test-password')
    try:
        bootstrap = client.get('/api/v2/bootstrap').get_json()
        assert bootstrap['authenticated'] is False
        assert bootstrap['passwordEnabled'] is True
        assert 'features' not in bootstrap
        assert client.get('/pulse/').status_code == 200

        response = client.get('/api/v2/watches')
        assert response.status_code == 401
        assert response.is_json
        assert response.get_json()['code'] == 'auth_required'
        assert client.get('/api/v2/events').status_code == 401

        response = client.post(
            '/api/v2/login',
            data=json.dumps({'password': 'wrong'}),
            headers={'content-type': 'application/json', 'X-CSRFToken': bootstrap['csrfToken']},
        )
        assert response.status_code == 401
        assert response.get_json()['code'] == 'invalid_password'

        response = client.post(
            '/api/v2/login',
            data=json.dumps({'password': 'pulse-test-password'}),
            headers={'content-type': 'application/json', 'X-CSRFToken': bootstrap['csrfToken']},
        )
        assert response.status_code == 200
        assert response.get_json()['authenticated'] is True
        assert client.get('/api/v2/watches').status_code == 200
    finally:
        datastore.remove_password()
        client.post('/api/v2/logout', headers=_json_headers(client))


def test_sse_broker_replay_and_gap():
    from changedetectionio.realtime.sse import SSEBroker

    broker = SSEBroker(max_history=5)
    broker.publish('one', {'n': 1})
    broker.publish('two', {'n': 2})
    broker.publish('three', {'n': 3})

    subscriber, replay, gap = broker.subscribe(last_event_id=1)
    assert [event[0] for event in replay] == [2, 3]
    assert gap is False
    broker.unsubscribe(subscriber)

    # Push the requested id out of the ring buffer.
    for index in range(4, 12):
        broker.publish('more', {'n': index})

    subscriber, replay, gap = broker.subscribe(last_event_id=0)
    assert gap is True
    assert replay == []
    broker.unsubscribe(subscriber)

    subscriber, replay, gap = broker.subscribe(last_event_id=None)
    assert replay == []
    assert gap is False
    broker.publish('four', {'n': 4})
    event = subscriber.get(timeout=1)
    assert event[1] == 'four'
    broker.unsubscribe(subscriber)
