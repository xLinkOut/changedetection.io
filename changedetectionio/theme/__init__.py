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
        link = '<link rel="stylesheet" id="fork-ui-theme" href="%s">' % url_for(
            'static_content', group='theme', filename='theme.css', v=_css_version())
        return link + (upstream_head_extras() or '')

    app.jinja_env.globals['get_html_head_extras'] = head_extras


def _css_version():
    # Revalidating cache-buster so a rebuilt theme.css is picked up without a restart.
    try:
        return int((Path(__file__).parent.parent / 'static' / 'theme' / 'theme.css').stat().st_mtime)
    except OSError:
        return 0
