// ──────────────────────────────────────────────────────────────
// VERIFY — data-verifiability layer.
//
// Research credibility is verifiable, not asserted. This turns the
// site's plain "DOI →" links into verified sources carrying a LIVE
// citation count from OpenAlex (a free, no-auth, CORS-enabled scholarly
// index). It's progressive enhancement: it runs after a controller has
// rendered its publications and upgrades whatever DOI links are present,
// so no renderer needs rewriting and a failure leaves the plain link.
// ──────────────────────────────────────────────────────────────

const CACHE = new Map();

/** Normalise a DOI (strip any URL prefix) → bare "10.xxxx/yyyy". */
export function normaliseDoi(input) {
  return String(input || '')
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim();
}

/** Live citation count for a DOI via OpenAlex. Returns a number or null. */
export async function fetchCitationCount(doi) {
  const clean = normaliseDoi(doi);
  if (!clean) return null;
  if (CACHE.has(clean)) return CACHE.get(clean);
  try {
    const url = `https://api.openalex.org/works/doi:${encodeURIComponent(clean)}?select=cited_by_count`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) { CACHE.set(clean, null); return null; }
    const json = await res.json();
    const n = typeof json.cited_by_count === 'number' ? json.cited_by_count : null;
    CACHE.set(clean, n);
    return n;
  } catch {
    return null;
  }
}

/**
 * Find every DOI link under `root` and append a live "verified · N cited"
 * badge. Idempotent (won't double-process a link). Batched gently so a
 * page full of publications doesn't fire 40 requests at once.
 */
export function hydrateCitations(root = document) {
  const links = Array.from(root.querySelectorAll('a[href*="doi.org/"]'))
    .filter((a) => !a.dataset.verified);
  let i = 0;
  const step = () => {
    const batch = links.slice(i, i + 4);
    i += 4;
    batch.forEach(async (a) => {
      a.dataset.verified = 'pending';
      const n = await fetchCitationCount(a.getAttribute('href'));
      if (n == null) { a.dataset.verified = 'unverified'; return; }
      a.dataset.verified = 'done';
      const badge = document.createElement('span');
      badge.className = 'verify-cite';
      badge.title = 'Live citation count · OpenAlex';
      badge.setAttribute('aria-label', `${n} citations, verified via OpenAlex`);
      badge.innerHTML =
        '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>' +
        `<span class="verify-n">${n.toLocaleString()}</span>` +
        '<span class="verify-lbl"><span lang="en">cited</span><span lang="es">citas</span></span>';
      a.insertAdjacentElement('afterend', badge);
    });
    if (i < links.length) setTimeout(step, 260);
  };
  if (links.length) step();
}

// Auto-run once the DOM is ready, then watch for DOI links injected later
// (publications and the trial modal render asynchronously). One import in
// BaseLayout covers the whole site — no controller wiring needed.
if (typeof window !== 'undefined') {
  window.hydrateCitations = hydrateCitations;
  const run = () => hydrateCitations();

  let pending = null;
  const schedule = () => {
    if (pending) return;
    pending = setTimeout(() => { pending = null; hydrateCitations(); }, 300);
  };

  const start = () => {
    run();
    try {
      new MutationObserver((muts) => {
        for (const m of muts) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1 &&
                (node.matches?.('a[href*="doi.org/"]') || node.querySelector?.('a[href*="doi.org/"]'))) {
              schedule();
              return;
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
