// HOMEPAGE controller: research-line grid, live stats/ticker,
// news snapshot (featured stories), innovation spotlight, hero canvas.
import { apiFetch } from './api.js';
import { setError, STATUS_CLASS, STATUS_LABEL_EN } from './ui.js';
const PAGE = 'index';
let _researchLineMap = {};

function buildLineFingerprint(line, w = 280, h = 60) {
  const seed = (line.line_number || 1) * 7919 + (line.name || '').length * 131;
  const rnd = _fpRand(seed);
  const energy = Math.min(1, .35 + (line.active_trials || 0) * .12);
  let paths = '';
  const waves = 3;
  for (let k = 0; k < waves; k++) {
    const amp = h * .18 * energy * (.6 + rnd() * .8);
    const freq = 1.5 + rnd() * 2.5;
    const phase = rnd() * Math.PI * 2;
    const yBase = h * (.3 + k * .2);
    let d = `M0 ${yBase.toFixed(1)}`;
    for (let x = 0; x <= w; x += 8) {
      const y = yBase + Math.sin((x / w) * Math.PI * 2 * freq + phase) * amp
                      * Math.sin((x / w) * Math.PI);       // taper at edges: a breath
      d += ` L${x} ${y.toFixed(1)}`;
    }
    paths += `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.2" opacity="${(.5 - k * .13).toFixed(2)}"/>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
}


async function loadResearchLines() {
  const indexGrid    = document.getElementById('researchLinesGrid');
  const clinicalList = document.getElementById('researchLinesList');

  if (!indexGrid && !clinicalList) return;

  try {
    let { data } = await apiFetch('/api/research-lines/website');
    if (!data?.length) {
      // Retry once before giving up — a transient backend hiccup
      // shouldn't leave visitors staring at the loading skeleton forever
      // with no indication anything went wrong.
      await new Promise(r => setTimeout(r, 800));
      ({ data } = await apiFetch('/api/research-lines/website'));
    }
    if (!data?.length) {
      if (indexGrid) setError(indexGrid, 'Unable to load research lines right now. Please refresh the page.');
      if (clinicalList) setError(clinicalList, 'Unable to load research lines right now. Please refresh the page.');
      return;
    }

    // ── INDEX: 2-column editorial grid ──────────────────────────────
    if (indexGrid) {
      // Skeleton — light section
      indexGrid.innerHTML = Array(6).fill(
        `<div class="line-card" style="pointer-events:none;">
           <div class="api-skeleton" style="width:1.75rem;height:.9rem;margin-top:.2rem;margin-right:1.25rem;flex-shrink:0;"></div>
           <div style="flex:1;">
             <div class="api-skeleton" style="height:.9rem;width:80%;margin-bottom:.5rem;"></div>
             <div class="api-skeleton" style="height:.7rem;width:45%;"></div>
           </div>
         </div>`
      ).join('');

      await new Promise(r => setTimeout(r, 0));

      indexGrid.style.transition = 'none';
      indexGrid.style.opacity = '0';
      indexGrid.innerHTML = data.map((line, i) => {
        const num = String(line.line_number).padStart(2, '0');
        const displayName = line.short_name || line.name;
        const trialBadge = line.active_trials > 0
          ? `<span class="line-tag">${line.active_trials} active</span>` : '';
        const coord = line.coordinator;
        let coordBlock = '';
        if (coord?.full_name) {
          const avatar = buildAvatar(coord, 22);
          coordBlock = `<div class="line-coord" style="display:flex;align-items:center;gap:.5rem;">${avatar}<span>${escHtml(coord.full_name)}</span></div>`;
        }
        return `
          <a href="/line/?id=${line.id}" class="line-card reveal">
            <div class="line-fp" aria-hidden="true">${buildLineFingerprint(line)}</div>
            <div class="line-num">${num}</div>
            <div class="line-body">
              <div class="line-title">${escHtml(displayName)}</div>
              ${coordBlock}
              ${trialBadge ? `<div class="line-meta">${trialBadge}</div>` : ''}
            </div>
            <div class="line-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </a>`;
      }).join('');
      requestAnimationFrame(() => { indexGrid.style.transition = 'opacity .22s var(--ease-clinical)'; indexGrid.style.opacity = '1'; });
      if (window._revealObserver) indexGrid.querySelectorAll('.reveal').forEach(el => window._revealObserver.observe(el));

      // Update stat counters
      _setStat('statLines', data.length);
    }

    // ── CLINICAL: expandable accordion ──────────────────────────────
    // Build line_number -> id map for trial filter
    window._researchLineMap = {};
    data.forEach(line => { window._researchLineMap[String(line.line_number)] = line.id; });

    // Populate filterLine dropdown on clinical page
    const filterLineEl = document.getElementById('filterLine');
    if (filterLineEl && filterLineEl.options.length <= 1) {
      data.forEach(line => {
        const num = String(line.line_number).padStart(2, '0');
        const shortName = line.name.split(',')[0].split('y ')[0].trim();
        const opt = document.createElement('option');
        opt.value = String(line.line_number);
        opt.textContent = `${num} — ${shortName}`;
        filterLineEl.appendChild(opt);
      });
    }

    if (clinicalList) {
      clinicalList.style.transition = 'none';
      clinicalList.style.opacity = '0';
      clinicalList.innerHTML = data.map(line => `
        <div class="line-card" id="line-${line.id}">
          <div class="line-head" onclick="toggleLine('line-${line.id}')">
            <div class="line-num">${String(line.line_number).padStart(2, '0')}</div>
            <div class="line-meta">
              ${line.coordinator?.full_name
                ? `<div class="line-coordinator">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="11" height="11">
                       <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                     </svg>
                     <strong>${escHtml(line.coordinator.full_name)}</strong>
                   </div>`
                : ''}
              <div class="line-title">${escHtml(line.name)}</div>
            </div>
          </div>
          <div class="line-tags-preview">
            ${(line.keywords || []).map(k => `<span class="ltag">${escHtml(k)}</span>`).join('')}
          </div>
          <div class="line-expand-toggle" onclick="toggleLine('line-${line.id}')">
            <span class="toggle-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="13" height="13">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <span lang="en">Research scope &amp; capabilities</span>
              <span lang="es">Alcance y capacidades</span>
            </span>
            <div class="toggle-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11">
                <path d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>
          <div class="line-body">
            <div class="line-body-inner">
              ${line.description  ? `<p class="line-desc">${escHtml(line.description)}</p>` : ''}
              ${line.capabilities ? `<p class="line-desc" style="margin-top:.5rem;">${escHtml(line.capabilities)}</p>` : ''}
              <a href="/line/?id=${line.id}" class="btn-text" style="display:inline-flex;margin-top:.875rem;"><span lang="en">View full line page</span><span lang="es">Ver página completa de la línea</span> →</a>
            </div>
          </div>
        </div>`
      ).join('');
      requestAnimationFrame(() => { clinicalList.style.transition = 'opacity .22s var(--ease-clinical)'; clinicalList.style.opacity = '1'; });
    }

  } catch (err) {
    console.error('Research lines load failed:', err);
    if (indexGrid)    setError(indexGrid);
    if (clinicalList) setError(clinicalList);
  }
}

