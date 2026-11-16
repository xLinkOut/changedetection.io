"""Serve the Pulse SPA shell and its built assets.

The shell contains no watch data, so it is served to anonymous visitors; every
piece of data goes through `/api/v2`, which enforces the session. The built
files are committed under `changedetectionio/static/pulse/`, so production
never needs Node.js.
"""

from __future__ import annotations

import json
import os

from flask import (
    Blueprint,
    current_app,
    make_response,
    render_template,
    request,
    send_from_directory,
)
from loguru import logger


def _manifest_assets():
    """Return (entry_js, entry_css) from the Vite manifest, or (None, None)."""
    manifest_path = os.path.join(current_app.static_folder, 'pulse', 'manifest.json')
    if not os.path.isfile(manifest_path):
        return None, None

    try:
        with open(manifest_path, encoding='utf-8') as handle:
            manifest = json.load(handle)
    except (OSError, ValueError) as error:
        logger.error(f'Pulse: could not read {manifest_path}: {error}')
        return None, None

    entry = manifest.get('index.html')
    if entry is None:
        entry = next(
            (value for value in manifest.values() if value.get('isEntry')),
            None,
        )
    if entry is None:
        return None, None

    js = entry.get('file')
    css = entry.get('css') or []
    return js, css


def construct_blueprint():
    pulse_ui = Blueprint('pulse_ui', __name__, template_folder='templates')

    @pulse_ui.route('/assets/<path:filename>', methods=['GET'])
    def asset(filename):
        directory = os.path.join(current_app.static_folder, 'pulse', 'assets')
        response = send_from_directory(directory, filename)
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
        return response

    @pulse_ui.route('/', methods=['GET'])
    @pulse_ui.route('/<path:path>', methods=['GET'])
    def index(path=''):
        # A request for an asset that Vite placed outside /assets still needs to
        # resolve, but SPA routes must fall through to the shell.
        if path and path.startswith('assets/'):
            return asset(path[len('assets/'):])

        entry_js, entry_css = _manifest_assets()
        built = bool(entry_js)

        response = make_response(
            render_template(
                'pulse_ui/index.html',
                entry_js=entry_js,
                entry_css=entry_css or [],
                built=built,
                script_root=request.script_root or '',
            )
        )
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    return pulse_ui
