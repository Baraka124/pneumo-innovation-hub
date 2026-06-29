/* neumACt R&I — Header Enhancements (shared)
 * - Sliding active/hover pill under the primary nav
 * - Language choice persisted in localStorage + smooth crossfade
 * - Scrolled-state class on the header
 * - Back-to-top button
 * Loaded on every page; all guards are null-safe so a missing element
 * never throws. */
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
    function update(){
      var y = window.scrollY;
      hdr.classList.toggle('scrolled', y > 40);
      // Scroll-direction hide/reveal: hide when scrolling down past hero,
      // reveal immediately when scrolling up. Never hide near the top.
      if (y > 240 && y > lastY + 6){
        hdr.classList.add('hdr-hidden');
      } else if (y < lastY - 6 || y < 240){
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

  /* ── 5. Scroll-progress bar ───────────────────────────────────── */
  function initScrollProgress(){
    if (document.querySelector('.scroll-progress')) return;
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);
    var ticking = false;
    function update(){
      var h = document.documentElement;
      var scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      bar.style.width = Math.min(100, Math.max(0, scrolled * 100)) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function(){
      if (!ticking){ window.requestAnimationFrame(update); ticking = true; }
    }, {passive:true});
    window.addEventListener('resize', update, {passive:true});
    update();
  }

  /* ── 4. Back-to-top button ────────────────────────────────────── */
  function initToTop(){
    if (document.querySelector('.to-top')) return;
    var btn = document.createElement('button');
    btn.className = 'to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    btn.addEventListener('click', function(){
      window.scrollTo({ top:0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    document.body.appendChild(btn);
    var ticking = false;
    function update(){ btn.classList.toggle('show', window.scrollY > 600); ticking = false; }
    window.addEventListener('scroll', function(){
      if (!ticking){ window.requestAnimationFrame(update); ticking = true; }
    }, {passive:true});
    update();
  }

  function boot(){
    restoreLang();
    initNavPill();
    initScrollState();
    initScrollProgress();
    initToTop();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
