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
                'llm_intent': 'Alert me when the price drops',
            }
        ),
        headers=headers,
    )
    assert response.status_code == 201, response.get_data(as_text=True)
    watch = response.get_json()
    uuid = watch['uuid']
    assert watch['title'] == 'V2 test'
    assert watch['tags'][0]['title'] == 'v2 group'
    assert watch['llm_intent'] == 'Alert me when the price drops'

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


def test_v2_extract_csv_and_share_watch(client, live_server, datastore_path, monkeypatch):
    headers = _json_headers(client)
    datastore = live_server.app.config['DATASTORE']
    uuid = datastore.add_watch(
        url='https://example.com/extract-test',
        extras={'title': 'Extract test', 'paused': True},
    )
    watch = datastore.data['watching'][uuid]
    watch.save_history_blob('Price: 10 EUR\nOther line', 1700000000, 'first')
    watch.save_history_blob('Price: 12 EUR\nOther line', 1700000060, 'second')

    # Invalid patterns are field errors, not a 500.
    response = client.post(
        f'/api/v2/watches/{uuid}/extract',
        data=json.dumps({'regex': '('}),
        headers=headers,
    )
    assert response.status_code == 400
    assert response.get_json()['code'] == 'invalid_regex'
    assert 'regex' in response.get_json()['fields']

    response = client.post(
        f'/api/v2/watches/{uuid}/extract',
        data=json.dumps({'regex': r'Price: (\d+) EUR'}),
        headers=headers,
    )
    assert response.status_code == 200, response.get_data(as_text=True)
    preview = response.get_json()
    assert preview['snapshot_count'] == 2
    assert preview['match_count'] == 2
    assert preview['columns'][0] == 'Epoch seconds'
    assert preview['rows'][-1][2] == '12'
    assert preview['truncated'] is False

    response = client.get(f'/api/v2/watches/{uuid}/extract?regex=Price%3A+%28%5Cd%2B%29+EUR')
    assert response.status_code == 200
    assert response.content_type.startswith('text/csv')
    assert b'Epoch seconds' in response.data
    assert b'12' in response.data

    response = client.post(
        f'/api/v2/watches/{uuid}/extract',
        data=json.dumps({'regex': 'not-present-anywhere'}),
        headers=headers,
    )
    assert response.status_code == 200
    assert response.get_json()['match_count'] == 0
    assert client.get(f'/api/v2/watches/{uuid}/extract?regex=not-present-anywhere').status_code == 404

    # Sharing is opt-in.
    response = client.post(f'/api/v2/watches/{uuid}/share', headers=headers)
    assert response.status_code == 403
    assert response.get_json()['code'] == 'share_disabled'

    client.put(
        '/api/v2/settings',
        data=json.dumps({'ui': {'use_share_watch': True}}),
        headers=headers,
    )

    captured = {}

    class FakeShareResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {'share_key': 'test-share-key'}

    def fake_request(**kwargs):
        captured.update(kwargs)
        return FakeShareResponse()

    monkeypatch.setattr('requests.request', fake_request)

    response = client.post(f'/api/v2/watches/{uuid}/share', headers=headers)
    assert response.status_code == 200, response.get_data(as_text=True)
    assert response.get_json()['url'] == 'https://changedetection.io/share/test-share-key'
    assert captured['url'] == 'https://changedetection.io/share/share'

    shared = json.loads(captured['data']['watch'])
    assert 'history' not in shared
    assert 'uuid' not in shared
    assert not shared.get('last_checked')
    assert not shared.get('last_changed')
    assert not any(key.startswith('notification_') for key in shared)

    # A share server failure is reported as a gateway error, not a crash.
    def failing_request(**kwargs):
        raise OSError('no route to host')

    monkeypatch.setattr('requests.request', failing_request)
    response = client.post(f'/api/v2/watches/{uuid}/share', headers=headers)
    assert response.status_code == 502
    assert response.get_json()['code'] == 'share_failed'

    client.put(
        '/api/v2/settings',
        data=json.dumps({'ui': {'use_share_watch': False}}),
        headers=headers,
    )
    datastore.delete(uuid)


def test_v2_watch_pagination(client, live_server):
    datastore = live_server.app.config['DATASTORE']
    for index in range(3):
        datastore.add_watch(
            url=f'https://example.com/page-{index}',
            extras={'title': f'Page {index}', 'paused': True},
        )

    first = client.get('/api/v2/watches?per_page=2&page=1').get_json()
    assert first['total'] == 3
    assert first['total_pages'] == 2
    assert first['page'] == 1
    assert len(first['items']) == 2

    second = client.get('/api/v2/watches?per_page=2&page=2').get_json()
    assert second['page'] == 2
    assert len(second['items']) == 1

    # A page past the end returns the last page, never a misleading empty list.
    clamped = client.get('/api/v2/watches?per_page=2&page=99').get_json()
    assert clamped['page'] == 2
    assert len(clamped['items']) == 1

    for uuid in list(datastore.data['watching']):
        datastore.delete(uuid)
