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

  var _original = window.selectLang;
  window.selectLang = function(lang){
    if (typeof _original === 'function') {
      try { _original(lang); } catch(e){}
    }
    applyLangCrossfade(lang);
  };

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

  function boot(){
    restoreLang();
    initNavPill();
    initScrollState();
    initDrawerFocusTrap();
    initLangRovingTabindex();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
