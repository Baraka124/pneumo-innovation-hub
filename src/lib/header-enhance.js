/* neumACt R&I — Header Enhancements (shared)
 * - Sliding active/hover pill under the primary nav
 * - Language choice persisted in localStorage + smooth crossfade
 * - Scrolled-state class + scroll-direction hide/reveal on the header
 * Loaded on every page; all guards are null-safe so a missing element
 * never throws.
 * Note: progress-bar (#pb) and back-to-top (#scrollTop) are NOT
 * handled here -- each page already has its own inline implementation
 * of both. This file used to also create its own duplicate, invisible
 * versions of each via injected DOM elements, which meant every page
 * was running two complete, independent scroll-progress systems and
 * two back-to-top buttons at once. Removed; see commit history. */
(function(){
  'use strict';

  /* ── 1. Language: persist + crossfade ─────────────────────────── */
  // Wrap the page's existing selectLang (set by inline script) so we add
  // persistence and a crossfade without losing the original behaviour.
  function syncLangSwitch(lang){
    // .lang-opt is now a role="radio" pair inside a radiogroup, not a
    // plain toggle-button pair — aria-checked (not aria-pressed) is
    // the correct state attribute, and tabindex must follow selection
    // (roving tabindex: only the checked option is in the Tab order;
    // the other is reached via arrow keys, per initLangRovingTabindex
    // below). Both attributes are kept in sync here so a language
    // change from *any* source — header click, drawer click,
    // restoreLang() on load — leaves the control in a consistent,
    // correctly-announced state.
    document.querySelectorAll('.lang-opt').forEach(function(b){
      var on = b.dataset.lang === lang;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    // The mobile drawer's language buttons (.lt-btn) are now also a
    // role="radio" pair (aria-checked, matching the desktop switch's
    // semantics — they used to be aria-pressed, an inconsistency
    // between the two controls). Kept in sync here too so both stay
    // correct regardless of which one the user operates.
    document.querySelectorAll('.lt-btn').forEach(function(b){
      var on = b.dataset.lang === lang;
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('lt-btn--active', on);
    });
  }
  function applyLangCrossfade(lang){
    var root = document.documentElement;
    root.style.transition = 'opacity .18s ease';
    root.style.opacity = '0.6';
    setTimeout(function(){
      root.dataset.lang = lang;
      root.lang = (lang === 'es') ? 'es' : 'en';
      syncLangSwitch(lang);
      try { localStorage.setItem('lang', lang); } catch(e){}
      root.style.opacity = '1';
    }, 120);
  }
  /* lang handling owned by Header (with crossfade) */

  // On load, restore saved language (default en)
  function restoreLang(){
    var saved = 'en';
    try { saved = localStorage.getItem('lang') || 'en'; } catch(e){}
    document.documentElement.dataset.lang = saved;
    document.documentElement.lang = (saved === 'es') ? 'es' : 'en';
    syncLangSwitch(saved);
  }

  /* ── 2. Sliding nav pill ──────────────────────────────────────── */
  function initNavPill(){
    var nav = document.querySelector('.hdr-nav');
    var pill = nav && nav.querySelector('.hdr-nav-pill');
    if (!nav || !pill) return;

    function moveTo(el){
      if (!el) return;
      var navRect = nav.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      // pill is a 1px base at left:0; translateX to the item and
      // scaleX up to its width — pure transform, no layout.
      var x = r.left - navRect.left;
      pill.style.transform = 'translateY(-50%) translateX(' + x + 'px) scaleX(' + r.width + ')';
      pill.style.opacity = '1';
    }
    function reset(){
      var current = nav.querySelector('.hdr-nav-link[data-current="true"]')
                 || nav.querySelector('.hdr-dd .hdr-nav-link[data-current="true"]');
      if (current) moveTo(current); else pill.style.opacity = '0';
    }

    nav.querySelectorAll('.hdr-nav-link').forEach(function(link){
      link.addEventListener('mouseenter', function(){ moveTo(link); });
    });
    var dd = nav.querySelector('.hdr-dd');
    if (dd) dd.addEventListener('mouseenter', function(){
      var l = dd.querySelector('.hdr-nav-link'); if (l) moveTo(l);
    });
    nav.addEventListener('mouseleave', reset);
    reset();
    window.addEventListener('resize', reset, {passive:true});
  }

  /* ── 3. Header scrolled state ─────────────────────────────────── */
  function initScrollState(){
    var hdr = document.getElementById('hdr');
    if (!hdr) return;
    var ticking = false;
    var lastY = 0;
    // Track the scroll position where the current direction "started",
    // not just the immediately-previous frame. Comparing only to the
    // prior frame meant gradual/inertial scrolling in small sub-6px
    // steps per frame could perpetually fail the threshold and never
    // re-reveal the header on scroll-up, even though the cumulative
    // movement was clearly upward.
    var directionStartY = 0;
    var goingDown = false;
    function update(){
      var y = window.scrollY;
      hdr.classList.toggle('scrolled', y > 40);
      var movingDown = y > lastY;
      if (movingDown !== goingDown) {
        goingDown = movingDown;
        directionStartY = lastY;
      }
      if (y < 240) {
        hdr.classList.remove('hdr-hidden');
      } else if (goingDown && y - directionStartY > 6) {
        hdr.classList.add('hdr-hidden');
      } else if (!goingDown && directionStartY - y > 6) {
        hdr.classList.remove('hdr-hidden');
      }
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function(){
      if (!ticking){ window.requestAnimationFrame(update); ticking = true; }
    }, {passive:true});
    update();
  }

  /* ── 4. Mobile drawer focus trap ──────────────────────────────────
     Deliberately decoupled from whichever inline open/close function
     a given page uses (openD/closeD, openMob/closeMob, openDrawer/
     closeDrawer — naming has drifted across pages over time). Rather
     than patch N divergent implementations, this watches the
     drawer's "open" class directly via MutationObserver, so it works
     identically everywhere with zero per-page wiring. */
  function initDrawerFocusTrap(){
    var drawer = document.getElementById('mobDrawer');
    var toggle = document.getElementById('mobToggle');
    if (!drawer) return;
    var trapping = false;
    function focusable(){
      return Array.prototype.slice.call(
        drawer.querySelectorAll('a[href], button:not([disabled])')
      ).filter(function(el){ return el.offsetParent !== null; });
    }
    function onKeydown(e){
      if (e.key !== 'Tab') return;
      var f = focusable();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
    var mo = new MutationObserver(function(){
      var isOpen = drawer.classList.contains('open');
      if (isOpen && !trapping) {
        trapping = true;
        document.addEventListener('keydown', onKeydown);
        var f = focusable();
        if (f.length) f[0].focus();
      } else if (!isOpen && trapping) {
        trapping = false;
        document.removeEventListener('keydown', onKeydown);
        if (toggle && drawer.contains(document.activeElement)) toggle.focus();
      }
    });
    mo.observe(drawer, { attributes: true, attributeFilter: ['class'] });
  }

  /* ── 5. Language switch: roving tabindex (arrow-key navigation) ──
     role="radiogroup"/"radio" implies arrow keys move selection, not
     just Tab — this is the standard interaction pattern for a
     two-state segmented control (matches how a native OS language
     toggle or a <select role="radio"> group behaves). Left/Right and
     Up/Down all move; Home/End jump to the ends (trivial with two
     items, kept for correctness if a third language is ever added). */
  function initLangRovingTabindex(){
    var group = document.querySelector('.lang-switch[role="radiogroup"]');
    if (!group) return;
    var opts = Array.prototype.slice.call(group.querySelectorAll('.lang-opt'));
    if (opts.length < 2) return;
    function focusAt(i){
      opts.forEach(function(o, idx){ o.tabIndex = idx === i ? 0 : -1; });
      opts[i].focus();
    }
    group.addEventListener('keydown', function(e){
      var i = opts.indexOf(document.activeElement);
      if (i === -1) return;
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % opts.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + opts.length) % opts.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = opts.length - 1;
      if (next === null) return;
      e.preventDefault();
      focusAt(next);
      opts[next].click();
    });
  }

  /* ── 1: focus-parity for the nav pill ─────────────────────────
     The pill answered mouseenter only — keyboard users tabbing the
     nav got zero feedback. Same moveTo/reset, keyboard included. */
  function initPillFocusParity(){
    var nav = document.querySelector('.hdr-nav');
    var pill = nav && nav.querySelector('.hdr-nav-pill');
    if (!nav || !pill) return;
    nav.addEventListener('focusin', function(e){
      var link = e.target.closest('.hdr-nav-link');
      if (!link) return;
      var navRect = nav.getBoundingClientRect(), r = link.getBoundingClientRect();
      pill.style.transform = 'translateY(-50%) translateX(' + (r.left - navRect.left) + 'px) scaleX(' + r.width + ')';
      pill.style.opacity = '1';
    });
    nav.addEventListener('focusout', function(e){
      if (!nav.contains(e.relatedTarget)) {
        var cur = nav.querySelector('.hdr-nav-link[data-current="true"]');
        if (!cur) pill.style.opacity = '0';
      }
    });
  }

  /* ── 13: the current-page underline fills as you read ───────── */
  function initNavReadProgress(){
    var cur = document.querySelector('.hdr-nav-link[data-current="true"]');
    if (!cur) return;
    var ticking = false;
    function update(){
      var tot = document.documentElement.scrollHeight - window.innerHeight;
      var p = tot > 0 ? Math.min(1, window.scrollY / tot) : 0;
      document.documentElement.style.setProperty('--navprog', p.toFixed(3));
      ticking = false;
    }
    window.addEventListener('scroll', function(){
      if (!ticking){ requestAnimationFrame(update); ticking = true; }
    }, {passive:true});
    update();
  }

  /* ── 14: first-visit language suggestion ─────────────────────
     Browser prefers Spanish, site is showing English, user has
     never chosen — one dismissible chip, asked exactly once. */
  function initLangToast(){
    try{
      if (localStorage.getItem('lang') || localStorage.getItem('huac_lang') ||
          localStorage.getItem('langToastDone')) return;
      var wantsEs = (navigator.language || '').toLowerCase().indexOf('es') === 0;
      var showingEn = (document.documentElement.dataset.lang || 'en') === 'en';
      if (!wantsEs || !showingEn) return;
      var t = document.createElement('div');
      t.className = 'lang-toast'; t.setAttribute('role','status');
      t.innerHTML = '¿Prefieres español? ' +
        '<button class="lt-yes">Sí</button><button class="lt-no" aria-label="No, gracias">×</button>';
      document.body.appendChild(t);
      function done(){ try{localStorage.setItem('langToastDone','1');}catch(e){} t.remove(); }
      t.querySelector('.lt-yes').addEventListener('click', function(){ if (window.selectLang) window.selectLang('es'); done(); });
      t.querySelector('.lt-no').addEventListener('click', done);
      setTimeout(function(){ if (t.parentNode) done(); }, 12000);
    }catch(e){}
  }

  /* ── 15: connection status dot ───────────────────────────────
     Amber when the network drops or the API banner fires; hover
     explains. Status belongs in the chrome, quietly. */
  function initStatusDot(){
    var right = document.querySelector('.hdr-right');
    if (!right) return;
    var dot = document.createElement('span');
    dot.className = 'hdr-status-dot'; dot.id = 'hdrStatusDot';
    dot.title = 'Connection issue — live data may be unavailable';
    right.insertBefore(dot, right.firstChild);
    function set(down){ dot.setAttribute('data-state', down ? 'down' : 'ok'); }
    window.addEventListener('offline', function(){ set(true); });
    window.addEventListener('online', function(){ set(false); });
    new MutationObserver(function(){
      if (document.getElementById('apiDownBanner')) set(true);
    }).observe(document.body, {childList:true});
  }

  /* ── 16: swipe-to-close the drawer ───────────────────────────
     Rightward swipe on the open drawer closes it via the page's own
     toggle (so overlay + body scroll are restored by the same code
     path that opened it). */
  function initDrawerSwipe(){
    var drawer = document.getElementById('mobDrawer');
    var toggle = document.getElementById('mobToggle');
    if (!drawer || !toggle) return;
    var x0 = null;
    drawer.addEventListener('touchstart', function(e){ x0 = e.touches[0].clientX; }, {passive:true});
    drawer.addEventListener('touchend', function(e){
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (dx > 64 && drawer.classList.contains('open')) toggle.click();
    }, {passive:true});
  }

  /* ── 18: scroll-linked header theming ────────────────────────
     Sections opting in via data-hdr="light" flip the header to a
     frosted-light scheme while they sit under it. Sentinel-based:
     cheap IntersectionObserver band at header height. */
  function initHeaderTheming(){
    var hdr = document.getElementById('hdr');
    var zones = document.querySelectorAll('[data-hdr="light"]');
    if (!hdr || !zones.length) return;
    var overCount = 0;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ overCount += en.isIntersecting ? 1 : -1; });
      hdr.classList.toggle('over-light', overCount > 0);
    }, { rootMargin: '-1px 0px -' + (window.innerHeight - 70) + 'px 0px' });
    zones.forEach(function(z){ io.observe(z); });
  }

  /* ── 20: skip-link menu ───────────────────────────────────────
     One skip link becomes three (content / navigation / footer),
     revealed on focus like the original. Footer gets an id if it
     lacks one. Screen-reader users get the same speed the sighted
     nav just gained. */
  function initSkipMenu(){
    var first = document.querySelector('.skip-link');
    if (!first || document.getElementById('skipNav')) return;
    var footer = document.querySelector('.site-footer');
    if (footer && !footer.id) footer.id = 'siteFooter';
    var nav = document.createElement('a');
    nav.className = 'skip-link'; nav.id = 'skipNav'; nav.href = '#hdr';
    nav.textContent = 'Skip to navigation'; nav.style.top = '48px';
    var foot = document.createElement('a');
    foot.className = 'skip-link'; foot.href = '#' + (footer ? footer.id : 'siteFooter');
    foot.textContent = 'Skip to footer'; foot.style.top = '96px';
    first.after(nav, foot);
  }

  /* ── 8 + 9: keyboard shortcuts, help overlay, command palette ─ */
  var GO = { h:'/', r:'/clinical/', i:'/innovation/', a:'/news/', t:'/team/', p:'/report/' };
  function initKeyboardLayer(){
    var pendingG = false, gTimer = null;

    function typingContext(e){
      var t = e.target;
      return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    }

    document.addEventListener('keydown', function(e){
      if (typingContext(e)) return;

      /* palette: Cmd/Ctrl+K */
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){
        e.preventDefault(); openPalette(); return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      /* help overlay: ? */
      if (e.key === '?'){ e.preventDefault(); openHelp(); return; }

      /* vim-style go: g then destination */
      if (pendingG){
        pendingG = false; clearTimeout(gTimer);
        var dest = GO[e.key.toLowerCase()];
        if (dest){ e.preventDefault(); location.href = dest; }
        return;
      }
      if (e.key.toLowerCase() === 'g'){
        pendingG = true;
        gTimer = setTimeout(function(){ pendingG = false; }, 900);
      }
    });

    /* visible ⌘K affordance for pointer users (desktop only) */
    var right = document.querySelector('.hdr-right');
    if (right && !document.getElementById('cmdkHint')){
      var hint = document.createElement('button');
      hint.className = 'cmdk-hint'; hint.id = 'cmdkHint';
      hint.type = 'button'; hint.setAttribute('aria-label','Open quick search');
      hint.textContent = (navigator.platform || '').indexOf('Mac') > -1 ? '⌘K' : 'Ctrl K';
      hint.addEventListener('click', openPalette);
      var contact = right.querySelector('.hdr-contact-btn');
      right.insertBefore(hint, contact || null);
    }
  }

  function openHelp(){
    if (document.querySelector('.kbd-help')) return;
    var o = document.createElement('div');
    o.className = 'kbd-help'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Keyboard shortcuts');
    o.innerHTML = '<div class="kbd-help-card"><h3>Keyboard shortcuts</h3><dl>' +
      '<dt><kbd>⌘K</kbd></dt><dd>Quick search</dd>' +
      '<dt><kbd>g h</kbd></dt><dd>Home</dd>' +
      '<dt><kbd>g r</kbd></dt><dd>Research</dd>' +
      '<dt><kbd>g i</kbd></dt><dd>Innovation</dd>' +
      '<dt><kbd>g a</kbd></dt><dd>Articles</dd>' +
      '<dt><kbd>g t</kbd></dt><dd>Team</dd>' +
      '<dt><kbd>g p</kbd></dt><dd>Annual report</dd>' +
      '<dt><kbd>?</kbd></dt><dd>This overlay</dd></dl></div>';
    document.body.appendChild(o);
    function close(){ o.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e){ if (e.key === 'Escape') close(); }
    o.addEventListener('click', function(e){ if (e.target === o) close(); });
    document.addEventListener('keydown', onKey);
  }

  /* Palette index: static pages immediately; research lines join
     when their fetch resolves (reuses the dropdown's endpoint via
     the browser cache — no new cost worth worrying about). */
  var _palItems = [
    {k:'page', t:'Home · Inicio', href:'/'},
    {k:'page', t:'Research · Investigación', href:'/clinical/'},
    {k:'page', t:'Innovation · Innovación', href:'/innovation/'},
    {k:'page', t:'Articles · Artículos', href:'/news/'},
    {k:'page', t:'Team · Equipo', href:'/team/'},
    {k:'page', t:'Annual report · Memoria anual', href:'/report/'},
    {k:'page', t:'Contact · Contacto', href:'/#contact'},
    {k:'page', t:'Privacy · Privacidad', href:'/privacidad/'},
    {k:'page', t:'Accessibility · Accesibilidad', href:'/accesibilidad/'}
  ];
  var _palLinesLoaded = false;

  function openPalette(){
    if (document.querySelector('.cmdk-overlay')) return;
    if (!_palLinesLoaded && window.fetch){
      _palLinesLoaded = true;
      fetch('https://neumac-manage-back-end-production.up.railway.app/api/research-lines/website')
        .then(function(r){ return r.json(); })
        .then(function(res){
          (res.data || []).forEach(function(l){
            _palItems.push({ k:'L'+String(l.line_number).padStart(2,'0'),
                             t:(l.short_name || l.name || ''), href:'/line/?id='+l.id });
          });
          renderList(document.querySelector('.cmdk input') ?
            document.querySelector('.cmdk input').value : '');
        }).catch(function(){});
    }
    var o = document.createElement('div');
    o.className = 'cmdk-overlay'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','Quick search');
    o.innerHTML = '<div class="cmdk"><input type="text" placeholder="Search pages and research lines…" aria-label="Search"/><div class="cmdk-list" role="listbox"></div></div>';
    document.body.appendChild(o);
    var input = o.querySelector('input');
    var sel = 0;

    window.renderList = function(q){
      var list = o.querySelector('.cmdk-list');
      if (!list) return;
      q = (q || '').trim().toLowerCase();
      var hits = _palItems.filter(function(it){
        return !q || it.t.toLowerCase().indexOf(q) > -1 || it.k.toLowerCase().indexOf(q) > -1;
      }).slice(0, 9);
      sel = 0;
      list.innerHTML = hits.length
        ? hits.map(function(it, i){
            return '<a class="cmdk-item" role="option" data-sel="'+(i===0?1:0)+'" href="'+it.href+'"><span class="ck-k">'+it.k+'</span><span class="ck-t">'+it.t+'</span></a>';
          }).join('')
        : '<div class="cmdk-empty">No matches — try a page name or L-number.</div>';
    };
    renderList('');
    input.focus();
    input.addEventListener('input', function(){ renderList(input.value); });

    function close(){ o.remove(); document.removeEventListener('keydown', onKey); window.renderList = null; }
    function onKey(e){
      var items = o.querySelectorAll('.cmdk-item');
      if (e.key === 'Escape'){ close(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
        e.preventDefault();
        if (!items.length) return;
        items[sel] && items[sel].setAttribute('data-sel','0');
        sel = e.key === 'ArrowDown' ? (sel+1)%items.length : (sel-1+items.length)%items.length;
        items[sel].setAttribute('data-sel','1');
        items[sel].scrollIntoView({block:'nearest'});
      }
      else if (e.key === 'Enter'){
        if (items[sel]) location.href = items[sel].getAttribute('href');
      }
    }
    o.addEventListener('click', function(e){ if (e.target === o) close(); });
    document.addEventListener('keydown', onKey);
  }

  /* ── Top scroll-progress bar (#pb) ─────────────────────────── */
  function initTopProgress(){
    var pb = document.getElementById('pb');
    if (!pb) return;
    var ticking = false;
    function update(){
      var tot = document.documentElement.scrollHeight - window.innerHeight;
      var p = tot > 0 ? Math.min(1, window.scrollY / tot) : 0;
      pb.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      ticking = false;
    }
    window.addEventListener('scroll', function(){
      if (!ticking){ requestAnimationFrame(update); ticking = true; }
    }, {passive:true});
    window.addEventListener('resize', update, {passive:true});
    update();
  }

  function boot(){
    initTopProgress();
    initNavPill();
    initScrollState();
    initDrawerFocusTrap();
    initLangRovingTabindex();
    initPillFocusParity();
    initNavReadProgress();
    initLangToast();
    initStatusDot();
    initDrawerSwipe();
    initHeaderTheming();
    initSkipMenu();
    initKeyboardLayer();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
