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
  function applyLangCrossfade(lang){
    var root = document.documentElement;
    root.style.transition = 'opacity .18s ease';
    root.style.opacity = '0.6';
    setTimeout(function(){
      root.dataset.lang = lang;
      root.lang = (lang === 'es') ? 'es' : 'en';
      // sync the switch buttons' pressed state
      document.querySelectorAll('.lang-opt').forEach(function(b){
        var on = b.dataset.lang === lang;
        b.setAttribute('aria-pressed', String(on));
      });
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
    document.querySelectorAll('.lang-opt').forEach(function(b){
      b.setAttribute('aria-pressed', String(b.dataset.lang === saved));
    });
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
      pill.style.left = (r.left - navRect.left) + 'px';
      pill.style.width = r.width + 'px';
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

  function boot(){
    restoreLang();
    initNavPill();
    initScrollState();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
