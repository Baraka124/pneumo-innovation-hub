/**
 * neumAC R&I — Website Data Layer
 * api.js — shared script loaded by all pages
 *  
 * Architecture:
 *   Website → Railway backend (public endpoints, no auth)
 *   App     → Railway backend (authenticated endpoints)
 *   Both    → same Supabase DB (one source of truth)
 *
 * Public endpoints:
 *   GET /api/research-lines/website
 *   GET /api/clinical-trials/website?line=&phase=&status=&search= 
 *   GET /api/innovation-projects/website
 *   GET /api/news/website?type=&line=
 */

const API_BASE = 'https://neumac-manage-back-end-production.up.railway.app';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

/** Inject shared styles once — using new design palette */
if (!document.getElementById('api-js-styles')) {
  const s = document.createElement('style');
  s.id = 'api-js-styles';
  s.textContent = `
    @keyframes skeleton-pulse {
      0%,100%{opacity:.35} 50%{opacity:.7}
    }
    .api-skeleton {
      background: #E0DDD8;
      border-radius: 4px;
      animation: skeleton-pulse 1.4s ease-in-out infinite;
      pointer-events: none;
    }
    .api-skeleton-dark {
      background: rgba(255,255,255,.08);
      border-radius: 4px;
      animation: skeleton-pulse 1.4s ease-in-out infinite;
      pointer-events: none;
    }
    .api-error {
      padding: 2rem;
      text-align: center;
      color: #767676;
      font-size: .8125rem;
      font-family: var(--ff-mono, monospace);
    }
    .api-error svg { margin: 0 auto .75rem; display: block; opacity: .4; }
    tr[onclick]:hover td { background: var(--teal-lt, #E6F7F7); }
  `;
  document.head.appendChild(s);
}

/** Skeleton loader — light for light sections, dark for dark sections */
function setLoading(el, rows = 3, dark = false) {
  const cls = dark ? 'api-skeleton-dark' : 'api-skeleton';
  // tbody only accepts tr elements — use tr/td skeleton for tables
  if (el.tagName === 'TBODY') {
    el.innerHTML = Array(rows).fill(
      `<tr>${Array(6).fill(`<td><div class="${cls}" style="height:14px;border-radius:3px;"></div></td>`).join('')}</tr>`
    ).join('');
  } else {
    el.innerHTML = Array(rows).fill(
      `<div class="${cls}" style="height:52px;margin-bottom:2px;"></div>`
    ).join('');
  }
}

function setError(el, msg = 'Could not load data. Please try again later.') {
  el.innerHTML = `
    <div class="api-error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="20" height="20">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
      ${msg}
    </div>`;
}

// ─────────────────────────────────────────────
// STATUS / CATEGORY MAPS
// ─────────────────────────────────────────────

const STATUS_CLASS = {
  'Reclutando':     'recruiting',
  'Activo':         'active',
  'Completado':     'completed',
  'En preparación': 'prep'
};

const STATUS_LABEL_EN = {
  'Reclutando':     'Recruiting',
  'Activo':         'Active',
  'Completado':     'Completed',
  'En preparación': 'In Preparation'
};

const CATEGORY_CLASS = {
  'Dispositivo':           'cat-device',
  'Salud Digital':         'cat-digital',
  'IA / ML':               'cat-ai',
  'Tecnología Quirúrgica': 'cat-surgical'
};