window.toggleLine = function(id) {
  const card = document.getElementById(id);
  if (card) card.classList.toggle('open');
};

// ─────────────────────────────────────────────
// 2. CLINICAL TRIALS (clinical.html)
// ─────────────────────────────────────────────


async function loadLiveStats() {
  if (PAGE !== 'index') return;
  const tickerFacts = [];   /* 9 ── "department at work" hero ticker */
  try {
    const linesRes = await apiFetch('/api/research-lines/website');
    const lineCount = linesRes.data?.length || 0;
    if (lineCount > 0) {
      _setStat('statLines', lineCount);
      tickerFacts.push({en:`${lineCount} active research lines`, es:`${lineCount} líneas de investigación activas`});
      // Sum active trials across all lines
      const totalActive = linesRes.data.reduce((sum, l) => sum + (l.active_trials || 0), 0);
      if (totalActive > 0) {
        _setStat('statTrials', totalActive + '+');
        _setStat('statTrials2', totalActive + '+');
        _setStat('statTrialsBig', totalActive + '+');
        tickerFacts.push({en:`${totalActive}+ clinical trials enrolling`, es:`${totalActive}+ ensayos clínicos reclutando`});
      }
    }

    // Team count from website endpoint
    try {
      const teamRes = await apiFetch('/api/team/website');
      const memberCount = teamRes.data?.length || 0;
      if (memberCount > 0) _setStat('statMembers', memberCount);
    } catch { /* keep static fallback */ }

    // Publication count — limit=30 caps what the API actually returns, so
    // a count >=30 means there are more we haven't fetched; show "30+"
    // rather than silently understating the real total.
    try {
      const pubsRes = await apiFetch('/api/news/website?type=publication&limit=30');
      const pubCount = pubsRes.data?.length || 0;
      if (pubCount > 0) _setStat('statPubs', pubCount >= 30 ? '30+' : pubCount);
      const newest = (pubsRes.data || [])[0];
      const when = newest && (newest.published_at || newest.created_at);
      if (when) {
        const days = Math.max(0, Math.round((Date.now() - new Date(when)) / 86400000));
        tickerFacts.push(
          days === 0 ? {en:'latest publication: today', es:'última publicación: hoy'} :
          {en:`latest publication ${days} day${days===1?'':'s'} ago`,
           es:`última publicación hace ${days} día${days===1?'':'s'}`});
      }
    } catch { /* keep static fallback */ }

    startHeroTicker(tickerFacts);
  } catch (err) {
    console.warn('Live stats not available:', err.message);
  }
}

