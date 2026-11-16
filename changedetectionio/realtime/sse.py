"""Server-Sent Events broker for the Pulse frontend.

One process-local broker fans blinker signals out to connected browsers. This is
additive: the existing Socket.IO implementation for the legacy UI stays exactly
as it is, and both can run at the same time.

Design notes:
- Event ids are monotonically increasing integers, so `Last-Event-ID` can replay
  a short window after a reconnect.
- Each subscriber has a bounded queue. A slow client is disconnected rather than
  growing memory; EventSource reconnects and resynchronises.
- Heartbeats keep proxies and browsers from treating the stream as idle.
- Payloads are deliberately small: identifiers plus the fields needed to patch a
  row. Diffs, screenshots and full snapshots are fetched only when a screen needs
  them.
"""

from __future__ import annotations

import json
import queue
import threading
import time
from collections import deque

from blinker import signal
from loguru import logger

from changedetectionio.api.v2.serializers import serialize_live_watch, stats_snapshot

MAX_HISTORY = 1000
SUBSCRIBER_QUEUE_SIZE = 256
HEARTBEAT_SECONDS = 15


class SSEBroker:
    def __init__(self, max_history: int = MAX_HISTORY):
        self._lock = threading.Lock()
        self._event_id = 0
        self._history = deque(maxlen=max_history)
        self._subscribers = set()
        self._overflowed = set()

    def configure(self, datastore, update_q):
        self.datastore = datastore
        self.update_q = update_q

    def publish(self, event_type: str, data: dict) -> int:
        with self._lock:
            self._event_id += 1
            event_id = self._event_id
            event = (event_id, event_type, data)
            self._history.append(event)
            subscribers = list(self._subscribers)

        for subscriber in subscribers:
            try:
                subscriber.put_nowait(event)
            except queue.Full:
                with self._lock:
                    self._overflowed.add(subscriber)
        return event_id

    def subscribe(self, last_event_id=None):
        subscriber = queue.Queue(maxsize=SUBSCRIBER_QUEUE_SIZE)
        with self._lock:
            replay = []
            gap = False
            if last_event_id is not None and self._history:
                oldest = self._history[0][0]
                if last_event_id < oldest - 1:
                    gap = True
                else:
                    replay = [event for event in self._history if event[0] > last_event_id]
            self._subscribers.add(subscriber)
            self._overflowed.discard(subscriber)
        return subscriber, replay, gap

    def unsubscribe(self, subscriber):
        with self._lock:
            self._subscribers.discard(subscriber)
            self._overflowed.discard(subscriber)

    def is_overflowed(self, subscriber) -> bool:
        with self._lock:
            return subscriber in self._overflowed

    @property
    def last_event_id(self) -> int:
        with self._lock:
            return self._event_id


broker = SSEBroker()


def format_event(event_id, event_type: str, data: dict) -> str:
    """Format one SSE frame. Control frames (hello/heartbeat/resync) pass
    event_id=None so they do not advance Last-Event-ID and cannot mask a gap."""
    payload = json.dumps(data, separators=(",", ":"), default=str)
    prefix = f"id: {event_id}\n" if event_id is not None else ''
    return f"{prefix}event: {event_type}\ndata: {payload}\n\n"


def _queue_snapshot(datastore, update_q):
    from changedetectionio import worker_pool

    running_uuids = worker_pool.get_running_uuids()
    running = []
    now = time.time()
    for uuid in running_uuids:
        watch = datastore.data['watching'].get(uuid)
        started = worker_pool.get_uuid_started_at(uuid)
        running.append(
            {
                'uuid': uuid,
                'title': watch.label if watch else None,
                'url': watch.get('url') if watch else None,
                'started_at': started,
                'running_seconds': round(now - started) if started else None,
            }
        )

    queued = []
    try:
        for entry in update_q.get_all_queued_uuids(limit=100).get('items', []):
            watch = datastore.data['watching'].get(entry['uuid'])
            queued.append(
                {
                    'uuid': entry['uuid'],
                    'position': entry.get('position'),
                    'priority': entry.get('priority'),
                    'title': watch.label if watch else None,
                    'url': watch.get('url') if watch else None,
                }
            )
    except Exception:
        logger.exception('SSE: could not snapshot queued items')

    return {
        'queue_size': update_q.qsize(),
        'checking_now': len(running_uuids),
        'running': running,
        'queued': queued,
    }


