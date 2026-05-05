/* AI Mastery — main.js */
'use strict';

// ── Dark mode icons ──────────────────────────────────────────────────────────
function syncThemeIcons() {
  var dark = document.documentElement.dataset.theme === 'dark';
  var moon = document.getElementById('icon-moon');
  var sun  = document.getElementById('icon-sun');
  if (moon) moon.style.display = dark ? 'none' : '';
  if (sun)  sun.style.display  = dark ? ''     : 'none';
}
function initThemeToggle() {
  syncThemeIcons();
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    syncThemeIcons();
  });
}

// ── Expand / collapse all ────────────────────────────────────────────────────
function initExpandButtons() {
  document.querySelectorAll('.expand-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var section = btn.closest('.qa-section');
      var items   = section ? section.querySelectorAll('.qa-item:not([hidden])') : [];
      var allOpen = Array.from(items).every(function (d) { return d.open; });
      items.forEach(function (d) { d.open = !allOpen; });
      btn.textContent = allOpen ? 'Expand all' : 'Collapse all';
    });
  });
}

// ── Within-topic filter ──────────────────────────────────────────────────────
function initTopicFilter() {
  var input   = document.getElementById('topic-filter');
  var counter = document.getElementById('filter-count');
  var noRes   = document.getElementById('filter-no-results');
  if (!input) return;

  var allItems    = Array.from(document.querySelectorAll('.qa-item'));
  var allSections = Array.from(document.querySelectorAll('.qa-section'));
  var total = allItems.length;

  if (counter) counter.textContent = total + ' questions';

  input.addEventListener('input', function () {
    var q = this.value.trim().toLowerCase();
    var visible = 0;

    allItems.forEach(function (item) {
      // Match against question text (first summary text node content)
      var text = item.querySelector('summary') ? item.querySelector('summary').textContent.toLowerCase() : '';
      var show = !q || text.indexOf(q) !== -1;
      item.hidden = !show;
      if (show) visible++;
    });

    // Hide sections that have no visible items
    allSections.forEach(function (sec) {
      var hasVisible = sec.querySelector('.qa-item:not([hidden])');
      sec.hidden = !hasVisible;
    });

    if (counter) counter.textContent = q ? (visible + ' of ' + total + ' questions') : (total + ' questions');
    if (noRes)   noRes.style.display  = (q && visible === 0) ? 'block' : 'none';
  });

  // Clear on Escape
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { this.value = ''; this.dispatchEvent(new Event('input')); this.blur(); }
  });
}

// ── TOC active link on scroll ─────────────────────────────────────────────────
function initTocObserver() {
  var tocLinks = document.querySelectorAll('.toc-list a');
  if (!tocLinks.length) return;
  var sections = Array.from(document.querySelectorAll('.qa-section[id]'));
  if (!sections.length || !window.IntersectionObserver) return;
  var offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h') || '52') + 8;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        tocLinks.forEach(function (a) { a.classList.toggle('toc-active', a.getAttribute('href') === '#' + id); });
      }
    });
  }, { rootMargin: '-' + offset + 'px 0px -65% 0px' });
  sections.forEach(function (s) { observer.observe(s); });
}