const CATEGORY_ICON = {
  'Dispositivo':           `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="9" height="9"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M7 7h2l1 3 2-6 1 3h3"/></svg>`,
  'Salud Digital':         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="9" height="9"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>`,
  'IA / ML':               `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="9" height="9"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6" y2="6"/><line x1="6" y1="18" x2="6" y2="18"/></svg>`,
  'Tecnología Quirúrgica': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="9" height="9"><path d="M20 7l-9 9-4-4 9-9 4 4z"/><path d="M4 20l1-4"/></svg>`
};

// ─────────────────────────────────────────────
// PAGE DETECTION
// ─────────────────────────────────────────────

const PAGE = (() => {
  const p = location.pathname.split('/').pop() || 'index.html';
  if (p.startsWith('clinical'))   return 'clinical';
  if (p.startsWith('innovation')) return 'innovation';
  if (p.startsWith('news'))       return 'news';
  if (p.startsWith('team'))       return 'team';
  return 'index';
})();

// ─────────────────────────────────────────────
// 1. RESEARCH LINES (index.html + clinical.html)
// ─────────────────────────────────────────────

async function loadResearchLines() {
  const indexGrid    = document.getElementById('researchLinesGrid');
  const clinicalList = document.getElementById('researchLinesList');

  if (!indexGrid && !clinicalList) return;

  try {
    const { data } = await apiFetch('/api/research-lines/website');
    if (!data?.length) return;

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

      indexGrid.innerHTML = data.map((line, i) => {
        const num = String(line.line_number).padStart(2, '0');
        const isNew = line.is_new || false;
        const numCell = isNew
          ? `<div class="line-num" style="display:flex;flex-direction:column;gap:4px;align-items:flex-start;">
               <span class="lt-new" style="font-size:.5rem;padding:.15rem .4rem;">
                 <span lang="en">New</span><span lang="es">Nueva</span>
               </span>
             </div>`
          : `<div class="line-num">${num}</div>`;

        return `
          <a href="clinical.html#research-lines" class="line-card">
            ${numCell}
            <div class="line-body">
              <div class="line-title">${escHtml(line.name)}</div>
              ${line.coordinator?.full_name
                ? `<div class="line-coord-new">${escHtml(line.coordinator.full_name)}</div>`
                : ''}
            </div>
            <div class="line-arrow-new">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px;">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </a>`;
      }).join('');

      // Update stat counters
      _setStat('statLines', data.length);
    }

    // ── CLINICAL: expandable accordion ──────────────────────────────
    // Build line_number -> id map for trial filter
    window._researchLineMap = {};
    data.forEach(line => { window._researchLineMap[String(line.line_number)] = line.id; });

    if (clinicalList) {
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
            </div>
          </div>
        </div>`
      ).join('');
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

async function loadTrials(filters = {}) {
  const tbody   = document.getElementById('studiesBody');
  const countEl = document.getElementById('studiesCount');
  if (!tbody) return;

  setLoading(tbody, 6);

  const params = new URLSearchParams();
  if (filters.line && filters.line !== 'all') {
    // Map line number to UUID using cached research lines data
    const lineId = window._researchLineMap && window._researchLineMap[filters.line];
    if (lineId) params.set('line', lineId);
  }
  if (filters.phase  && filters.phase  !== 'all') params.set('phase',  filters.phase);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);

  try {
    const { data } = await apiFetch(`/api/clinical-trials/website?${params}`);
    const trials = data || [];

    if (countEl) countEl.textContent = trials.length;

    const studiesShown   = document.getElementById('studiesShown');
    const studiesShownEs = document.getElementById('studiesShownEs');
    if (studiesShown)   studiesShown.textContent   = trials.length;
    if (studiesShownEs) studiesShownEs.textContent = trials.length;

    if (!trials.length) {
      tbody.innerHTML = `
        <tr><td colspan="6" style="text-align:center;padding:2.5rem;color:var(--text-on-light-3,#767676);font-size:.875rem;font-family:var(--ff-mono,monospace);">
          <span lang="en">No studies match the current filters.</span>
          <span lang="es">No hay ensayos con los filtros actuales.</span>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = trials.map(t => {
      window._trialData[t.id] = t;
      const statusClass = STATUS_CLASS[t.status] || 'active';
      const lineName    = t.research_line?.name || '—';
      return `
        <tr onclick="openTrialModal('${t.id}')" style="cursor:pointer;" title="Click for details">
          <td><span class="trial-protocol">${escHtml(t.protocol_id)}</span></td>
          <td><span class="trial-title">${escHtml(t.title)}</span></td>
          <td><span class="trial-line-tag">${escHtml(lineName)}</span></td>
          <td><span class="phase-badge">${escHtml(t.phase)}</span></td>
          <td>
            <span class="status-badge ${statusClass}">
              <span lang="en">${STATUS_LABEL_EN[t.status] || t.status}</span>
              <span lang="es">${t.status}</span>
            </span>
          </td>
          <td>${t.sponsor_name
            ? `<span style="font-size:.75rem;color:var(--text-on-light-3,#767676);font-family:var(--ff-mono,monospace);">${escHtml(t.sponsor_name)}</span>`
            : `<span style="color:var(--text-on-light-3,#767676)">—</span>`
          }</td>
        </tr>`;
    }).join('');

    _fadeInRows('#studiesBody tr');

  } catch (err) {
    console.error('Trials load failed:', err);
    setError(tbody);
    if (countEl) countEl.textContent = '—';
  }
}

