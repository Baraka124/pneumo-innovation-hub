/* neumAC R&I — Animations
 * Applied across all pages via shared <script> injection
 * Philosophy: animation communicates structure, not decoration
 * ─────────────────────────────────────────────────────────────
 * 1. Stat counter        — hero panel numbers count up on entry
 * 2. Stagger reveal      — list rows enter sequentially (70ms gap)
 * 3. Teal line draw      — hero accent border draws on load
 * 4. Accordion height    — research line expand uses real height
 */

(function() {
  'use strict';

  /* ── 1. STAT COUNTER ───────────────────────────────────────── */ 
  function parseStatValue(raw) {
    raw = (raw || '').trim();
    // Handle "<6w", "6+", "12", "—"
    const prefix = raw.match(/^[<>~]/)?.[0] || '';
    const suffix = raw.match(/[+wkm%]+$/i)?.[0] || '';
    const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : { prefix, suffix, num };
  }

  function animateCounter(el, target, duration) {
    const { prefix, suffix, num } = target;
    const start = performance.now();
    const isInt = Number.isInteger(num);

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = num * eased;
      el.textContent = prefix + (isInt ? Math.round(current) : current.toFixed(1)) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + (isInt ? num : num) + suffix;
    }
    requestAnimationFrame(tick);
  }

  function initCounters() {
    const counterEls = document.querySelectorAll('[data-counter]');
    if (!counterEls.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const raw = el.dataset.counter;
        const parsed = parseStatValue(raw);
        if (parsed) animateCounter(el, parsed, 900);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    counterEls.forEach(el => observer.observe(el));
  }

  /* ── 2. STAGGER REVEAL ─────────────────────────────────────── */
  function initStagger() {
    // Apply staggered delays to siblings within stagger containers
    const containers = document.querySelectorAll(
      '.partner-list, .partner-row, .team-grid, .projects-grid, .pipeline-stages, .partner-models, .cap-grid, .blog-feed'
    );
    containers.forEach(container => {
      const items = container.querySelectorAll(':scope > .reveal, :scope > .partner-row, :scope > .post-item');
      items.forEach((item, i) => {
        item.style.transitionDelay = `${i * 70}ms`;
      });
    });

    // Also stagger fw-steps (framework list in hero)
    document.querySelectorAll('.fw-steps').forEach(list => {
      list.querySelectorAll('.fw-step').forEach((step, i) => {
        step.style.opacity = '0';
        step.style.transform = 'translateY(10px)';
        step.style.transition = `opacity .4s ease ${i * 80}ms, transform .4s ease ${i * 80}ms`;
        // Trigger shortly after page load
        setTimeout(() => {
          step.style.opacity = '1';
          step.style.transform = 'none';
        }, 300 + i * 80);
      });
    });
  }

  /* ── 3. HERO ACCENT LINE DRAW ──────────────────────────────── */
  function initAccentLine() {
    // The ::before pseudo-element on .hero draws a 3px teal line
    // We can't animate ::before directly, so we use a real element
    const heroes = document.querySelectorAll('.hero, .blog-hero, .pg-hero');
    heroes.forEach(hero => {
      const line = document.createElement('div');
      line.style.cssText = `
        position:absolute;top:0;left:0;width:3px;height:0;
        background:linear-gradient(to bottom, var(--teal-2), transparent);
        z-index:2;transition:height .7s cubic-bezier(.4,0,.2,1);
        pointer-events:none;
      `;
      // Only inject if hero is position:relative/absolute
      const pos = getComputedStyle(hero).position;
      if (pos === 'relative' || pos === 'absolute') {
        hero.appendChild(line);
        requestAnimationFrame(() => {
          setTimeout(() => { line.style.height = '100%'; }, 80);
        });
      }
    });
  }

  /* ── 4. ACCORDION HEIGHT ANIMATION ────────────────────────── */
  function initAccordions() {
    // Enhanced version of toggleLine — uses real scrollHeight
    window.toggleLine = function(id) {
      const card = document.getElementById(id);
      if (!card) return;
      const body = card.querySelector('.line-body');
      const arrow = card.querySelector('.toggle-arrow');
      const isOpen = card.classList.contains('open');

      if (isOpen) {
        // Close: animate from scrollHeight → 0
        body.style.maxHeight = body.scrollHeight + 'px';
        body.style.opacity = '1';
        body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
          body.style.transition = 'max-height .35s cubic-bezier(.4,0,.2,1), opacity .25s ease';
          body.style.maxHeight = '0';
          body.style.opacity = '0';
        });
        card.classList.remove('open');
      } else {
        // Open: animate from 0 → scrollHeight
        body.style.maxHeight = '0';
        body.style.opacity = '0';
        body.style.overflow = 'hidden';
        body.style.transition = 'max-height .4s cubic-bezier(.4,0,.2,1), opacity .3s ease .05s';
        card.classList.add('open');

        // Pulse the toggle hint briefly to confirm interaction
        const toggle = card.querySelector('.line-expand-toggle');
        if (toggle) {
          toggle.style.background = 'rgba(0,153,153,.06)';
          setTimeout(() => { toggle.style.background = ''; }, 300);
        }

        requestAnimationFrame(() => {
          body.style.maxHeight = body.scrollHeight + 'px';
          body.style.opacity = '1';
          body.addEventListener('transitionend', function h() {
            body.style.maxHeight = 'none'; // Allow natural height once open
            body.removeEventListener('transitionend', h);
          });
        });
      }
    };

    // Add a subtle "expand" hint text to the toggle label if not already there
    document.querySelectorAll('.line-expand-toggle').forEach(toggle => {
      toggle.setAttribute('role', 'button');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.style.cursor = 'pointer';
      // Make the toggle row pulse subtly on first load to hint interactivity
      const card = toggle.closest('.line-card');
      if (card) {
        toggle.addEventListener('click', () => {
          const isOpen = card.classList.contains('open');
          toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
      }
    });
  }


  // Public API for api.js integration
  window._animateCounter = function(el, raw) {
    const parsed = parseStatValue(String(raw));
    if (parsed) {
      animateCounter(el, parsed, 800);
    } else {
      el.textContent = raw;
    }
  };
  /* ── INIT ──────────────────────────────────────────────────── */
  function init() {
    initCounters();
    initStagger();
    initAccentLine();
    initAccordions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