/* 9 ── Quiet proof-of-life line in the hero, cycling real facts drawn
   from the data loadLiveStats already fetches. Crossfades every 4s;
   under reduced motion it just shows the first fact, static. */
function startHeroTicker(facts) {
  const el = document.getElementById('liveTicker');
  if (!el || !facts.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  function render(f) {
    el.innerHTML = `<span lang="en">${f.en}</span><span lang="es">${f.es}</span>`;
  }
  render(facts[0]);
  el.style.opacity = '1';
  if (reduced || facts.length < 2) return;
  setInterval(() => {
    el.style.opacity = '0';
    setTimeout(() => { i = (i + 1) % facts.length; render(facts[i]); el.style.opacity = '1'; }, 350);
  }, 4000);
}

/** Update any element with id matching statId */
function _setStat(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.dataset.counter = value;
  // If the element is already on screen by the time live data arrives,
  // animate to the real number now rather than leaving it static —
  // the IntersectionObserver in animations.js only fires once on first
  // entry, which may have already happened with the static fallback value.
  if (window._animateCounter) {
    window._animateCounter(el, value);
  } else {
    el.textContent = value;
  }
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Builds a self-healing avatar: a real photo if one exists, with a true
// onerror fallback to initials if the image fails to load (stale URL,
// deleted storage file, etc.) — not just a check that the URL string
// is non-empty, which says nothing about whether the image actually
// loads. Centralized here so every avatar site shares one fallback
// behavior instead of each reimplementing it slightly differently.
function buildAvatar(person, sizePx, shape = 'circle') {
  const initials = (person.full_name || '').split(' ')
    .filter(w => w && !['Dr.', 'Dra.', 'Prof.'].includes(w))
    .slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const radius = shape === 'circle' ? '50%' : 'var(--r-sm, 6px)';
  const fallbackId = 'av' + Math.random().toString(36).slice(2, 9);

  // No-photo state: typographic monogram rather than a gradient blob.
  // Fraunces serif initials on a light surface background read as a
  // deliberate editorial choice (like an author monogram in a journal)
  // rather than "user hasn't uploaded a profile picture yet".
  // The dashed border signals 'photo slot' to someone who recognises
  // the convention (admins, editors) without looking broken to visitors.
  const noPhotoStyle = [
    `width:${sizePx}px`, `height:${sizePx}px`, `border-radius:${radius}`,
    `background:#F0F4F8`, `display:flex`, `align-items:center`,
    `justify-content:center`, `flex-shrink:0`,
    `border:1.5px dashed rgba(12,56,104,.18)`,
    `font-family:'Fraunces',Georgia,serif`, `font-weight:600`,
    `font-style:italic`, `font-size:${Math.round(sizePx * 0.34)}px`,
    `color:var(--navy,#0C3868)`, `letter-spacing:-.01em`,
  ].join(';');

  const fallbackSpan = `<span id="${fallbackId}" style="display:none;${noPhotoStyle};">${escHtml(initials)}</span>`;

  if (!person.public_photo_url) {
    return `<div style="${noPhotoStyle};">${escHtml(initials)}</div>`;
  }
  return `<div style="width:${sizePx}px;height:${sizePx}px;border-radius:${radius};overflow:hidden;flex-shrink:0;position:relative;">
    <img src="${escHtml(person.public_photo_url)}" alt="${escHtml(person.full_name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none';document.getElementById('${fallbackId}').style.display='flex';">
    ${fallbackSpan}
  </div>`;
}

// Every bio in the database opens with a role/affiliation sentence
// ("Head of Research Line N (neumACt – INIBIC)...", "Head of the
// Pulmonology Department at CHUAC and Principal Investigator of...")
// that's now redundant — role and line are shown as structured fields
// above the bio. Strips that one leading sentence if it matches the
// pattern; leaves the bio untouched otherwise, so this never mangles
// a bio that doesn't follow the convention.
function trimBioRolePrefix(bio) {
  if (!bio) return bio;
  const sentences = bio.split(/(?<=[.!?])\s+/);
  if (sentences.length < 2) return bio;
  const first = sentences[0];
  const rolePattern = /^(Head of|Jefe de|Principal Investigator|Coordinator of|Coordinador[a]? de)/i;
  if (rolePattern.test(first)) {
    return sentences.slice(1).join(' ');
  }
  return bio;
}

function _fadeInRows(selector) {
  requestAnimationFrame(() => {
    document.querySelectorAll(selector).forEach((row, i) => {
      row.style.opacity = '0';
      row.style.transition = `opacity .25s var(--ease-clinical) ${i * 25}ms`;
      requestAnimationFrame(() => { row.style.opacity = '1'; });
    });
  });
}

// ─────────────────────────────────────────────
// TRIAL DETAIL MODAL
// ─────────────────────────────────────────────

window._trialData = {};

window.openTrialModal = function(id) {
  const t = window._trialData[id];
  if (!t) return;

  const modal = document.getElementById('trialModal');
  if (!modal) return;

  const tmProtocol = document.getElementById('tmProtocol');
  const tmTitle = document.getElementById('tmTitle');
  const tmMeta = document.getElementById('tmMeta');
  if (tmProtocol) tmProtocol.textContent = t.protocol_id;
  if (tmTitle) tmTitle.textContent = t.title;

  const statusClass = STATUS_CLASS[t.status] || 'active';
  const statusLabel = STATUS_LABEL_EN[t.status] || t.status;
  const lineName = t.research_line?.name || '—';
  const lineNum  = t.research_line?.line_number ? `0${t.research_line.line_number}`.slice(-2) : '—';

  if (tmMeta) tmMeta.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:.3rem;">
      <div style="font-family:var(--ff-mono);font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;color:var(--text-on-light-3);">Status</div>
      <span class="status-badge ${statusClass}" style="width:fit-content;">
        <span lang="en">${statusLabel}</span><span lang="es">${t.status}</span>
      </span>
    </div>
    <div style="display:flex;flex-direction:column;gap:.3rem;">
      <div style="font-family:var(--ff-mono);font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;color:var(--text-on-light-3);">Phase</div>
      <span class="phase-badge" style="width:fit-content;">${escHtml(t.phase)}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:.3rem;">
      <div style="font-family:var(--ff-mono);font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;color:var(--text-on-light-3);">Research Line</div>
      <span style="font-size:.875rem;color:var(--text-on-light);">${escHtml(lineNum)} — ${escHtml(lineName)}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:.3rem;">
      <div style="font-family:var(--ff-mono);font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;color:var(--text-on-light-3);">Sponsor</div>
      <span style="font-size:.875rem;color:var(--text-on-light);">${t.sponsor_name ? escHtml(t.sponsor_name) : '—'}</span>
    </div>
    ${t.study_type ? `
    <div style="display:flex;flex-direction:column;gap:.3rem;">
      <div style="font-family:var(--ff-mono);font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;color:var(--text-on-light-3);">Study Type</div>
      <span style="font-size:.875rem;color:var(--text-on-light);">${escHtml(t.study_type)}</span>
    </div>` : ''}
    ${t.sponsor_type ? `
    <div style="display:flex;flex-direction:column;gap:.3rem;">
      <div style="font-family:var(--ff-mono);font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;color:var(--text-on-light-3);">Sponsor Type</div>
      <span style="font-size:.875rem;color:var(--text-on-light);">${escHtml(t.sponsor_type)}</span>
    </div>` : ''}
  `;

  // ── Registry verification: NCT / EudraCT links to official registries.
  // These are the identifiers a reviewer or pharma BD lead looks up to
  // confirm a trial is real and registered. Rendered only when present.
  const tmRegistry = document.getElementById('tmRegistry');
  if (tmRegistry) {
    const badges = [];
    if (t.nct_number) {
      const nct = String(t.nct_number).trim();
      badges.push(`<a href="https://clinicaltrials.gov/study/${encodeURIComponent(nct)}" target="_blank" rel="noopener" class="registry-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
        <span class="registry-badge-id">${escHtml(nct)}</span>
        <span class="registry-badge-src">ClinicalTrials.gov</span>
      </a>`);
    }
    if (t.eudract_number) {
      const eud = String(t.eudract_number).trim();
      const url = t.registry_url || `https://www.clinicaltrialsregister.eu/ctr-search/search?query=${encodeURIComponent(eud)}`;
      badges.push(`<a href="${escHtml(url)}" target="_blank" rel="noopener" class="registry-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
        <span class="registry-badge-id">${escHtml(eud)}</span>
        <span class="registry-badge-src">EU CTR · EudraCT</span>
      </a>`);
    }
    if (badges.length) {
      tmRegistry.innerHTML = `<div class="registry-label"><span lang="en">Registered &amp; verifiable</span><span lang="es">Registrado y verificable</span></div><div class="registry-badges">${badges.join('')}</div>`;
      tmRegistry.style.display = 'block';
    } else {
      tmRegistry.style.display = 'none';
    }
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeTrialModal = function() {
  const modal = document.getElementById('trialModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
};

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') window.closeTrialModal();
});
// ─────────────────────────────────────────────

// Shows a brief, visible validation message above the submit button —
// previously a missing name/email silently did nothing at all, since
// novalidate suppressed the browser's own warning and there was no
// fallback message of any kind.
function showFormError(form, text) {
  let el = form.querySelector('.form-error-msg');
  if (!el) {
    el = document.createElement('div');
    el.className = 'form-error-msg';
    el.style.cssText = 'padding:.625rem .875rem;margin-top:.75rem;border-radius:6px;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.25);color:#b91c1c;font-size:.8125rem;';
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.insertAdjacentElement('beforebegin', el);
    else form.appendChild(el);
  }
  el.textContent = text;
  el.style.display = '';
}

function initContactForm() {
  // Different pages use different form ids (index uses 'contactForm',
  // clinical uses 'researchForm', innovation uses 'innovForm') — check all of them.
  const form = document.getElementById('contactForm')
            || document.getElementById('researchForm')
            || document.getElementById('innovForm');
  if (!form) return;

  // Pre-fill context when arriving from a specific line.html page's
  // "Get in touch" link, instead of every line funneling to the exact
  // same blank, generic form with no record of which line prompted it.
  const lineParam = new URLSearchParams(window.location.search).get('line');
  if (lineParam) {
    const msgField = form.querySelector('[name="message"]');
    if (msgField && !msgField.value) {
      msgField.value = `Regarding: ${lineParam}\n\n`;
    }
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    const success = document.getElementById('formSuccess');
    const originalText = btn ? btn.innerHTML : '';

    // Collect fields by their `name` attribute. This is robust to each page's
    // own field order/layout, unlike reading by position (fields[0], fields[1]…),
    // which silently scrambles data whenever a page's form differs from the
    // original index.html layout this was written against.
    const data = {};
    form.querySelectorAll('[name]').forEach(el => {
      data[el.name] = el.value;
    });

    // Some pages (clinical, innovation) have a second dropdown — e.g. "Nature
    // of Inquiry" or "Partnership Model" — that doesn't have its own slot in
    // the backend's contact payload. Fold it into the free-text message
    // instead of silently dropping it.
    let message = data.message || '';
    if (data.secondary_topic) {
      message = `[${data.secondary_topic}]\n\n${message}`;
    }

    const payload = {
      name:             data.contact_name || '',
      organisation:     data.organisation || '',
      email:            data.email || '',
      area_of_interest: data.area_of_interest || '',
      message:          message
    };

    if (!payload.name || !payload.email) {
      showFormError(form, 'Please fill in your name and email before sending.');
      return;
    }

    // Loading state
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px;animation:spin .8s linear infinite;">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg> Sending…`;
    }

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');

      // Success
      form.reset();
      if (success) {
        success.classList.add('show');
        setTimeout(() => success.classList.remove('show'), 7000);
      }
    } catch (err) {
      console.error('Contact form error:', err);
      if (success) {
        success.style.background = 'rgba(220,38,38,.08)';
        success.style.borderColor = 'rgba(220,38,38,.2)';
        success.style.color = '#dc2626';
        success.textContent = 'Something went wrong. Please email us directly.';
        success.classList.add('show');
        setTimeout(() => {
          success.classList.remove('show');
          success.removeAttribute('style');
        }, 6000);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  });
}