function initTrialFilters() {
  const filterLine   = document.getElementById('filterLine');
  const filterPhase  = document.getElementById('filterPhase');
  const filterStatus = document.getElementById('filterStatus');
  const filterSearch = document.getElementById('filterSearch');

  if (!filterLine && !filterPhase && !filterStatus) return;

  const getFilters = () => ({
    line:   filterLine?.value   || 'all',
    phase:  filterPhase?.value  || 'all',
    status: filterStatus?.value || 'all',
    search: filterSearch?.value || ''
  });

  const refresh = () => loadTrials(getFilters());

  filterLine?.addEventListener('change', refresh);
  filterPhase?.addEventListener('change', refresh);
  filterStatus?.addEventListener('change', refresh);

  let searchTimer;
  filterSearch?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refresh, 380);
  });

  loadTrials(getFilters());
}

// ─────────────────────────────────────────────
// 3. INNOVATION PROJECTS (innovation.html)
// ─────────────────────────────────────────────

async function loadProjects() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;

  setLoading(grid, 4, true); // dark section

  try {
    const { data } = await apiFetch('/api/innovation-projects/website');
    const projects = data || [];

    if (!projects.length) {
      setError(grid, 'No active projects at this time.');
      return;
    }

    grid.innerHTML = projects.map((p, i) => {
      const catClass = CATEGORY_CLASS[p.category] || 'cat-device';
      const catIcon  = CATEGORY_ICON[p.category]  || CATEGORY_ICON['Dispositivo'];
      const delay    = i % 2 === 0 ? '' : ' reveal-d1';
      return `
        <div class="project-card reveal${delay}">
          <div class="project-top">
            <span class="project-cat-badge ${catClass}">
              ${catIcon}
              ${escHtml(p.category)}
            </span>
            ${p.development_stage ? `<span class="stage-badge">${escHtml(p.development_stage)}</span>` : ''}
          </div>
          <h3 class="project-title">${escHtml(p.title)}</h3>
          <p class="project-desc">${escHtml(p.description)}</p>
          ${p.partner_needs?.length
            ? `<p class="project-needs-label">
                 <span lang="en">Partner Needs</span>
                 <span lang="es">Necesidades del Socio</span>
               </p>
               <div class="project-needs">
                 ${p.partner_needs.map(n => `<span class="pneed">${escHtml(n)}</span>`).join('')}
               </div>`
            : ''}
        </div>`;
    }).join('');

    requestAnimationFrame(() => {
      grid.querySelectorAll('.reveal').forEach(el => {
        setTimeout(() => el.classList.add('in'), 50);
      });
    });

  } catch (err) {
    console.error('Projects load failed:', err);
    setError(grid);
  }
}

// ─────────────────────────────────────────────
// 4. NEWS (news.html)
// ─────────────────────────────────────────────

async function loadNews(filters = {}) {
  // Support both old 'newsFeed' and new 'blogFeed' element ids
  const feed = document.getElementById('blogFeed') || document.getElementById('newsFeed');
  if (!feed) return;

  // New blog page has its own skeleton (#feedSkeleton) — only inject if old layout
  if (!document.getElementById('feedSkeleton')) {
    feed.innerHTML = Array(4).fill('').map((_, i) => `
      <div style="padding:1.5rem;border-bottom:1px solid rgba(0,0,0,.07);opacity:${1 - i * 0.15}">
        <div class="api-skeleton" style="width:60px;height:12px;margin-bottom:12px;border-radius:3px;"></div>
        <div class="api-skeleton" style="width:85%;height:16px;margin-bottom:8px;border-radius:3px;animation-delay:${i * 0.07}s;"></div>
        <div class="api-skeleton" style="width:50%;height:11px;border-radius:3px;animation-delay:${i * 0.07 + 0.05}s;"></div>
      </div>`).join('');
  }

  const params = new URLSearchParams();
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  if (filters.line) params.set('line', filters.line);

  try {
    const { data } = await apiFetch(`/api/news/website?${params}`);
    window._newsAllPosts = data || [];
    if (typeof window.onNewsLoaded === 'function') window.onNewsLoaded();
  } catch (err) {
    console.error('News load failed:', err);
    setError(feed, 'Could not load posts. Please try again later.');
  }
}

// ─────────────────────────────────────────────
// 5. TEAM (team.html)
// ─────────────────────────────────────────────