// ── Global search ────────────────────────────────────────────────────────────
var searchState = { index: null, loading: false };
function getRoot() { return document.body.dataset.root || ''; }
function escRe(s)  { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function makeSrItem(item, query, root) {
  var a = document.createElement('a');
  a.className = 'sr-item';
  a.href = root + item.url + '#' + item.anchor;
  var qDiv = document.createElement('div');
  qDiv.className = 'sr-q';
  if (query) {
    var re = new RegExp('(' + escRe(query) + ')', 'gi');
    var parts = item.q.split(re);
    parts.forEach(function (part) {
      if (part.toLowerCase() === query.toLowerCase()) {
        var m = document.createElement('mark'); m.textContent = part; qDiv.appendChild(m);
      } else { qDiv.appendChild(document.createTextNode(part)); }
    });
  } else { qDiv.textContent = item.q; }
  var metaDiv = document.createElement('div');
  metaDiv.className = 'sr-meta';
  metaDiv.textContent = item.course + ' › ' + item.section;
  a.appendChild(qDiv); a.appendChild(metaDiv);
  return a;
}

function loadSearchIndex(cb) {
  if (searchState.index) { cb(searchState.index); return; }
  if (searchState.loading) return;
  searchState.loading = true;
  fetch(getRoot() + 'assets/search-index.json')
    .then(function (r) { return r.json(); })
    .then(function (d) { searchState.index = d; searchState.loading = false; cb(d); })
    .catch(function ()  { searchState.index = []; searchState.loading = false; cb([]); });
}

function initSearch() {
  var input   = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  if (!input || !results) return;
  var focusIdx = -1;

  function clearResults() {
    while (results.firstChild) results.removeChild(results.firstChild);
    results.setAttribute('hidden', ''); focusIdx = -1;
  }
  function showResults(query) {
    var q = query.trim();
    if (q.length < 2) { clearResults(); return; }
    loadSearchIndex(function (index) {
      var ql   = q.toLowerCase();
      var hits = index.filter(function (item) {
        return item.q.toLowerCase().indexOf(ql) !== -1 || item.section.toLowerCase().indexOf(ql) !== -1;
      }).slice(0, 12);
      while (results.firstChild) results.removeChild(results.firstChild);
      if (!hits.length) {
        var empty = document.createElement('div'); empty.className = 'sr-empty';
        empty.textContent = 'No results for "' + q + '".'; results.appendChild(empty);
      } else {
        var root = getRoot();
        hits.forEach(function (item) { results.appendChild(makeSrItem(item, q, root)); });
      }
      results.removeAttribute('hidden'); focusIdx = -1;
    });
  }
  function moveFocus(dir) {
    var items = results.querySelectorAll('.sr-item'); if (!items.length) return;
    if (focusIdx >= 0) items[focusIdx].classList.remove('sr-focused');
    focusIdx = Math.max(0, Math.min(focusIdx + dir, items.length - 1));
    items[focusIdx].classList.add('sr-focused');
    items[focusIdx].scrollIntoView({ block: 'nearest' });
  }
  input.addEventListener('focus',   function ()  { loadSearchIndex(function () {}); });
  input.addEventListener('input',   function ()  { showResults(this.value); });
  input.addEventListener('keydown', function (e) {
    if      (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); }
    else if (e.key === 'Enter') {
      var items = results.querySelectorAll('.sr-item');
      if (focusIdx >= 0 && items[focusIdx]) { e.preventDefault(); window.location.href = items[focusIdx].href; }
    }
  });
  document.addEventListener('click', function (e) {
    if (!input.contains(e.target) && !results.contains(e.target)) clearResults();
  });
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
function initKeyboard() {
  document.addEventListener('keydown', function (e) {
    var tag     = document.activeElement ? document.activeElement.tagName : '';
    var inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    var search  = document.getElementById('search-input');
    var filter  = document.getElementById('topic-filter');

    // '/' → focus global search
    if (e.key === '/' && !inField) { e.preventDefault(); if (search) { search.focus(); search.select(); } }
    // 'f' → focus topic filter
    if (e.key === 'f' && !inField && filter) { e.preventDefault(); filter.focus(); filter.select(); }
    // Esc → close search results
    if (e.key === 'Escape') {
      var results = document.getElementById('search-results');
      if (results) results.setAttribute('hidden', '');
      if (search && document.activeElement === search) search.blur();
      if (filter && document.activeElement === filter) filter.blur();
    }
  });
}

// ── Sidebar arrow-key nav ────────────────────────────────────────────────────
function initSidebarNav() {
  var list = document.querySelector('.topic-list'); if (!list) return;
  var links = Array.from(list.querySelectorAll('a'));
  links.forEach(function (link, i) {
    link.addEventListener('keydown', function (e) {
      if      (e.key === 'ArrowDown' && links[i + 1]) { e.preventDefault(); links[i + 1].focus(); }
      else if (e.key === 'ArrowUp'   && links[i - 1]) { e.preventDefault(); links[i - 1].focus(); }
    });
  });
}

// ── Click-to-play YouTube inline embed ────────────────────────────────────────
function playVideo(thumbEl) {
  var card   = thumbEl.closest('.resource-card');
  var vid    = card ? card.dataset.vid : null;
  if (!vid) return;
  var iframe = document.createElement('iframe');
  iframe.src = 'https://www.youtube-nocookie.com/embed/' + vid + '?autoplay=1&rel=0&modestbranding=1';
  iframe.className = 'resource-iframe';
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
  iframe.setAttribute('loading', 'lazy');
  thumbEl.parentNode.replaceChild(iframe, thumbEl);
}

// ── Auth lock screen ─────────────────────────────────────────────────────────
function initAuth() {
  // Always restore the opacity hidden by the inline head script
  document.documentElement.style.opacity = '';

  if (sessionStorage.getItem('am_auth') === '1') return;

  // Build lock screen with DOM methods (no innerHTML on user-controlled strings)
  var screen = document.createElement('div');
  screen.id = 'lock-screen';
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', 'lock-title');

  var card = document.createElement('div');
  card.className = 'lock-card';

  var icon = document.createElement('div');
  icon.className = 'lock-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '🔐';

  var heading = document.createElement('h1');
  heading.id = 'lock-title';
  heading.className = 'lock-title';
  var strong = document.createElement('span');
  strong.textContent = 'AI Mastery';
  heading.appendChild(strong);

  var sub = document.createElement('p');
  sub.className = 'lock-sub';
  sub.textContent = 'Enter your access code to continue.';

  var form = document.createElement('form');
  form.id = 'lock-form';
  form.className = 'lock-form';
  form.setAttribute('autocomplete', 'off');

  var input = document.createElement('input');
  input.type = 'password';
  input.id = 'lock-input';
  input.className = 'lock-input';
  input.placeholder = 'Access code';
  input.setAttribute('autocomplete', 'current-password');
  input.setAttribute('aria-label', 'Access code');
  input.setAttribute('spellcheck', 'false');

  var btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'lock-btn';
  btn.textContent = 'Enter';

  var err = document.createElement('p');
  err.id = 'lock-error';
  err.className = 'lock-error';
  err.textContent = 'Incorrect code. Please try again.';
  err.setAttribute('role', 'alert');
  err.setAttribute('aria-live', 'assertive');

  form.appendChild(input);
  form.appendChild(btn);
  card.appendChild(icon);
  card.appendChild(heading);
  card.appendChild(sub);
  card.appendChild(form);
  card.appendChild(err);
  screen.appendChild(card);
  document.body.appendChild(screen);

  input.focus();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (input.value === 'ssr1995') {
      sessionStorage.setItem('am_auth', '1');
      screen.remove();
    } else {
      err.style.display = 'block';
      input.value = '';
      input.focus();
      card.classList.remove('lock-shake');
      // Re-trigger animation
      void card.offsetWidth;
      card.classList.add('lock-shake');
    }
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  initAuth();   // must run first — restores opacity and shows lock if needed
  initThemeToggle();
  initExpandButtons();
  initTopicFilter();
  initTocObserver();
  initSearch();
  initKeyboard();
  initSidebarNav();
});
