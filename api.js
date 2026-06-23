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
  if (p.startsWith('line'))       return 'line';
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
        const displayName = line.short_name || line.name;
        const trialBadge = line.active_trials > 0
          ? `<span class="line-tag">${line.active_trials} active</span>` : '';
        const coord = line.coordinator;
        let coordBlock = '';
        if (coord?.full_name) {
          const initials = coord.full_name.split(' ').filter(w=>w&&!['Dr.','Dra.','Prof.'].includes(w)).slice(0,2).map(n=>n[0]).join('').toUpperCase();
          const avatar = coord.public_photo_url
            ? `<img src="${escHtml(coord.public_photo_url)}" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
            : `<span style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#085041 0%,#0F6E56 55%,#185FA5 100%);display:inline-flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;font-weight:700;font-size:8px;color:rgba(255,255,255,.96);flex-shrink:0;">${escHtml(initials)}</span>`;
          coordBlock = `<div class="line-coord" style="display:flex;align-items:center;gap:.5rem;">${avatar}<span>${escHtml(coord.full_name)}</span></div>`;
        }
        return `
          <a href="line.html?id=${line.id}" class="line-card reveal">
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
              <a href="line.html?id=${line.id}" class="btn-text" style="display:inline-flex;margin-top:.875rem;"><span lang="en">View full line page</span><span lang="es">Ver página completa de la línea</span> →</a>
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
      const allLines = [t.research_line, ...(t.additional_lines || [])].filter(Boolean);
      const lineCell = allLines.length
        ? allLines.slice(0, 2).map(l => `<span class="trial-line-tag" title="${escHtml(l.name)}" style="margin-right:4px;">L${String(l.line_number).padStart(2,'0')} · ${escHtml(l.short_name || l.name)}</span>`).join('') +
          (allLines.length > 2 ? `<span class="trial-line-tag" title="${escHtml(allLines.slice(2).map(l => l.name).join(', '))}">+${allLines.length - 2}</span>` : '')
        : '<span class="trial-line-tag">—</span>';
      return `
        <tr onclick="openTrialModal('${t.id}')" style="cursor:pointer;" title="Click for details">
          <td><span class="trial-protocol">${escHtml(t.protocol_id)}</span></td>
          <td><span class="trial-title">${escHtml(t.title)}</span></td>
          <td>${lineCell}</td>
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

// ─────────────────────────────────────────────
// TEAM PAGE — two targeted functions
// ─────────────────────────────────────────────

const EXPERTISE_MAP = {
  '04c82d53': ['Lung Transplant','PAH','ILD / IPF','CLAD'],
  '09ed9240': ['Severe Asthma','COPD','Biologics','Bronchiectasis','CF'],
  '97c8ee3f': ['EBUS-TBNA','Lung Cancer','Cryobiopsy','Bronchoscopy'],
  'e1cbfedb': ['NIV','Critical Care','Sleep Medicine','Home O₂'],
  '5d329d71': ['VATS','RATS','Thoracic Oncology','ERATS'],
  'c290a7e5': ['Precision Medicine','AI / Digital Health','Rare Diseases','AAT'],
};
function _getExpertise(id) {
  const prefix = (id||'').replace(/-/g,'').slice(0,8);
  return EXPERTISE_MAP[prefix] || [];
}

