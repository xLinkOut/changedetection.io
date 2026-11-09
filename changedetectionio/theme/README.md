# fork-ui: overlay theme

A restyle of the stock UI that lives entirely in new files, so `git rebase upstream/master` stays cheap.

- `__init__.py` - `install(app)`: prepends `theme/templates` to the Jinja loader (wins over app *and* blueprint
  templates of the same name), links `static/theme/theme.css` through the `get_html_head_extras` hook (after
  upstream's `styles.css`), and swaps the tag/processor badge colour generator for AA-contrast pairs.
  Called from one `# fork-ui:` block in `flask_app.py` (the only edit to an upstream .py file) and skipped when
  `CDIO_CLASSIC_UI=1`.
- `scss/` - sources. `_tokens.scss` defines `--cd-*` tokens (light + dark via upstream's `data-darkmode`) and remaps
  upstream's ~400 `--color-*` variables onto them; the other partials are component rules layered on `styles.css`.
- `templates/` - overrides, same filename as the upstream template. Each one is listed in `overrides.txt`.
- `../static/theme/theme.css` - compiled output, committed (like upstream's `styles.css`).

## Build the CSS

    npx sass@1 changedetectionio/theme/scss/theme.scss changedetectionio/static/theme/theme.css --style=compressed --no-source-map

(any sass >= 1.77, e.g. `changedetectionio/static/styles/node_modules/.bin/sass`)

## Syncing with upstream

    git fetch upstream && git rebase upstream/master     # no conflicts expected: we only add files
    changedetectionio/theme/check-drift.sh               # prints the upstream diff of every overridden template that changed
    # port each diff into changedetectionio/theme/templates/<same file>, then:
    changedetectionio/theme/check-drift.sh --update <path as printed in overrides.txt>
    # rebuild the CSS (above), eyeball the pages, run the tests
    pytest changedetectionio/tests/test_fork_ui_theme.py  # plus whatever upstream CI runs

Upstream renames of CSS classes/ids silently un-style things (no drift signal for CSS): compare against
`CDIO_CLASSIC_UI=1` when in doubt, and grep `scss/` for the selector that changed.

## Compare with the original UI

    CDIO_CLASSIC_UI=1 python changedetection.py -d ./datastore

## Rules of thumb

- Re-theme through tokens first, component rules second, template overrides last.
- Keep every `id`/class/`data-*` the upstream JS uses (`static/js`) and every `_()` string in overridden templates.
- `!important` only against upstream inline styles or `!important`.
