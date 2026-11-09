/*
 * fork-ui mobile shell. Vanilla JS, no dependencies.
 *
 * theme/__init__.py ships the shell (top bar, tab bar, sheets) as an inert <template id="cd-mobile-tpl">;
 * this script clones it into the page. theme.css only shows it below the upstream hamburger breakpoint,
 * so on desktop all of this is dead weight in the DOM and nothing else.
 *
 * Everything that changes state goes through upstream's own buttons/links/handlers (ajax-op buttons,
 * data-requires-confirm anchors, the bulk bar, #check-cancel ...) - nothing here talks to the server
 * except two GETs: the quick-add form post and /uuids?unread=1 for "next unread".
 */
(function () {
    'use strict';

    var tpl = document.getElementById('cd-mobile-tpl');
    if (!tpl) return;

    var qs = function (s, r) { return (r || document).querySelector(s); };
    var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var narrowList = window.matchMedia('(max-width: 767px)');
    var nav = window.matchMedia('(max-width: 980px)');

    // ---- inject the shell ---------------------------------------------------------------
    var frag = tpl.content.cloneNode(true);
    var topbar = qs('.cd-topbar', frag);
    var appMain = qs('.app-main');
    if (appMain) appMain.insertBefore(topbar, appMain.firstChild);
    else document.body.insertBefore(topbar, document.body.firstChild);
    document.body.appendChild(frag);
    document.body.classList.add('cd-shell');

    var ep = topbar.getAttribute('data-cd-ep') || '';
    var isRoot = topbar.getAttribute('data-cd-root') === '1';
    var titleEl = qs('.cd-title', topbar);

    // queue badge: realtime.js rewrites the text, we only hide it while there is nothing queued
    qsa('.cd-tab-badge--quiet').forEach(function (b) {
        new MutationObserver(function () { b.hidden = !b.textContent.trim() || b.textContent.trim() === '0'; })
            .observe(b, {childList: true, characterData: true, subtree: true});
    });

    // ---- title + back ------------------------------------------------------------------
    (function () {
        var diffUrl = qs('.current-diff-url span');
        if (diffUrl && diffUrl.textContent.trim()) {
            titleEl.textContent = diffUrl.textContent.trim();
        } else if (ep.indexOf('ui.ui_edit') === 0) {
            var t = qs('#title'), u = qs('#url');
            var v = (t && t.value.trim()) || (u && u.value.trim().replace(/^https?:\/\/(www\.)?/, ''));
            if (v) titleEl.textContent = v;
        }
        if (!isRoot) {
            document.body.classList.add('cd-nonroot');
            var back = qs('.cd-back', topbar);
            back.hidden = false;
            back.addEventListener('click', function (e) {
                var sameOrigin = document.referrer && document.referrer.indexOf(location.origin) === 0;
                if (sameOrigin && history.length > 1) { e.preventDefault(); history.back(); }
            });
        }
    })();

    // ---- search -----------------------------------------------------------------------
    (function () {
        var form = qs('.cd-search', topbar), toggle = qs('.cd-search-toggle', topbar), input = qs('input', form);
        var tag = new URLSearchParams(location.search).get('tag');
        if (tag) {
            var h = document.createElement('input');
            h.type = 'hidden'; h.name = 'tag'; h.value = tag;
            form.appendChild(h);
        }
        var q = new URLSearchParams(location.search).get('q');
        if (q) input.value = q;
        function set(open) {
            topbar.classList.toggle('cd-searching', open);
            form.hidden = !open;
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) input.focus();
        }
        toggle.addEventListener('click', function () { set(!topbar.classList.contains('cd-searching')); });
        input.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
        if (q) set(true);
    })();

    // ---- select mode (watch list) ------------------------------------------------------
    var selectMode = false;
    (function () {
        var btn = qs('.cd-select-toggle', topbar);
        if (!document.body.classList.contains('blueprint-watchlist') || !qs('#watch-list-form')) return;
        btn.hidden = false;
        btn.addEventListener('click', function () {
            selectMode = !selectMode;
            document.body.classList.toggle('cd-select-mode', selectMode);
            btn.textContent = selectMode ? btn.getAttribute('data-done') : btn.getAttribute('data-select');
            btn.setAttribute('aria-pressed', selectMode ? 'true' : 'false');
            if (!selectMode) { var c = qs('#check-cancel'); if (c && c.offsetParent !== null) c.click(); }
        });
    })();

    // ---- sheets (native <dialog>: focus trap, ESC and the Android back gesture come for free) -------
    function openSheet(d) {
        if (!d || d.open) return;
        d.showModal();
    }
    document.addEventListener('click', function (e) {
        var o = e.target.closest && e.target.closest('[data-cd-open]');
        if (o) { e.preventDefault(); openSheet(qs(o.getAttribute('data-cd-open'))); return; }
        var c = e.target.closest && e.target.closest('[data-cd-close]');
        if (c) { var d = c.closest('dialog'); if (d) d.close(); return; }
        // click on the backdrop = the dialog element itself
        if (e.target.tagName === 'DIALOG' && e.target.classList.contains('cd-sheet')) {
            var r = e.target.getBoundingClientRect();
            if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) e.target.close();
        }
        var add = e.target.closest && e.target.closest('.js-add-watch');
        if (add) {
            e.preventDefault();
            if (nav.matches) openSheet(qs('#cd-add-sheet'));
            else { var u = qs('#url'); if (u) { u.focus(); u.scrollIntoView({block: 'center'}); } }
        }
    });
    // any link inside a sheet leaves the page: close first so the dialog is not restored from bfcache
    qsa('dialog.cd-sheet').forEach(function (d) {
        d.addEventListener('click', function (e) { if (e.target.closest('a[href]')) d.close(); });
    });

    // ---- add sheet ---------------------------------------------------------------------
    (function () {
        var sheet = qs('#cd-add-sheet'), form = qs('#cd-add-form'), url = qs('#cd-add-url');
        var paste = qs('.cd-paste', form);
        sheet.addEventListener('toggle', function () { /* no-op: keeps Safari from caching state */ });
        new MutationObserver(function () {
            if (sheet.open) setTimeout(function () { url.focus(); }, 60);
        }).observe(sheet, {attributes: true, attributeFilter: ['open']});
        if (navigator.clipboard && navigator.clipboard.readText && window.isSecureContext) {
            paste.hidden = false;
            paste.addEventListener('click', function () {
                navigator.clipboard.readText().then(function (t) { if (t) { url.value = t.trim(); url.focus(); } }).catch(function () {});
            });
        }
        form.addEventListener('submit', function (e) {
            var v = url.value.trim();
            if (!v) { e.preventDefault(); url.focus(); url.setAttribute('aria-invalid', 'true'); return; }
            // same as watch-overview.js does for the inline form
            if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(v)) v = 'https://' + v;
            url.value = v;
            qsa('button[type=submit]', form).forEach(function (b) { setTimeout(function () { b.disabled = true; }, 0); });
        });
    })();

    // ---- row tap + action sheet (watch list, narrow screens) -------------------------------
    (function () {
        var table = qs('table.watch-table');
        var sheet = qs('#cd-row-sheet');
        if (!table || !sheet) return;
        var list = qs('.cd-row-actions', sheet);
        var tbody = qs('tbody', table);

        function primaryLink(tr) {
            if (tr.classList.contains('multiple-history')) return qs('a.history-link', tr);
            if (tr.classList.contains('single-history')) return qs('a.preview-link', tr);
            return null;
        }
        function go(a) { tr_unread_clear(a); window.location.href = a.href; }
        function tr_unread_clear(a) { var tr = a.closest('tr'); if (tr) tr.classList.remove('unviewed'); }

        // capture phase + stopPropagation: upstream binds a jQuery click on every row that toggles the checkbox
        tbody.addEventListener('click', function (e) {
            if (!narrowList.matches) return;
            var tr = e.target.closest('tr[data-watch-uuid]');
            if (!tr) return;
            if (e.target.closest('.cd-more-btn')) { e.stopPropagation(); openRowSheet(tr); return; }
            if (e.target.closest('input, button, label, summary')) return;
            var a = e.target.closest('a');
            if (a && !a.closest('.favicon')) return;   // tags etc keep their own behaviour
            e.preventDefault();
            e.stopPropagation();
            if (selectMode) {
                var cb = qs('input[name="uuids"]', tr);
                if (cb) cb.dispatchEvent(new MouseEvent('click', {bubbles: true}));
                return;
            }
            var p = primaryLink(tr);
            if (p) go(p); else openRowSheet(tr);
        }, true);

        function item(icon, label, fn, cls) {
            var li = document.createElement('li');
            var b = document.createElement('button');
            b.type = 'button';
            if (cls) b.className = cls;
            b.innerHTML = '<i data-feather="' + icon + '"></i>';
            b.appendChild(document.createTextNode(label));
            b.addEventListener('click', function () { sheet.close(); fn(); });
            li.appendChild(b);
            list.appendChild(li);
        }
        function text(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

        function openRowSheet(tr) {
            var uuid = tr.getAttribute('data-watch-uuid');
            list.innerHTML = '';
            qs('#cd-row-sheet-title', sheet).textContent = text(qs('.watch-title-text', tr));
            qs('.cd-row-sheet-host', sheet).textContent = text(qs('.watch-host', tr));

            var p = primaryLink(tr);
            if (p) {
                var lbl = tr.classList.contains('multiple-history') ? text(qs('.btn-label-history', p)) : text(p);
                item('clock', lbl || text(p), function () { go(p); }, 'is-primary');
            }
            var rc = qs('button.recheck', tr);
            if (rc) item('refresh-cw', text(rc), function () { rc.click(); });
            var ed = qs('td.buttons a[href*="/edit/"]', tr);
            if (ed) item('edit-2', text(ed), function () { window.location.href = ed.href; });
            var pause = qs(tr.classList.contains('paused') ? '.pause-toggle.state-on' : '.pause-toggle.state-off', tr);
            if (pause) item(tr.classList.contains('paused') ? 'play' : 'pause', pause.getAttribute('aria-label') || '', function () { pause.click(); });
            var mute = qs(tr.classList.contains('notification_muted') ? '.mute-toggle.state-on' : '.mute-toggle.state-off', tr);
            if (mute) item(tr.classList.contains('notification_muted') ? 'bell' : 'bell-off', mute.getAttribute('aria-label') || '', function () { mute.click(); });
            var ext = qs('a.external', tr);
            if (ext) item('external-link', sheet.getAttribute('data-l-open'), function () { window.open(ext.href, '_blank', 'noopener'); });

            item('trash-2', sheet.getAttribute('data-l-delete'), function () {
                // upstream's data-requires-confirm handler (modal.js) shows the confirm and POSTs with the CSRF token
                var a = document.createElement('a');
                a.href = sheet.getAttribute('data-delete-url').replace(sheet.getAttribute('data-zero-uuid'), uuid);
                a.hidden = true;
                a.setAttribute('data-method', 'POST');
                a.setAttribute('data-requires-confirm', '');
                a.setAttribute('data-confirm-type', 'danger');
                a.setAttribute('data-confirm-title', sheet.getAttribute('data-confirm-title'));
                a.setAttribute('data-confirm-message', '<p>' + sheet.getAttribute('data-confirm-lead') + '</p><p><strong></strong></p><p>' + sheet.getAttribute('data-confirm-tail') + '</p>');
                var name = document.createElement('div'); name.textContent = text(qs('.watch-title-text', tr));
                a.setAttribute('data-confirm-message', a.getAttribute('data-confirm-message').replace('<strong></strong>', '<strong>' + name.innerHTML + '</strong>'));
                a.setAttribute('data-confirm-button', sheet.getAttribute('data-confirm-button'));
                document.body.appendChild(a);
                a.click();
                a.remove();
            }, 'is-danger');
            if (window.feather) window.feather.replace();
            openSheet(sheet);
        }
    })();

    // ---- tab strips: keep the active tab in view -------------------------------------------
    qsa('.tabs ul').forEach(function (ul) {
        function reveal() {
            var li = qs('li.active', ul);
            if (li && ul.scrollWidth > ul.clientWidth) ul.scrollTo({left: li.offsetLeft - (ul.clientWidth - li.offsetWidth) / 2, behavior: 'auto'});
        }
        new MutationObserver(reveal).observe(ul, {subtree: true, attributes: true, attributeFilter: ['class']});
        window.addEventListener('load', reveal);
        window.addEventListener('hashchange', function () { setTimeout(reveal, 0); });
        reveal();
    });

    // ---- diff page: one "compare" line instead of two stacked pickers --------------------------------
    (function () {
        var head = qs('#diff-header'), from = qs('#diff-from-version'), to = qs('#diff-to-version');
        if (!head || !from || !to) return;
        function short(sel) {
            var o = sel.options[sel.selectedIndex];
            var ts = o && parseInt(o.value, 10);
            if (!ts) return o ? o.text.trim() : '';
            return new Date(ts * 1000).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
        }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cd-compare';
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', topbar.getAttribute('data-l-compare'));
        function paint() { btn.innerHTML = ''; btn.appendChild(document.createTextNode(short(from) + '  \u2192  ' + short(to))); var i = document.createElement('i'); i.setAttribute('data-feather', 'chevron-down'); btn.appendChild(i); if (window.feather) window.feather.replace(); }
        paint();
        btn.addEventListener('click', function () {
            var open = head.classList.toggle('cd-compare-open');
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        head.classList.add('cd-compare-js');
        head.insertBefore(btn, head.firstChild);
    })();

    // ---- diff page: back to the list / next unread ------------------------------------------
    (function () {
        if (ep.indexOf('ui.ui_diff') !== 0 && ep.indexOf('ui.ui_preview') !== 0) return;
        var m = location.pathname.match(/\/(?:diff|preview)\/([0-9a-f-]{36})/i);
        if (!m) return;
        var uuid = m[1];
        var bar = document.createElement('div');
        bar.className = 'cd-diff-bar';
        var list = document.createElement('a');
        list.className = 'pure-button';
        list.href = topbar.getAttribute('data-list-url');
        list.textContent = topbar.getAttribute('data-l-list');
        bar.appendChild(list);
        document.body.appendChild(bar);
        document.body.classList.add('cd-has-diff-bar');
        fetch(topbar.getAttribute('data-uuids-url') + '?unread=1', {credentials: 'same-origin'})
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) {
                if (!j || !j.uuids) return;
                var others = j.uuids.map(function (u) { return String(u).trim(); }).filter(function (u) { return u && u !== uuid; });
                if (!others.length) return;
                var next = document.createElement('a');
                next.className = 'pure-button pure-button-primary';
                next.href = topbar.getAttribute('data-diff-url').replace(topbar.getAttribute('data-zero-uuid'), others[0]);
                next.textContent = topbar.getAttribute('data-l-next') + ' (' + others.length + ')';
                bar.appendChild(next);
            }).catch(function () {});
    })();

    // ---- chrome colour follows the app theme (cookie-driven, not only prefers-color-scheme) ------
    function syncThemeColor() {
        var c = getComputedStyle(topbar).backgroundColor;
        if (!c || c === 'rgba(0, 0, 0, 0)') return;
        qsa('meta[name="theme-color"]').forEach(function (m) { m.remove(); });
        var m = document.createElement('meta');
        m.name = 'theme-color'; m.content = c;
        document.head.appendChild(m);
    }
    new MutationObserver(syncThemeColor).observe(document.documentElement, {attributes: true, attributeFilter: ['data-darkmode']});
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeColor);
    window.addEventListener('load', syncThemeColor);
})();