async function loadTeamLeads() {
  const grid = document.getElementById('leadsGrid');
  if (!grid) return;
  try {
    const { data } = await apiFetch('/api/team/website');
    const leads = (data||[]).filter(m => m.coordinates_line)
      .sort((a,b) => {
        if (a.is_chief_of_department && !b.is_chief_of_department) return -1;
        if (!a.is_chief_of_department && b.is_chief_of_department) return 1;
        return (a.coordinates_line?.line_number||99) - (b.coordinates_line?.line_number||99);
      });
    if (!leads.length) { grid.innerHTML = '<p class="state-empty">Research lead profiles coming soon.</p>'; return; }
    grid.innerHTML = leads.map((m,i) => {
      const initials = (m.full_name||'').split(' ').filter(w=>w&&!['Dr.','Dra.','Prof.'].includes(w)).slice(0,2).map(n=>n[0]).join('').toUpperCase();
      const lineNum = m.coordinates_line?.line_number ? String(m.coordinates_line.line_number).padStart(2,'0') : '';
      const lineName = m.coordinates_line?.name || '';
      const expertise = _getExpertise(m.id);
      const isAffiliated = m.is_external;
      const avatarArea = m.public_photo_url
        ? `<img src="${escHtml(m.public_photo_url)}" alt="${escHtml(m.full_name)}" style="width:100%;height:100%;object-fit:cover;"/>`
        : `<span class="lead-initials">${initials}</span>`;

      // Research-focus tags only — role/seniority (Chief, PI) moved to the
      // name area as plain text, since "JEFE DE SERVICIO" is a title, not
      // a topic, and competing for attention with real expertise tags
      // diluted both.
      const tags = expertise.map(t=>`<span class="lead-tag">${escHtml(t)}</span>`).join('');

      const roleLine = [
        m.is_chief_of_department ? `<span lang="en">Department Chief</span><span lang="es">Jefe de Servicio</span>` : '',
        m.can_be_pi ? `<span lang="en">Principal Investigator</span><span lang="es">Investigador Principal</span>` : '',
      ].filter(Boolean).join(' · ');

      // Publication list — the genuine variable-depth element. Someone
      // with 6 papers gets a real list with overflow; someone with 1
      // gets exactly that, no padding, no invented stat tiles.
      // Note: deliberately NOT showing a trial/study count here — that
      // figure was derived from the coordinator's *line*, not personal
      // PI/co-investigator involvement (which isn't recorded in the
      // database yet), so it would overstate what's actually verified.
      const pubs = m.recent_pubs || [];
      const pubCount = m.publication_count || pubs.length;
      const pubList = pubs.length
        ? `<div class="lead-pubs">
             <p class="lead-pubs-label"><span lang="en">${pubCount} ${pubCount === 1 ? 'publication' : 'publications'}</span><span lang="es">${pubCount} ${pubCount === 1 ? 'publicación' : 'publicaciones'}</span></p>
             ${pubs.map(p => `
               <div class="lead-pub-row">
                 <span class="lp-year">${p.year || ''}</span>
                 <span class="lp-title-inline">${escHtml(p.title)}</span>
                 ${p.doi ? `<a href="https://doi.org/${escHtml(p.doi)}" target="_blank" rel="noopener" class="lp-doi-inline">DOI →</a>` : ''}
               </div>`).join('')}
             ${pubCount > pubs.length ? `<a href="news.html" class="ls-link" style="display:inline-block;margin-top:.5rem;"><span lang="en">+${pubCount - pubs.length} more →</span><span lang="es">+${pubCount - pubs.length} más →</span></a>` : ''}
           </div>`
        : '';

      const partnerNote = m.seeking_partner
        ? `<a href="innovation.html" class="ls-link" style="display:inline-flex;align-items:center;gap:.4rem;margin-top:.625rem;">
             <span class="ls-dot" style="background:#d97706;"></span>
             <span lang="en">Seeking innovation partner</span><span lang="es">Buscando socio innovador</span> →
           </a>`
        : '';
      const delayClass = i > 0 ? ` reveal-d${Math.min(i,3)}` : '';
      return `<div class="lead-row reveal${delayClass}">
        <div class="lead-visual">
          <div class="lead-avatar" data-line="L${lineNum}" aria-hidden="true">${avatarArea}</div>
          ${lineNum ? `<span class="lead-line-num">L${lineNum}</span>` : ''}
        </div>
        <div class="lead-copy">
          <div class="lead-name">${escHtml(m.display_name || m.full_name)}</div>
          <div class="lead-spec">${roleLine ? roleLine + ' · ' : ''}${m.specialization ? escHtml(m.specialization) : ''}${isAffiliated?' · '+escHtml(m.primary_dept_name||'External'):' · Neumología, CHUAC'}</div>
          ${lineName ? `<div class="lead-line-name">${escHtml(lineName)}</div>` : ''}
          ${m.public_bio ? `<p class="lead-bio">${escHtml(trimBioRolePrefix(m.public_bio))}</p>` : ''}
          ${tags ? `<div class="lead-tags">${tags}</div>` : ''}
          ${pubList}
          ${partnerNote}
        </div>
      </div>`;
    }).join('');
    if (window._revealObserver) grid.querySelectorAll('.reveal').forEach(el=>window._revealObserver.observe(el));
  } catch(err) { console.error('Leads load failed:',err); grid.innerHTML='<p class="state-empty">Unable to load team profiles.</p>'; }
}

