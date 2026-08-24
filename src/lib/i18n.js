// ──────────────────────────────────────────────────────────────
// i18n for <option> elements.
//
// The site translates content with CSS-toggled <span lang="en/es">
// pairs — but that trick does NOT work inside <option>, because browsers
// render option text as plain text and ignore inner markup. So the filter
// and form dropdowns stayed English even in Spanish mode.
//
// This swaps each option's text from data-en / data-es whenever the
// language changes. It observes the <html data-lang> attribute (set by
// the language toggle) and re-applies, and watches for dynamically
// injected options (e.g. research lines added to a filter). One import
// in BaseLayout; nothing else to wire.
// ──────────────────────────────────────────────────────────────

export function applyOptionLang(lang, root = document) {
  const es = lang === 'es';
  root.querySelectorAll('option[data-en][data-es]').forEach((o) => {
    o.textContent = es ? o.dataset.es : o.dataset.en;
  });
}

if (typeof window !== 'undefined') {
  window.applyOptionLang = applyOptionLang;
  const current = () => (document.documentElement.dataset.lang === 'es' ? 'es' : 'en');
  const run = () => applyOptionLang(current());

  const start = () => {
    run();
    // Re-apply when the language toggle flips <html data-lang>.
    try {
      new MutationObserver(run).observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-lang'],
      });
    } catch {}
    // Re-apply when new translatable options are injected.
    try {
      new MutationObserver((muts) => {
        for (const m of muts) {
          for (const n of m.addedNodes) {
            if (n.nodeType === 1 &&
                (n.matches?.('option[data-en]') || n.querySelector?.('option[data-en]'))) {
              run(); return;
            }
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    } catch {}
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