async function loadTeam() {
  const grid = document.getElementById('teamGrid');
  if (!grid) return;

  setLoading(grid, 6);

  try {
    const { data } = await apiFetch('/api/team/website');
    const members = data || [];

    if (!members.length) {
      setError(grid, 'Team information coming soon.');
      return;
    }

    grid.innerHTML = members.map(m => {
      const initials = m.full_name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
      const lineTag  = m.coordinates_line
        ? `<span class="team-line-tag">L${String(m.coordinates_line.line_number).padStart(2,'0')} — ${escHtml(m.coordinates_line.name)}</span>`
        : '';
      const affTag = m.is_external
        ? `<span class="team-affil-tag">${escHtml(m.primary_dept_name || 'Affiliated')}</span>`
        : '';

      return `
        <div class="team-card">
          <div class="team-avatar">
            ${m.public_photo_url
              ? `<img src="${escHtml(m.public_photo_url)}" alt="${escHtml(m.full_name)}" loading="lazy">`
              : `<span class="team-initials">${initials}</span>`}
          </div>
          <div class="team-body">
            <div class="team-name">${escHtml(m.full_name)}</div>
            ${m.specialization ? `<div class="team-spec">${escHtml(m.specialization)}</div>` : ''}
            ${affTag}
            ${lineTag}
            ${m.public_bio ? `<p class="team-bio">${escHtml(m.public_bio)}</p>` : ''}
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('Team load failed:', err);
    setError(grid);
  }
}

// ─────────────────────────────────────────────
// LIVE STATS (index.html hero panel)
// ─────────────────────────────────────────────

async function loadLiveStats() {
  if (PAGE !== 'index') return;
  try {
    const linesRes = await apiFetch('/api/research-lines/website');
    const lineCount = linesRes.data?.length || 0;
    if (lineCount > 0) _setStat('statLines', lineCount);

    try {
      const trialsRes = await apiFetch('/api/clinical-trials/website');
      const trialCount = trialsRes.data?.length || 0;
      if (trialCount > 0) _setStat('statTrials', trialCount + '+');
    } catch { /* keep static fallback */ }
  } catch (err) {
    console.warn('Live stats not available:', err.message);
  }
}

/** Update any element with id matching statId */
function _setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
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

function _fadeInRows(selector) {
  requestAnimationFrame(() => {
    document.querySelectorAll(selector).forEach((row, i) => {
      row.style.opacity = '0';
      row.style.transition = `opacity .25s ease ${i * 25}ms`;
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

  document.getElementById('tmProtocol').textContent = t.protocol_id;
  document.getElementById('tmTitle').textContent = t.title;

  const statusClass = STATUS_CLASS[t.status] || 'active';
  const statusLabel = STATUS_LABEL_EN[t.status] || t.status;
  const lineName = t.research_line?.name || '—';
  const lineNum  = t.research_line?.line_number ? `0${t.research_line.line_number}`.slice(-2) : '—';

  document.getElementById('tmMeta').innerHTML = `
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

  const descEl = document.getElementById('tmDesc');
  if (t.description) {
    descEl.textContent = t.description;
    descEl.style.display = 'block';
  } else {
    descEl.style.display = 'none';
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

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const btn = form.querySelector('button[type="submit"]');
    const success = document.getElementById('formSuccess');
    const originalText = btn ? btn.innerHTML : '';

    // Get field values
    const inputs = form.querySelectorAll('input, select, textarea');
    const data = {};
    inputs.forEach(el => {
      const label = el.closest('.form-group')?.querySelector('label')?.textContent?.trim().toLowerCase() || el.type;
      if (el.name) {
        data[el.name] = el.value;
      }
    });

    // Collect by position — matches form field order
    const fields = form.querySelectorAll('input, select, textarea');
    const payload = {
      name:             fields[0]?.value || '',
      organisation:     fields[1]?.value || '',
      email:            fields[2]?.value || '',
      area_of_interest: fields[3]?.value || '',
      message:          fields[4]?.value || ''
    };

    if (!payload.name || !payload.email) return;

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

document.addEventListener('DOMContentLoaded', () => {
  switch (PAGE) {
    case 'index':
      loadResearchLines();
      loadLiveStats();
      initContactForm();
      break;
    case 'clinical':
      loadResearchLines();
      initTrialFilters();
      initContactForm();
      break;
    case 'innovation':
      loadProjects();
      initContactForm();
      break;
    case 'news':
      loadNews();
      break;
    case 'team':
      loadTeam();
      break;
  }
});