// Add spin keyframe for loading button
if (!document.getElementById('api-spin-style')) {
  const s = document.createElement('style');
  s.id = 'api-spin-style';
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// 0. HEADER — RESEARCH LINES DROPDOWN
// Runs on every page (the header is shared). Lightweight — only
// line_number + short_name, no images/bios/trial counts needed here.
// ─────────────────────────────────────────────


async function loadFeaturedStories() {
  const section = document.getElementById('storySection');
  const skeleton = document.getElementById('storySkeleton');
  if (!section) return;

  try {
    const { data } = await apiFetch('/api/news/website?limit=8');
    const posts = data || [];

    if (!posts.length) {
      if (skeleton) skeleton.innerHTML = '<p style="color:var(--ink-3);font-size:.875rem;padding:2rem 0;">No posts available.</p>';
      return;
    }

    const typeLabel = {
      publication: 'Publication', article: 'Article',
      highlight: 'Highlight', update: 'Update', photo_story: 'Photo Story'
    };
    const typePill = {
      publication: 'pill-pub', article: 'pill-article',
      highlight: 'pill-highlight', update: 'pill-update', photo_story: 'pill-article'
    };

    function formatDate(d) {
      if (!d) return '';
      const dt = new Date(d);
      return dt.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    }

    // Hero candidate pool: featured posts first, top up to 4 with recent posts.
    // The hero never auto-rotates — publication titles take real reading time,
    // so the visitor drives this via dot indicators, not a timer.
    const featuredPool = posts.filter(p => p.is_featured);
    const heroPool = (featuredPool.length ? featuredPool : posts).slice(0, 4);
    let activeHeroIdx = 0;

    const MOTIF_SVG = `<div class="story-typographic-motif" aria-hidden="true"><svg viewBox="0 0 240 320" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" stroke-linecap="round">
        <path d="M40 320 L40 220" stroke-width="2.4" opacity="0.5"/>
        <path d="M40 220 L20 150" stroke-width="1.8" opacity="0.45"/>
        <path d="M40 220 L80 160" stroke-width="1.8" opacity="0.45"/>
        <path d="M20 150 L0 95" stroke-width="1.2" opacity="0.4"/>
        <path d="M20 150 L45 90" stroke-width="1.2" opacity="0.4"/>
        <path d="M80 160 L60 100" stroke-width="1.2" opacity="0.4"/>
        <path d="M80 160 L120 105" stroke-width="1.2" opacity="0.4"/>
        <path d="M0 95 L-15 45" stroke-width="0.8" opacity="0.35"/>
        <path d="M0 95 L20 40" stroke-width="0.8" opacity="0.35"/>
        <path d="M45 90 L30 35" stroke-width="0.8" opacity="0.35"/>
        <path d="M45 90 L70 38" stroke-width="0.8" opacity="0.35"/>
        <path d="M60 100 L45 45" stroke-width="0.8" opacity="0.35"/>
        <path d="M120 105 L105 50" stroke-width="0.8" opacity="0.35"/>
        <path d="M120 105 L150 55" stroke-width="0.8" opacity="0.35"/>
      </g>
      <g fill="currentColor">
        <circle cx="40" cy="220" r="2.4" opacity="0.4"/><circle cx="20" cy="150" r="2" opacity="0.4"/>
        <circle cx="80" cy="160" r="2" opacity="0.4"/><circle cx="0" cy="95" r="1.6" opacity="0.35"/>
        <circle cx="45" cy="90" r="1.6" opacity="0.35"/><circle cx="60" cy="100" r="1.6" opacity="0.35"/>
        <circle cx="120" cy="105" r="1.6" opacity="0.35"/>
      </g>
    </svg></div>`;

    function renderHero(feature) {
      const hasImg = !!feature.featured_image_url;
      const topArea = hasImg
        ? `<div class="story-main-img">
             <img src="${escHtml(feature.featured_image_url)}" alt="${escHtml(feature.title)}" loading="eager"/>
           </div>`
        : `<div class="story-main-typographic">
             ${MOTIF_SVG}
             ${feature.journal_name ? `<div class="story-typographic-journal">${escHtml(feature.journal_name)}</div>` : ''}
             <div class="story-typographic-title">${escHtml(feature.title)}</div>
           </div>`;

      const dotsHTML = heroPool.length > 1
        ? `<div class="story-dots" role="tablist" aria-label="More featured stories">
             ${heroPool.map((_, i) => `<button class="story-dot${i === activeHeroIdx ? ' active' : ''}" role="tab" aria-selected="${i === activeHeroIdx}" aria-label="Story ${i + 1} of ${heroPool.length}" data-idx="${i}"></button>`).join('')}
           </div>`
        : '';

      return `
        <div class="story-main">
          ${topArea}
          <div class="story-main-body">
            <span class="story-type-pill ${typePill[feature.post_type] || 'pill-article'}">
              ${typeLabel[feature.post_type] || feature.post_type}
              ${feature.is_featured ? ' · Featured' : ''}
            </span>
            ${hasImg ? `<div class="story-main-title">${escHtml(feature.title)}</div>` : ''}
            <div class="story-main-meta">
              ${feature.author?.full_name ? `<span>${escHtml(feature.author.full_name)}</span><span class="story-meta-sep">·</span>` : ''}
              ${feature.journal_name && !hasImg ? '' : feature.journal_name ? `<span style="color:var(--teal);font-weight:500;">${escHtml(feature.journal_name)}</span><span class="story-meta-sep">·</span>` : ''}
              <span>${formatDate(feature.published_at)}</span>
              ${feature.doi ? `<span class="story-meta-sep">·</span><a href="https://doi.org/${escHtml(feature.doi)}" target="_blank" rel="noopener">DOI</a>` : ''}
            </div>
            ${dotsHTML}
          </div>
        </div>`;
    }

    // Sidebar: always shows the same 4 non-hero posts (so content stays put while
    // reading), but a thin progress sliver auto-advances which item is "in focus" —
    // visible motion without ever changing what's on screen mid-read.
    function renderSidebar() {
      const sidebarPosts = posts.filter(p => !heroPool.some(h => h.id === p.id)).slice(0, 4);
      return `
        <div class="story-sidebar">
          ${sidebarPosts.map((p, i) => `
            <a class="story-side-item" href="/news" aria-label="${escHtml(p.title)}" data-side-idx="${i}">
              <div class="story-side-progress"><span></span></div>
              ${p.journal_name ? `<div class="story-side-journal">${escHtml(p.journal_name)}</div>` : ''}
              <div class="story-side-title">${escHtml(p.title)}</div>
              <div class="story-side-meta">${formatDate(p.published_at)}${p.author?.full_name ? ' · ' + escHtml(p.author.full_name) : ''}</div>
            </a>`).join('')}
        </div>`;
    }

    let sidebarTimer = null;
    let activeSideIdx = 0;

    function runSidebarProgress() {
      const items = section.querySelectorAll('.story-side-item');
      if (!items.length) return;
      items.forEach((item, i) => {
        item.classList.toggle('in-focus', i === activeSideIdx);
        const bar = item.querySelector('.story-side-progress > span');
        if (bar) {
          bar.style.transition = 'none';
          bar.style.width = i === activeSideIdx ? '0%' : (i < activeSideIdx ? '100%' : '0%');
        }
      });
      requestAnimationFrame(() => {
        const activeBar = section.querySelector(`.story-side-item[data-side-idx="${activeSideIdx}"] .story-side-progress > span`);
        if (activeBar) {
          activeBar.style.transition = 'width 6.5s linear';
          activeBar.style.width = '100%';
        }
      });
      clearTimeout(sidebarTimer);
      sidebarTimer = setTimeout(() => {
        activeSideIdx = (activeSideIdx + 1) % items.length;
        runSidebarProgress();
      }, 6500);
    }

    function render() {
      const layout = `<div class="story-layout" style="opacity:0;">${renderHero(heroPool[activeHeroIdx])}${renderSidebar()}</div>`;
      section.innerHTML = layout;
      requestAnimationFrame(() => {
        const l = section.querySelector('.story-layout');
        if (l) l.style.opacity = '1';
      });
      activeSideIdx = 0;
      runSidebarProgress();

      section.querySelectorAll('.story-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          const idx = parseInt(dot.dataset.idx, 10);
          if (idx === activeHeroIdx) return;
          const l = section.querySelector('.story-layout');
          if (l) {
            l.style.transition = 'opacity .3s ease';
            l.style.opacity = '0';
            setTimeout(() => { activeHeroIdx = idx; render(); }, 300);
          } else {
            activeHeroIdx = idx;
            render();
          }
        });
      });
    }

    render();

  } catch (err) {  
    console.error('Story section load failed:', err);
    if (skeleton) skeleton.innerHTML = '<p style="color:var(--ink-3);font-size:.875rem;padding:2rem 0;">Unable to load recent posts.</p>';
  }
}