class SSEHandler:
    """Translate existing blinker signals into SSE events."""

    def __init__(self, event_broker: SSEBroker, datastore, update_q):
        self.broker = event_broker
        self.datastore = datastore
        self.update_q = update_q
        self._state = {}
        self._connect()

    def _connect(self):
        signal('watch_check_update').connect(self.on_watch_update, weak=False)
        signal('watch_deleted').connect(self.on_watch_deleted, weak=False)
        signal('watch_favicon_bump').connect(self.on_favicon, weak=False)
        signal('watch_small_status_comment').connect(self.on_watch_status, weak=False)
        signal('queue_length').connect(self.on_queue, weak=False)
        signal('notification_event').connect(self.on_notification_queued, weak=False)
        signal('notification_sent').connect(self.on_notification_sent, weak=False)
        signal('llm_summary_ready').connect(self.on_llm_summary, weak=False)
        signal('general_stats_update').connect(self.on_stats, weak=False)
        signal('watch_created').connect(self.on_watch_created, weak=False)
        signal('watch_updated').connect(self.on_watch_updated, weak=False)
        signal('watch_queued').connect(self.on_watch_queued, weak=False)
        signal('group_created').connect(self.on_group_created, weak=False)
        signal('group_updated').connect(self.on_group_updated, weak=False)
        signal('group_deleted').connect(self.on_group_deleted, weak=False)

    # -- helpers ---------------------------------------------------------
    def _watch(self, uuid):
        return self.datastore.data['watching'].get(uuid) if uuid else None

    def _publish_watch(self, uuid, *, check_event=None):
        watch = self._watch(uuid)
        if not watch:
            return
        from changedetectionio import worker_pool

        queued_uuids = self.update_q.get_queued_uuids()
        running_uuids = worker_pool.get_running_uuids()
        payload = serialize_live_watch(
            self.datastore,
            watch,
            queued_uuids=queued_uuids,
            running_uuids=running_uuids,
        )
        self.broker.publish('watch.updated', {'uuid': uuid, 'watch': payload})

        previous = self._state.setdefault(uuid, {})
        previous_checking = previous.get('checking', False)
        checking = payload['checking_now']
        last_changed = payload['last_changed']
        had_error = payload['last_error']

        if check_event == 'started' or (checking and not previous_checking):
            self.broker.publish(
                'watch.check_started',
                {'uuid': uuid, 'started_at': int(time.time())},
            )
        if check_event == 'finished' or (previous_checking and not checking):
            self.broker.publish(
                'watch.check_finished',
                {
                    'uuid': uuid,
                    'last_checked': payload['last_checked'],
                    'last_changed': last_changed,
                    'history_n': payload['history_n'],
                    'fetch_time': payload['fetch_time'],
                    'has_error': had_error,
                    'error_text': payload['error_text'],
                },
            )

        if previous.get('last_changed') is not None and last_changed > previous['last_changed']:
            self.broker.publish(
                'watch.change_detected',
                {
                    'uuid': uuid,
                    'last_changed': last_changed,
                    'history_n': payload['history_n'],
                },
            )
        if had_error and not previous.get('had_error', False):
            self.broker.publish(
                'watch.error',
                {'uuid': uuid, 'error_text': payload['error_text']},
            )

        previous.update(
            {
                'checking': checking,
                'last_changed': last_changed,
                'had_error': had_error,
            }
        )

    def _publish_stats(self):
        try:
            self.broker.publish('stats.updated', stats_snapshot(self.datastore, self.update_q))
        except Exception:
            logger.exception('SSE: could not publish stats')

    # -- signal handlers --------------------------------------------------
    def on_watch_update(self, sender=None, **kwargs):
        try:
            self._publish_watch(kwargs.get('watch_uuid'))
            self._publish_stats()
        except Exception:
            logger.exception('SSE: watch update failed')

    def on_watch_created(self, sender=None, **kwargs):
        try:
            uuid = kwargs.get('watch_uuid') or kwargs.get('uuid')
            watch = self._watch(uuid)
            if watch:
                from changedetectionio import worker_pool

                payload = serialize_live_watch(
                    self.datastore,
                    watch,
                    queued_uuids=self.update_q.get_queued_uuids(),
                    running_uuids=worker_pool.get_running_uuids(),
                )
                self.broker.publish('watch.created', {'uuid': uuid, 'watch': payload})
            self._publish_stats()
        except Exception:
            logger.exception('SSE: watch.created failed')

    def on_watch_updated(self, sender=None, **kwargs):
        try:
            uuid = kwargs.get('watch_uuid') or kwargs.get('uuid')
            self._publish_watch(uuid)
            self._publish_stats()
        except Exception:
            logger.exception('SSE: watch.updated failed')

    def on_watch_deleted(self, sender=None, **kwargs):
        uuid = kwargs.get('watch_uuid') or kwargs.get('uuid')
        if not uuid:
            return
        self._state.pop(uuid, None)
        self.broker.publish('watch.deleted', {'uuid': uuid})
        self._publish_stats()

    def on_watch_queued(self, sender=None, **kwargs):
        uuid = kwargs.get('watch_uuid') or kwargs.get('uuid')
        if not uuid:
            return
        position = None
        try:
            position = self.update_q.get_uuid_position(uuid)
        except Exception:
            pass
        self.broker.publish('watch.queued', {'uuid': uuid, 'position': position})
        self.on_queue(sender, length=self.update_q.qsize())

    def on_watch_status(self, sender=None, **kwargs):
        uuid = kwargs.get('watch_uuid')
        status = kwargs.get('status')
        if uuid and status is not None:
            self.broker.publish('watch.status', {'uuid': uuid, 'status': status})

    def on_favicon(self, sender=None, **kwargs):
        uuid = kwargs.get('watch_uuid')
        if uuid:
            self.broker.publish('favicon.updated', {'uuid': uuid})

    def on_queue(self, sender=None, **kwargs):
        try:
            snapshot = _queue_snapshot(self.datastore, self.update_q)
            self.broker.publish('queue.updated', snapshot)
        except Exception:
            logger.exception('SSE: queue update failed')

    def on_notification_queued(self, sender=None, **kwargs):
        self.broker.publish(
            'notification.queued',
            {
                'uuid': kwargs.get('watch_uuid'),
                'timestamp': int(time.time()),
            },
        )

    def on_notification_sent(self, sender=None, **kwargs):
        self.broker.publish(
            'notification.sent',
            {
                'uuid': kwargs.get('watch_uuid'),
                'error': kwargs.get('error'),
                'timestamp': int(time.time()),
            },
        )

    def on_llm_summary(self, sender=None, **kwargs):
        self.broker.publish(
            'llm.summary_ready',
            {
                'uuid': kwargs.get('watch_uuid'),
                'from_version': kwargs.get('from_version'),
                'to_version': kwargs.get('to_version'),
            },
        )

    def on_stats(self, sender=None, **kwargs):
        self._publish_stats()

    def on_group_created(self, sender=None, **kwargs):
        self.broker.publish('group.created', {'uuid': kwargs.get('uuid')})

    def on_group_updated(self, sender=None, **kwargs):
        self.broker.publish('group.updated', {'uuid': kwargs.get('uuid')})

    def on_group_deleted(self, sender=None, **kwargs):
        self.broker.publish('group.deleted', {'uuid': kwargs.get('uuid')})


def init_sse(app, datastore, update_q):
    """Wire the broker and signal handlers to a Flask app instance.

    Called once from ``changedetection_app()``. Keeping the handler on
    ``app.extensions`` means a second app instance (tests, batch mode) gets its
    own subscriptions instead of receiving events for a datastore it no longer
    owns.
    """
    broker.configure(datastore, update_q)
    handler = SSEHandler(broker, datastore, update_q)
    app.extensions['pulse_sse'] = handler
    return broker
