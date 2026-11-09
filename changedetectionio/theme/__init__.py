"""fork-ui: an overlay theme for the stock UI. See README.md in this directory.

Everything here is additive: upstream templates/CSS/JS are untouched. `install(app)` is the only
entry point (one call in flask_app.py), skipped when CDIO_CLASSIC_UI=1.
"""
import os
from pathlib import Path

from jinja2 import ChoiceLoader, FileSystemLoader

TEMPLATES = Path(__file__).parent / 'templates'


def install(app):
    # Our templates win over upstream's, including blueprint templates: Flask's
    # DispatchingJinjaLoader asks app.jinja_loader before any blueprint loader.
    app.jinja_loader = ChoiceLoader([FileSystemLoader(str(TEMPLATES)), app.jinja_loader])

    # theme.css is linked from the <head> hook so base.html does not need overriding. The hook
    # output lands after styles.css / diff.css, so the theme wins on equal specificity.
    upstream_head_extras = app.jinja_env.globals['get_html_head_extras']

    def head_extras():
        from flask import url_for

        def asset(name):
            return url_for('static_content', group='theme', filename=name, v=_asset_version(name))

        out = (
            # viewport-fit=cover makes env(safe-area-inset-*) real on notched phones. base.html's own
            # viewport meta comes first; the later one wins.
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
            f'<link rel="stylesheet" id="fork-ui-theme" href="{asset("theme.css")}">'
        )
        out += _mobile_chrome(asset('mobile.js'))
        return out + (upstream_head_extras() or '')
    app.jinja_env.globals['get_html_head_extras'] = head_extras

    _accessible_badge_colors()


def _asset_version(name):
    # Cache-buster so a rebuilt theme asset is picked up without a restart.
    try:
        return int((Path(__file__).parent.parent / 'static' / 'theme' / name).stat().st_mtime)
    except OSError:
        return 0


# endpoint prefix -> (page title msgid, is a top-level destination: no back arrow)
_TITLES = (
    ('watchlist.', 'Page Watches', True),
    ('tags.tags_overview_page', 'Watch Groups', True),
    ('tags.', 'Watch Groups', False),
    ('imports.', 'Import', True),
    ('backups.', 'Backups', True),
    ('settings.notifications', 'Notifications', True),
    ('settings.', 'Settings', True),
    ('ui.ui_queue', 'Queue', True),
    ('ui.ui_edit', 'Edit', False),
    ('ui.ui_diff', 'History', False),
    ('ui.ui_preview', 'Preview', False),
    ('add_watch_ui.', 'Add a page watch', True),
)


def _mobile_chrome(script_url):
    """Mobile shell (top bar, bottom tab bar, sheets) as an inert <template> in <head>, so base.html
    needs no override: mobile.js clones it into the page. Rendered server side, so every label goes
    through gettext and plugin sidebar items appear in the More sheet."""
    import flask_login
    from flask import current_app, render_template, request
    from flask_babel import gettext

    from changedetectionio import processors

    datastore = current_app.config.get('DATASTORE')
    if datastore is None:
        return ''
    if datastore.data['settings']['application'].get('password') and not flask_login.current_user.is_authenticated:
        return ''  # login page: nothing to navigate to

    ep = request.endpoint or ''
    title, root = 'Change Detection', True
    for prefix, msgid, is_root in _TITLES:
        if ep.startswith(prefix):
            title, root = gettext(msgid), is_root
            break
    tags = sorted(t.get('title', '') for t in datastore.data['settings']['application'].get('tags', {}).values())
    html = render_template(
        '_cd_mobile.html',
        cd_ep=ep, cd_title=title, cd_root=root,
        cd_tags=[t for t in tags if t],
        cd_processors=processors.available_processors(),
        cd_default_processor=processors.get_default_processor(),
    )
    return f'<template id="cd-mobile-tpl">{html}</template><script src="{script_url}" defer></script>'


def _accessible_badge_colors():
    """Tag and processor badge colours come from processors.generate_processor_badge_colors(),
    which keeps each name's hue but pairs light-mode pastel/olive text (about 3:1 on yellow) and
    dark-mode white-on-bright-yellow (1.4:1). Same hue, readable pairs. Callers look the function
    up on the module at call time, so replacing the attribute is enough."""
    import re

    from changedetectionio import processors

    original = processors.generate_processor_badge_colors

    def accessible(name):
        colors = original(name)
        hue = re.search(r'hsl\((\d+),', colors['light']['bg']).group(1)
        colors['light']['color'] = f'hsl({hue}, 65%, 20%)'
        colors['dark'] = {'bg': f'hsl({hue}, 40%, 22%)', 'color': f'hsl({hue}, 80%, 88%)'}
        return colors

    processors.generate_processor_badge_colors = accessible