// ─────────────────────────────────────────────
// 7. HOMEPAGE INNOVATION SPOTLIGHT
// /api/innovation-projects/website already only returns projects with
// featured_in_website=true (the publish gate). Within that set, prefer
// ones flagged is_featured (the homepage-spotlight pick, curated by an
// editor in neumDesk), same two-tier pattern as the news story section.
// ─────────────────────────────────────────────

const STAGE_LABEL = {
  'Idea': 'Concept', 'Prototipo': 'Prototype', 'Piloto': 'Pilot',
  'Validación': 'Validation', 'Escalamiento': 'Scaling', 'Comercialización': 'Commercialisation'
};

async function loadInnovationSpotlight() {
  const section = document.getElementById('spotlightSection');
  const skeleton = document.getElementById('spotlightSkeleton');
  if (!section) return;

  try {
    const { data } = await apiFetch('/api/innovation-projects/website');
    const projects = data || [];

    if (!projects.length) {
      // No published projects — hide the whole section rather than show an empty card
      const sec = document.getElementById('innovation-spotlight');
      if (sec) sec.style.display = 'none';
      return;
    }

    const featuredPool = projects.filter(p => p.is_featured);
    const spotlightPool = (featuredPool.length ? featuredPool : projects).slice(0, 4);
    let activeSpotlightIdx = 0;

    // Real count for the homepage "Partnering with us" section — built
    // from data already fetched here rather than a second request.
    const seekingCount = projects.filter(p => p.partner_found === false).length;
    const seekingEl = document.getElementById('seekingPartnerCount');
    if (seekingEl) {
      seekingEl.innerHTML = seekingCount > 0
        ? `<span lang="en">${seekingCount} open innovation project${seekingCount === 1 ? '' : 's'}</span><span lang="es">${seekingCount} proyecto${seekingCount === 1 ? '' : 's'} de innovación abierto${seekingCount === 1 ? '' : 's'}</span>`
        : `<span lang="en">Open innovation projects</span><span lang="es">Proyectos de innovación abiertos</span>`;
    }

    function renderSpotlight() {
      const p = spotlightPool[activeSpotlightIdx];
      const stageLabel = STAGE_LABEL[p.current_stage] || STAGE_LABEL[p.development_stage] || p.current_stage || '';
      const dotsHTML = spotlightPool.length > 1
        ? `<div class="story-dots" role="tablist" aria-label="More projects">
             ${spotlightPool.map((_, i) => `<button class="story-dot${i === activeSpotlightIdx ? ' active' : ''}" role="tab" aria-selected="${i === activeSpotlightIdx}" aria-label="Project ${i + 1} of ${spotlightPool.length}" data-idx="${i}"></button>`).join('')}
           </div>`
        : '';
      const html = `
        <div class="spotlight-card" style="opacity:0;">
          <span class="spotlight-stage-pill">
            ${escHtml(p.category || 'Project')}${stageLabel ? ' · ' + escHtml(stageLabel) : ''}
          </span>
          <div class="spotlight-title">${escHtml(p.title)}</div>
          ${p.description ? `<div class="spotlight-desc">${escHtml(p.description)}</div>` : ''}
          <div class="spotlight-meta">
            ${p.research_line?.name ? `<span>${escHtml(p.research_line.name)}</span><span>·</span>` : ''}
            <a href="/innovation">
              <span lang="en">Learn more</span><span lang="es">Saber más</span>
            </a>
          </div>
          ${dotsHTML}
        </div>`;
      section.innerHTML = html;
      requestAnimationFrame(() => {
        const card = section.querySelector('.spotlight-card');
        if (card) card.style.opacity = '1';
      });

      section.querySelectorAll('.story-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          const idx = parseInt(dot.dataset.idx, 10);
          if (idx === activeSpotlightIdx) return;
          const card = section.querySelector('.spotlight-card');
          if (card) {
            card.style.transition = 'opacity .3s ease';
            card.style.opacity = '0';
            setTimeout(() => { activeSpotlightIdx = idx; renderSpotlight(); }, 300);
          } else {
            activeSpotlightIdx = idx;
            renderSpotlight();
          }
        });
      });
    }

    renderSpotlight();

  } catch (err) {
    console.error('Innovation spotlight load failed:', err);
    if (skeleton) skeleton.innerHTML = '<p style="color:var(--ink-3);font-size:.875rem;padding:2rem 0;">Unable to load projects.</p>';
  }
}