async function loadTeamGroup() {
  const grid = document.getElementById('teamGroup');
  if (!grid) return;
  try {
    const { data } = await apiFetch('/api/team/website');
    const group = (data||[]).filter(m => !m.coordinates_line);
    if (!group.length) { grid.style.display='none'; return; }
    const roleLabel = { attending_physician:'Attending Physician', medical_resident:'Resident', fellow:'Fellow', nurse_practitioner:'Nurse Practitioner', studies_coordinator:'Studies Coordinator', data_manager:'Data Manager', labtech:'Lab Technician', biomedical_engineer:'Biomedical Engineer', administrator:'Administrator' };
    grid.innerHTML = group.map(m => {
      const initials = (m.full_name||'').split(' ').filter(w=>w&&!['Dr.','Dra.','Prof.'].includes(w)).slice(0,2).map(n=>n[0]).join('').toUpperCase();
      const role = roleLabel[m.staff_type] || m.staff_type;
      return `<div class="team-member">
        <div class="tm-avatar">${m.public_photo_url ? `<img src="${escHtml(m.public_photo_url)}" alt="${escHtml(m.full_name)}" style="width:36px;height:36px;object-fit:cover;border-radius:2px;"/>` : initials}</div>
        <div style="min-width:0;">
          <div class="tm-name">${escHtml(m.display_name || m.full_name)}</div>
          <div class="tm-role">${escHtml(role)}</div>
          ${m.specialization ? `<div class="tm-spec">${escHtml(m.specialization)}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch(err) { console.error('Team group load failed:',err); if (grid) grid.innerHTML = '<p class="state-empty">Unable to load team list.</p>'; }
}

// Legacy loadTeam() — used by clinical.html #teamGrid.
// Excludes line coordinators — they already get a full profile card
// via loadTeamLeads() above this section; showing them again here in
// a flatter card was straight duplication, same person twice on one page.
async function loadTeam() {
  if (PAGE === 'team') return;
  const grid = document.getElementById('teamGrid');
  if (!grid) return;
  try {
    const { data } = await apiFetch('/api/team/website');
    const members = (data || []).filter(m => !m.coordinates_line);
    if (!members.length) { grid.innerHTML='<p style="padding:2rem;color:#6B6B6B;font-size:.875rem;">Team information coming soon.</p>'; return; }
    grid.innerHTML = members.map(m => {
      const initials = (m.full_name||'').split(' ').filter(w=>w&&!['Dr.','Dra.','Prof.'].includes(w)).slice(0,2).map(n=>n[0]).join('').toUpperCase();
      const lineTag = m.coordinates_line ? `<span class="tca-line">L${String(m.coordinates_line.line_number).padStart(2,'0')} — ${escHtml(m.coordinates_line.name)}</span>` : '';
      const affiliTag = m.is_external ? `<span class="tca-affil">${escHtml(m.primary_dept_name||'Affiliated')}</span>` : '';
      return `<div class="team-card-api">
        <div class="tca-avatar">${m.public_photo_url ? `<img src="${escHtml(m.public_photo_url)}" alt="${escHtml(m.full_name)}" style="width:40px;height:40px;object-fit:cover;border-radius:3px;">` : initials}</div>
        <div style="flex:1;min-width:0;">
          <div class="tca-name">${escHtml(m.display_name || m.full_name)}</div>
          ${m.specialization ? `<div class="tca-spec">${escHtml(m.specialization)}</div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.375rem;">${lineTag}${affiliTag}</div>
          ${m.public_bio ? `<p class="tca-bio">${escHtml(trimBioRolePrefix(m.public_bio))}</p>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch(err) { console.error('Team load failed:',err); grid.innerHTML='<p style="padding:2rem;color:#6B6B6B;">Unable to load team information.</p>'; }
}

// ─────────────────────────────────────────────
// 7. TEAM PAGE — PUBLICATION STRIP
// Horizontal scrolling journal index.
// NOT a duplicate of news.html — no body text.
// ─────────────────────────────────────────────

async function loadPublicationStrip() {
  const inner = document.getElementById('pubStripInner');
  const countEl = document.getElementById('pubCount');
  if (!inner) return;

  try {
    const { data } = await apiFetch('/api/news/website?type=publication&limit=30');
    const pubs = (data || []).filter(p => p.journal_name);

    if (!pubs.length) { inner.innerHTML = '<div class="pub-card" style="color:rgba(255,255,255,.4);font-size:.875rem;padding:2rem;">No publications available.</div>'; return; }

    inner.innerHTML = pubs.map(p => {
      const year = p.published_at ? new Date(p.published_at).getFullYear() : '';
      const authorLine = p.authors_text ? p.authors_text.split(';')[0].trim() + (p.authors_text.includes(';') ? ' et al.' : '') : (p.author?.full_name || '');
      return `
        <div class="pub-card">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;">
            <span class="pub-journal">${escHtml(p.journal_name)}</span>
            <span class="pub-year">${year}</span>
          </div>
          <div class="pub-title">${escHtml(p.title)}</div>
          ${authorLine ? `<div class="pub-authors">${escHtml(authorLine)}</div>` : ''}
          ${p.doi
            ? `<a href="https://doi.org/${escHtml(p.doi)}" target="_blank" rel="noopener" class="pub-doi-link">DOI →</a>`
            : `<a href="news.html" class="pub-doi-link"><span lang="en">View</span><span lang="es">Ver</span> →</a>`}
        </div>`;
    }).join('');

    if (countEl) countEl.textContent = `${pubs.length} publications`;

    // Scroll controls
    const scroll = document.getElementById('pubScroll');
    const prev = document.getElementById('pubPrev');
    const next = document.getElementById('pubNext');
    const STEP = 280;
    if (prev) prev.addEventListener('click', () => scroll.scrollBy({left:-STEP,behavior:'smooth'}));
    if (next) next.addEventListener('click', () => scroll.scrollBy({left: STEP,behavior:'smooth'}));

  } catch (err) {
    console.error('Publication strip failed:', err);
  }
}

// ─────────────────────────────────────────────
// 8. TEAM PAGE — OPEN OPPORTUNITIES
// Recruiting trials + innovation projects seeking partners.
// Unique content — not shown elsewhere.
// ─────────────────────────────────────────────

async function loadOpportunities() {
  const grid = document.getElementById('oppsGrid');
  const section = document.getElementById('opportunities');
  if (!grid) return;

  try {
    const [trialsRes, projectsRes] = await Promise.all([
      apiFetch('/api/clinical-trials/website'),
      apiFetch('/api/innovation-projects/website'),
    ]);

    const recruiting = (trialsRes.data || []).filter(t =>
      ['Reclutando','Recruiting'].includes(t.status)
    );
    const seekingProjects = (projectsRes.data || []).filter(p =>
      p.funding_status === 'seeking'
    );

    if (!recruiting.length && !seekingProjects.length) return; // keep section hidden

    if (section) section.style.display = '';

    const trialCards = recruiting.slice(0, 4).map(t => `
      <div class="opp-card">
        <span class="opp-type opp-type--trial">${escHtml(t.phase || 'Clinical Study')} · <span lang="en">Recruiting</span><span lang="es">Reclutando</span></span>
        <div class="opp-title">${escHtml(t.title || t.study_id || '—')}</div>
        <div class="opp-meta">${t.sponsor ? escHtml(t.sponsor) : ''}</div>
        <a href="clinical.html" class="opp-link">
          <span lang="en">View study</span><span lang="es">Ver estudio</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:10px;height:10px;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>`).join('');

    const projCards = seekingProjects.slice(0, 2).map(p => `
      <div class="opp-card">
        <span class="opp-type opp-type--inno"><span lang="en">Innovation · Seeking partner</span><span lang="es">Innovación · Buscando socio</span></span>
        <div class="opp-title">${escHtml(p.title || '—')}</div>
        <div class="opp-meta">${p.current_stage ? escHtml(p.current_stage.charAt(0).toUpperCase() + p.current_stage.slice(1)) : ''}</div>
        <a href="innovation.html" class="opp-link">
          <span lang="en">View project</span><span lang="es">Ver proyecto</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:10px;height:10px;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>`).join('');

    grid.innerHTML = trialCards + projCards;

  } catch (err) {
    console.error('Opportunities load failed:', err);
  }
}

async function loadLiveStats() {
  if (PAGE !== 'index') return;
  try {
    const linesRes = await apiFetch('/api/research-lines/website');
    const lineCount = linesRes.data?.length || 0;
    if (lineCount > 0) {
      _setStat('statLines', lineCount);
      // Sum active trials across all lines
      const totalActive = linesRes.data.reduce((sum, l) => sum + (l.active_trials || 0), 0);
      if (totalActive > 0) {
        _setStat('statTrials', totalActive + '+');
        _setStat('statTrials2', totalActive + '+');
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
    } catch { /* keep static fallback */ }

  } catch (err) {
    console.warn('Live stats not available:', err.message);
  }
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
  // Different pages use different form ids (index uses 'contactForm',
  // clinical uses 'researchForm', innovation uses 'innovForm') — check all of them.
  const form = document.getElementById('contactForm')
            || document.getElementById('researchForm')
            || document.getElementById('innovForm');
  if (!form) return;

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

// ─────────────────────────────────────────────
// 0. HEADER — RESEARCH LINES DROPDOWN
// Runs on every page (the header is shared). Lightweight — only
// line_number + short_name, no images/bios/trial counts needed here.
// ─────────────────────────────────────────────

async function loadHeaderResearchDropdown() {
  const menu = document.getElementById('hdrResearchLines');
  if (!menu) return;
  try {
    const { data } = await apiFetch('/api/research-lines/website');
    const lines = data || [];
    if (!lines.length) { menu.innerHTML = ''; return; }
    menu.innerHTML = lines.map(l => `
      <a class="hdr-dd-item" href="line.html?id=${l.id}">
        <span class="hdr-dd-num">L${String(l.line_number).padStart(2,'0')}</span>
        <span class="hdr-dd-name">${escHtml(l.short_name || l.name)}</span>
      </a>`).join('')
      + `<a class="hdr-dd-all" href="clinical.html#research-lines">
           <span lang="en">View all ${lines.length} lines</span><span lang="es">Ver las ${lines.length} líneas</span> →
         </a>`;
  } catch (err) {
    console.error('Header research dropdown failed:', err);
  }
}

// Click-to-toggle dropdown (replaces hover, which doesn't work on touch and
// reads ambiguously — hovering shows the open state without any deliberate
// action having happened). Closes on outside click, Escape, or selecting
// an item.
function initHeaderDropdown() {
  const dd = document.querySelector('.hdr-dd');
  if (!dd) return;
  const chevron = dd.querySelector('.hdr-dd-chevron');
  if (!chevron) return;

  function close() { dd.classList.remove('open'); chevron.setAttribute('aria-expanded', 'false'); }
  function open() { dd.classList.add('open'); chevron.setAttribute('aria-expanded', 'true'); }

  chevron.addEventListener('click', (e) => {
    e.preventDefault();
    dd.classList.contains('open') ? close() : open();
  });

  document.addEventListener('click', (e) => {
    if (!dd.contains(e.target)) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  dd.addEventListener('click', (e) => {
    if (e.target.closest('.hdr-dd-item, .hdr-dd-all')) close();
  });
}

// ─────────────────────────────────────────────
// 5b. CONTACT FORM TRIGGER TOGGLE
// Used by the form-trigger card on clinical.html and innovation.html —
// expands/collapses the form body and flips aria-expanded. Called via
// inline onclick="openContactForm('id','id')" in the HTML, so it must be
// global. Was referenced but never defined — this was throwing
// "openContactForm is not defined" on every click.
// ─────────────────────────────────────────────

window.openContactForm = function(triggerId, bodyId) {
  const trigger = document.getElementById(triggerId);
  const body = document.getElementById(bodyId);
  if (!trigger || !body) return;

  const isOpen = body.classList.contains('open');
  if (isOpen) {
    body.classList.remove('open');
    body.style.maxHeight = '0';
    trigger.setAttribute('aria-expanded', 'false');
  } else {
    body.classList.add('open');
    body.style.maxHeight = body.scrollHeight + 'px';
    trigger.setAttribute('aria-expanded', 'true');
    setTimeout(() => { body.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 150);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadHeaderResearchDropdown();
  initHeaderDropdown();
  switch (PAGE) {
    case 'index':
      loadResearchLines();
      loadLiveStats();
      loadFeaturedStories();
      loadInnovationSpotlight();
      initContactForm();
      break;
    case 'clinical':
      loadResearchLines();
      loadTeam();
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
      loadTeamLeads();
      loadTeamGroup();
      loadPublicationStrip();
      loadOpportunities();
      break;
    case 'line':
      loadLineDetail();
      break;
  }
});

// ─────────────────────────────────────────────
// 6. HOMEPAGE STORY SECTION
// Fetches featured posts first, fills remainder from recent public posts
// Renders Feature (left) + Sidebar (right 4) layout
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
            <a class="story-side-item" href="news.html" aria-label="${escHtml(p.title)}" data-side-idx="${i}">
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
            <a href="innovation.html">
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

async function loadLineDetail() {
  const params = new URLSearchParams(location.search);
  const lineId = params.get('id');
  const loadingEl   = document.getElementById('lineLoadingState');
  const notFoundEl  = document.getElementById('lineNotFound');
  const heroEl      = document.getElementById('lineHero');

  if (!lineId) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (notFoundEl) notFoundEl.style.display = '';
    return;
  }

  try {
    const { data: line } = await apiFetch(`/api/research-lines/${lineId}/website`);
    if (!line) throw new Error('not found');

    if (loadingEl) loadingEl.style.display = 'none';
    if (heroEl) heroEl.style.display = '';

    // Page title / description, since this is one template for six lines
    const titleText = `${line.short_name || line.name} | neumACt R&I`;
    document.title = titleText;
    const titleTag = document.getElementById('pageTitle');
    if (titleTag) titleTag.textContent = titleText;
    const descTag = document.getElementById('pageDescription');
    if (descTag && line.description) descTag.setAttribute('content', line.description);

    // Hero
    const eyebrowEl = document.getElementById('lineEyebrow');
    if (eyebrowEl) {
      eyebrowEl.innerHTML = `<span lang="en">Research line ${String(line.line_number).padStart(2,'0')}</span><span lang="es">Línea de investigación ${String(line.line_number).padStart(2,'0')}</span>`;
    }
    const titleEl = document.getElementById('lineTitle');
    if (titleEl) titleEl.textContent = line.name || line.short_name;

    const pillsEl = document.getElementById('lineStatPills');
    if (pillsEl) {
      const pills = [];
      if (line.active_trials > 0) {
        pills.push(`<span class="hstat-label" style="background:rgba(255,255,255,.12);color:#fff;padding:.4rem .8rem;border-radius:var(--r-sm);font-size:var(--fs-label);"><span lang="en">${line.active_trials} recruiting ${line.active_trials===1?'trial':'trials'}</span><span lang="es">${line.active_trials} ${line.active_trials===1?'ensayo':'ensayos'} en reclutamiento</span></span>`);
      }
      if (line.active_projects > 0) {
        pills.push(`<span class="hstat-label" style="background:rgba(255,255,255,.12);color:#fff;padding:.4rem .8rem;border-radius:var(--r-sm);font-size:var(--fs-label);"><span lang="en">${line.active_projects} active ${line.active_projects===1?'project':'projects'}</span><span lang="es">${line.active_projects} ${line.active_projects===1?'proyecto':'proyectos'} activo${line.active_projects===1?'':'s'}</span></span>`);
      }
      pillsEl.innerHTML = pills.join('');
    }

    const keywordsEl = document.getElementById('lineKeywords');
    if (keywordsEl && line.keywords && line.keywords.length) {
      keywordsEl.innerHTML = line.keywords.map(k =>
        `<span style="font-family:var(--ff-mono);font-size:var(--fs-label);letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.65);">${escHtml(k)}</span>`
      ).join('<span style="color:rgba(255,255,255,.3);margin:0 -.05rem;">·</span>');
    }

    // Coordinator — first, visually distinguished row in the merged
    // "People" section (larger avatar, chief/PI badge), not a separate
    // bordered card with its own design language.
    const peopleSection = document.getElementById('linePeopleSection');
    const coordCard = document.getElementById('lineCoordinatorCard');
    if (line.coordinator && peopleSection && coordCard) {
      const c = line.coordinator;
      const initials = (c.full_name||'').split(' ').filter(w=>w&&!['Dr.','Dra.','Prof.'].includes(w)).slice(0,2).map(n=>n[0]).join('').toUpperCase();
      const avatar = c.public_photo_url
        ? `<img src="${escHtml(c.public_photo_url)}" alt="${escHtml(c.full_name)}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
        : `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#005F5F 0%,#007A7A 55%,#3D8FD6 100%);box-shadow:0 1px 2px rgba(0,40,40,.08),0 4px 14px rgba(0,95,95,.16);display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;font-weight:700;font-size:16px;color:rgba(255,255,255,.96);flex-shrink:0;">${escHtml(initials)}</div>`;

      // Every real role this person holds gets its own badge — these are
      // independent facts (chief, PI, and line coordinator are not
      // mutually exclusive), not a single slot picking the "best" one.
      // Previously an if/else-if meant a chief who was also a PI never
      // had that second, equally true fact shown at all.
      const roleBadges = [
        c.is_chief_of_department ? `<span class="hstat-label" style="background:var(--blue-50);color:var(--navy-2);padding:.3rem .7rem;border-radius:var(--r-sm);font-size:var(--fs-label);"><span lang="en">Department Chief</span><span lang="es">Jefe de Servicio</span></span>` : '',
        c.can_be_pi ? `<span class="hstat-label" style="background:var(--blue-50);color:var(--navy-2);padding:.3rem .7rem;border-radius:var(--r-sm);font-size:var(--fs-label);"><span lang="en">Principal Investigator</span><span lang="es">Investigador Principal</span></span>` : '',
      ].filter(Boolean).join('');

      coordCard.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:.5rem;padding-bottom:1.25rem;border-bottom:1px solid var(--border-l);">
          <div style="display:flex;gap:1rem;align-items:flex-start;">
            ${avatar}
            <div style="flex:1;min-width:0;">
              <p style="font-weight:500;font-size:var(--fs-body-sm);margin:0;">${escHtml(c.title ? c.title + ' ' + c.full_name : c.full_name)}</p>
              <p style="font-size:var(--fs-label);color:var(--ink-3);margin:2px 0 0;">
                <span lang="en">Coordinator, this line</span><span lang="es">Coordinador de esta línea</span>${c.specialization ? ' · ' + escHtml(c.specialization) : ''}
              </p>
              <p style="font-size:var(--fs-label);color:var(--ink-4);margin:2px 0 0;">
                <span lang="en">Servicio de Neumología, CHUAC</span><span lang="es">Servicio de Neumología, CHUAC</span>
              </p>
            </div>
          </div>
          ${roleBadges ? `<div style="display:flex;gap:.5rem;flex-wrap:wrap;padding-left:calc(56px + 1rem);">${roleBadges}</div>` : ''}
        </div>`;
      peopleSection.style.display = '';
    }

    // About this line — description/capabilities/keywords are real,
    // populated fields on every line, so this renders unconditionally.
    // deep_content (long-form, written by a coordinator) is additional,
    // optional substance — shown as a second block only once it exists,
    // not the only thing gating this section.
    const aboutSection = document.getElementById('lineAboutSection');
    const aboutContent = document.getElementById('lineAboutContent');
    if (aboutSection && aboutContent) {
      let html = '';
      if (line.description) {
        html += `<p style="margin-bottom:1.5rem;">${escHtml(line.description)}</p>`;
      }
      if (line.capabilities) {
        const caps = line.capabilities.split(',').map(c => c.trim()).filter(Boolean);
        if (caps.length) {
          html += `<div style="display:flex;flex-wrap:wrap;gap:.4rem .25rem;margin-bottom:${line.deep_content ? '2rem' : '0'};">
            ${caps.map(c => `<span class="ltag">${escHtml(c)}</span>`).join('')}
          </div>`;
        }
      }
      if (line.deep_content) {
        html += `<div style="border-top:1px solid var(--border-l);padding-top:1.5rem;">
          ${line.deep_content.split(/\n\n+/).map(p => `<p style="margin-bottom:1.25rem;">${escHtml(p)}</p>`).join('')}
        </div>`;
      }
      if (html) {
        aboutContent.innerHTML = html;
        aboutSection.style.display = '';
      }

      // Quick-facts panel — sits beside the About text, breaking the
      // full-width band rhythm. Uses only real, already-fetched counts;
      // no invented "established" date or similar, since that's not
      // a real field anywhere in this data.
      const factsEl = document.getElementById('lineQuickFacts');
      if (factsEl) {
        const facts = [
          { num: line.total_trials || 0, labelEn: line.total_trials === 1 ? 'Clinical trial' : 'Clinical trials', labelEs: line.total_trials === 1 ? 'Ensayo clínico' : 'Ensayos clínicos' },
          { num: line.total_projects || 0, labelEn: line.total_projects === 1 ? 'Innovation project' : 'Innovation projects', labelEs: line.total_projects === 1 ? 'Proyecto de innovación' : 'Proyectos de innovación' },
        ].filter(f => f.num > 0);
        if (facts.length) {
          factsEl.innerHTML = facts.map((f, i) => `
            <div style="${i > 0 ? 'border-top:1px solid var(--border-l);margin-top:1rem;padding-top:1rem;' : ''}">
              <p style="font-family:var(--ff-display);font-size:1.75rem;font-weight:700;margin:0;line-height:1;">${f.num}</p>
              <p style="font-size:var(--fs-label);color:var(--ink-3);margin-top:.25rem;"><span lang="en">${f.labelEn}</span><span lang="es">${f.labelEs}</span></p>
            </div>`).join('');
          factsEl.style.display = '';
        }
      }
    }

    // Track record — discrete, asserted facts about this line's standing.
    // Only renders if populated; this is content someone has to actually
    // write and stand behind, not something derivable from other fields.
    const trackSection = document.getElementById('lineTrackRecordSection');
    const trackList = document.getElementById('lineTrackRecordList');
    if (trackSection && trackList && line.track_record && line.track_record.length) {
      trackList.innerHTML = line.track_record.map(item =>
        `<li class="ltr-item"><span class="ltr-mark">—</span><span>${escHtml(item)}</span></li>`
      ).join('');
      trackSection.style.display = '';
    }

    // Active trials — reuses the existing public trials endpoint, filtered by line
    const trialsSection = document.getElementById('lineTrialsSection');
    const trialsList = document.getElementById('lineTrialsList');
    try {
      const { data: trials } = await apiFetch(`/api/clinical-trials/website?line=${lineId}`);
      const activeTrials = (trials || []).filter(t => ['Reclutando','Activo','Active','Recruiting'].includes(t.status));
      if (activeTrials.length && trialsSection && trialsList) {
        trialsList.innerHTML = activeTrials.slice(0, 6).map((t, i) => `
          <a href="clinical.html#research-lines" class="lt-trial-row" style="${i > 0 ? 'border-top:1px solid var(--border-l);' : ''}">
            <span class="lt-trial-phase">${escHtml(t.phase || 'Clinical study')}</span>
            <span class="lt-trial-title">${escHtml(t.title || t.protocol_id || '—')}</span>
            <svg class="lt-trial-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>`).join('');
        trialsSection.style.display = '';
      }
    } catch (err) { console.error('Line trials load failed:', err); }

    // Team on this line — derived from trial/project investigators and
    // explicit research_line_members, server-side. Coordinator excluded
    // here since they're already shown, distinguished, just above.
    // Full-bleed photo cards: the photo fills the whole card, the name
    // overlays directly on it like a real photo credit, rather than a
    // small circular avatar sitting beside a block of text. A real
    // photo drops in with zero markup change — gradient+initials is
    // just today's fallback for this same card shape, not the design.
    const teamChips = document.getElementById('lineTeamChips');
    if (line.team && line.team.length && peopleSection && teamChips) {
      const teamWithoutCoordinator = line.team.filter(m => m.id !== line.coordinator?.id);
      teamChips.innerHTML = teamWithoutCoordinator.map((m) => {
        const initials = (m.full_name||'').split(' ').filter(w=>w&&!['Dr.','Dra.','Prof.'].includes(w)).slice(0,2).map(n=>n[0]).join('').toUpperCase();
        const photoFill = m.public_photo_url
          ? `style="background-image:url('${escHtml(m.public_photo_url)}');background-size:cover;background-position:center;"`
          : `style="background:linear-gradient(135deg,#085041 0%,#0F6E56 55%,#185FA5 100%);"`;
        const roleText = m.role_on_line ? escHtml(m.role_on_line)
          : m.is_chief_of_department ? '<span lang="en">Department Chief</span><span lang="es">Jefe de Servicio</span>'
          : m.can_be_pi ? '<span lang="en">Principal Investigator</span><span lang="es">Investigador Principal</span>'
          : (m.specialization ? escHtml(m.specialization) : '');
        return `<div class="line-team-card" ${photoFill}>
          ${!m.public_photo_url ? `<span class="line-team-initials">${escHtml(initials)}</span>` : ''}
          <div class="line-team-overlay">
            <p class="line-team-name">${escHtml(m.title ? m.title + ' ' + m.full_name : m.full_name)}</p>
            ${roleText ? `<p class="line-team-role">${roleText}</p>` : ''}
          </div>
        </div>`;
      }).join('');
      peopleSection.style.display = '';
    }

    // Recent publications for this line
    const pubsSection = document.getElementById('linePubsSection');
    const pubsList = document.getElementById('linePubsList');
    try {
      const { data: pubs } = await apiFetch(`/api/news/website?type=publication&line=${lineId}&limit=5`);
      if (pubs && pubs.length && pubsSection && pubsList) {
        pubsList.innerHTML = pubs.map((p, i) => {
          const year = p.published_at ? new Date(p.published_at).getFullYear() : '';
          return `<div style="padding:1rem 0;${i > 0 ? 'border-top:1px solid var(--border-l);' : ''}">
            <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;">
              ${p.journal_name ? `<span style="font-size:var(--fs-label);color:var(--navy-2);font-weight:500;">${escHtml(p.journal_name)}</span>` : '<span></span>'}
              <span style="font-size:var(--fs-label);color:var(--ink-4);">${year}</span>
            </div>
            <p style="font-size:var(--fs-meta);margin:0;">${escHtml(p.title)}</p>
          </div>`;
        }).join('');
        pubsSection.style.display = '';
      }
    } catch (err) { console.error('Line publications load failed:', err); }

  } catch (err) {
    console.error('Research line load failed:', err.message);
    if (loadingEl) loadingEl.style.display = 'none';
    if (notFoundEl) notFoundEl.style.display = '';
  }
}
