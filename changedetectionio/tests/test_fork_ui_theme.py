#!/usr/bin/env python3
# Fork-only: the overlay theme in changedetectionio/theme (see theme/README.md)

import os
import subprocess
import sys
from pathlib import Path

from flask import url_for


def test_theme_is_linked_and_overrides_blueprint_template(client, live_server, measure_memory_usage, datastore_path):
    from changedetectionio.flask_app import app

    res = client.get(url_for("watchlist.index"), follow_redirects=True)
    assert b'id="fork-ui-theme"' in res.data
    assert b'/static/theme/theme.css' in res.data
    # only the theme's copy of blueprint/watchlist/templates/watch-overview.html has the search form
    assert b'id="watch-list-search"' in res.data

    # app-level theme loader wins over the blueprint's template of the same name
    _, filename, _ = app.jinja_env.loader.get_source(app.jinja_env, 'watch-overview.html')
    assert os.path.join('theme', 'templates') in filename

    # mobile shell: inert template in <head> (cloned by static/theme/mobile.js), More sheet carries the nav targets
    assert b'<template id="cd-mobile-tpl">' in res.data
    assert b'viewport-fit=cover' in res.data
    assert url_for('settings.settings_page').encode() in res.data
    assert b'id="cd-add-form"' in res.data and b'name="watch_submit_button"' in res.data
    assert client.get(url_for('static_content', group='theme', filename='mobile.js')).status_code == 200

    css = client.get(url_for('static_content', group='theme', filename='theme.css'))
    assert css.status_code == 200
    assert b'--cd-accent' in css.data


def test_classic_ui_switch_disables_theme():
    code = (
        "from changedetectionio.flask_app import app\n"
        "with app.test_request_context('/'):\n"
        "    head = app.jinja_env.globals['get_html_head_extras']()\n"
        "    assert 'fork-ui-theme' not in head, head\n"
        "def paths(l):\n"
        "    return list(getattr(l, 'searchpath', [])) + [p for x in getattr(l, 'loaders', []) for p in paths(x)]\n"
        "assert not [p for p in paths(app.jinja_loader) if p.endswith('theme/templates')], paths(app.jinja_loader)\n"
        "print('classic-ok')\n"
    )
    out = subprocess.run([sys.executable, '-c', code], capture_output=True, text=True,
                         env={**os.environ, 'CDIO_CLASSIC_UI': '1'},
                         cwd=Path(__file__).resolve().parents[2])
    assert 'classic-ok' in out.stdout, out.stdout + out.stderr