// ─────────────────────────────────────────────
// 8. RESEARCH LINE DETAIL PAGE (line.html?id=<uuid>)
// One template, data-driven — see /api/research-lines/:id/website.
// Trials and publications are NOT fetched from that endpoint; they reuse
// the existing /api/clinical-trials/website?line=:id and
// /api/news/website?line=:id calls, same data source as clinical.html
// and news.html, so there's one source of truth.
// "About this line" only renders if a coordinator has actually written
// deep_content — an empty section is worse than no section.
// ─────────────────────────────────────────────


/* hero breathing gradient (respiratory identity, 5.5s tidal cycle) */
(() => {
  const c = document.getElementById('heroBg');
  if (!(c instanceof HTMLCanvasElement)) return;
  const ctx = c.getContext('2d'); if (!ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = 0;
  function frame() {
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const phase = reduce ? 0.5 : (Math.sin(t / 5500 * Math.PI * 2) + 1) / 2;
    const g = ctx.createLinearGradient(0, 0, c.width, c.height);
    g.addColorStop(0, '#07111F');
    g.addColorStop(0.5 + phase * 0.15, `rgba(12,68,124,${0.55 + phase * 0.25})`);
    g.addColorStop(1, '#0C3868');
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    if (!reduce) { t += 16; requestAnimationFrame(frame); }
  }
  frame();
})();

/* init — homepage */
loadResearchLines();
loadLiveStats();
loadFeaturedStories();
loadInnovationSpotlight();
