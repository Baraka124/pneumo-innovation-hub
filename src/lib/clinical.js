// ──────────────────────────────────────────────────────────────
// CLINICAL page controller.
// Only this page imports it, so other pages don't ship this code.
// All backend access goes through the shared apiFetch client.
// ──────────────────────────────────────────────────────────────
import { apiFetch, escHtml } from './api.js';
import { setLoading, setError, STATUS_CLASS, STATUS_LABEL_EN } from './ui.js';
import { initContact } from './contact.js';

const trialData = {};
let researchLineMap = {};

// ── Research lines (expandable accordion) + filter-line dropdown ──
async function loadResearchLines() {
  const list = document.getElementById('researchLinesList');
  if (!list) return;
  try {
    let data = await fetchList('researchLines');
    if (!data?.length) {
      await new Promise((r) => setTimeout(r, 800));
      data = await fetchList('researchLines');
    }
    if (!data?.length) {
      setError(list, 'Unable to load research lines right now. Please refresh the page.');
      return;
    }

    researchLineMap = {};
    data.forEach((line) => { researchLineMap[String(line.line_number)] = line.id; });

    const filterLineEl = document.getElementById('filterLine');
    if (filterLineEl && filterLineEl.options.length <= 1) {
      data.forEach((line) => {
        const num = String(line.line_number).padStart(2, '0');
        const shortName = line.name.split(',')[0].split('y ')[0].trim();
        const opt = document.createElement('option');
        opt.value = String(line.line_number);
        opt.textContent = `${num} — ${shortName}`;
        filterLineEl.appendChild(opt);
      });
    }

    list.innerHTML = data.map((line) => `
      <div class="line-card" id="line-${line.id}">
        <div class="line-head" onclick="toggleLine('line-${line.id}')">
          <div class="line-num">${String(line.line_number).padStart(2, '0')}</div>
          <div class="line-meta">
            ${line.coordinator?.full_name
              ? `<div class="line-coordinator"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="11" height="11"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><strong>${escHtml(line.coordinator.full_name)}</strong></div>`
              : ''}
            <div class="line-title">${escHtml(line.name)}</div>
          </div>
        </div>
        <div class="line-tags-preview">
          ${(line.keywords || []).map((k) => `<span class="ltag">${escHtml(k)}</span>`).join('')}
        </div>
        <div class="line-expand-toggle" onclick="toggleLine('line-${line.id}')">
          <span class="toggle-label"><span lang="en">Research scope &amp; capabilities</span><span lang="es">Alcance y capacidades</span></span>
          <div class="toggle-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M19 9l-7 7-7-7"/></svg></div>
        </div>
        <div class="line-body">
          <div class="line-body-inner">
            ${line.description ? `<p class="line-desc">${escHtml(line.description)}</p>` : ''}
            ${line.capabilities ? `<p class="line-desc" style="margin-top:.5rem;">${escHtml(line.capabilities)}</p>` : ''}
            <a href="/line/?id=${line.id}" class="btn-text" style="display:inline-flex;margin-top:.875rem;"><span lang="en">View full line page</span><span lang="es">Ver página completa</span> →</a>
          </div>
        </div>
      </div>`).join('');
  } catch (err) {
    setError(list);
  }
}

// ── Trials table ──────────────────────────────────────────────
async function loadTrials(filters = {}) {
  const tbody = document.getElementById('studiesBody');
  const countEl = document.getElementById('studiesCount');
  if (!tbody) return;
  setLoading(tbody, 6);

  const params = new URLSearchParams();
  if (filters.line && filters.line !== 'all') {
    const lineId = researchLineMap[filters.line];
    if (lineId) params.set('line', lineId);
  }
  if (filters.phase && filters.phase !== 'all') params.set('phase', filters.phase);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);

  try {
    const trials = await fetchList('trials', `?${params}`);
    if (countEl) countEl.textContent = trials.length;
    document.querySelectorAll('#studiesShown, #studiesShownEs').forEach((el) => (el.textContent = trials.length));

    if (!trials.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:#767676;font-size:.875rem;font-family:var(--ff-mono,monospace);"><span lang="en">No studies match the current filters.</span><span lang="es">No hay ensayos con los filtros actuales.</span></td></tr>`;
      return;
    }

    tbody.innerHTML = trials.map((t) => {
      trialData[t.id] = t;
      const statusClass = STATUS_CLASS[t.status] || 'active';
      const allLines = [t.research_line, ...(t.additional_lines || [])].filter(Boolean);
      const lineCell = allLines.length
        ? allLines.slice(0, 2).map((l) => `<span class="trial-line-tag" title="${escHtml(l.name)}" style="margin-right:4px;">L${String(l.line_number).padStart(2, '0')} · ${escHtml(l.short_name || l.name)}</span>`).join('') +
          (allLines.length > 2 ? `<span class="trial-line-tag">+${allLines.length - 2}</span>` : '')
        : '<span class="trial-line-tag">—</span>';
      return `
        <tr onclick="openTrialModal('${t.id}')" style="cursor:pointer;" title="Details">
          <td><span class="trial-protocol">${escHtml(t.protocol_id)}</span></td>
          <td><span class="trial-title">${escHtml(t.title)}</span></td>
          <td>${lineCell}</td>
          <td><span class="phase-badge">${escHtml(t.phase)}</span></td>
          <td><span class="status-badge ${statusClass}"><span lang="en">${STATUS_LABEL_EN[t.status] || t.status}</span><span lang="es">${t.status}</span></span></td>
          <td>${t.sponsor_name ? `<span style="font-size:.75rem;color:#767676;font-family:var(--ff-mono,monospace);">${escHtml(t.sponsor_name)}</span>` : '—'}</td>
        </tr>`;
    }).join('');
  } catch (err) {
    setError(tbody);
    if (countEl) countEl.textContent = '—';
  }
}

function initTrialFilters() {
  const filterLine = document.getElementById('filterLine');
  const filterPhase = document.getElementById('filterPhase');
  const filterStatus = document.getElementById('filterStatus');
  const filterSearch = document.getElementById('filterSearch');
  if (!filterLine && !filterPhase && !filterStatus) return;

  const getFilters = () => ({
    line: filterLine?.value || 'all',
    phase: filterPhase?.value || 'all',
    status: filterStatus?.value || 'all',
    search: filterSearch?.value || '',
  });
  const refresh = () => loadTrials(getFilters());

  filterLine?.addEventListener('change', refresh);
  filterPhase?.addEventListener('change', refresh);
  filterStatus?.addEventListener('change', refresh);
  let t;
  filterSearch?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(refresh, 380); });

  const urlSearch = new URLSearchParams(location.search).get('search');
  if (urlSearch && filterSearch) filterSearch.value = urlSearch;
  loadTrials(getFilters());
}

// ── Window hooks used by inline markup ─────────────────────────
window.toggleLine = (id) => document.getElementById(id)?.classList.toggle('open');

window.openTrialModal = (id) => {
  const t = trialData[id];
  const modal = document.getElementById('trialModal');
  if (!t || !modal) return;
  const set = (elId, v) => { const el = document.getElementById(elId); if (el) el.textContent = v; };
  set('tmProtocol', t.protocol_id);
  set('tmTitle', t.title);
  const statusClass = STATUS_CLASS[t.status] || 'active';
  const statusLabel = STATUS_LABEL_EN[t.status] || t.status;
  const lineName = t.research_line?.name || '—';
  const lineNum = t.research_line?.line_number ? `0${t.research_line.line_number}`.slice(-2) : '—';
  const tmMeta = document.getElementById('tmMeta');
  if (tmMeta) {
    const cell = (label, val) => `<div style="display:flex;flex-direction:column;gap:.3rem;"><div style="font-family:var(--ff-mono);font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;color:#767676;">${label}</div>${val}</div>`;
    tmMeta.innerHTML =
      cell('Status', `<span class="status-badge ${statusClass}" style="width:fit-content;"><span lang="en">${statusLabel}</span><span lang="es">${escHtml(t.status)}</span></span>`) +
      cell('Phase', `<span class="phase-badge" style="width:fit-content;">${escHtml(t.phase)}</span>`) +
      cell('Research Line', `<span style="font-size:.875rem;">${escHtml(lineNum)} — ${escHtml(lineName)}</span>`) +
      cell('Sponsor', `<span style="font-size:.875rem;">${t.sponsor_name ? escHtml(t.sponsor_name) : '—'}</span>`);
  }
  const tmReg = document.getElementById('tmRegistry');
  if (tmReg) {
    const badges = [];
    if (t.nct_number) badges.push(`<a href="https://clinicaltrials.gov/study/${encodeURIComponent(String(t.nct_number).trim())}" target="_blank" rel="noopener" class="registry-badge"><span class="registry-badge-id">${escHtml(String(t.nct_number).trim())}</span><span class="registry-badge-src">ClinicalTrials.gov</span></a>`);
    if (t.eudract_number) badges.push(`<a href="https://www.clinicaltrialsregister.eu/ctr-search/search?query=${encodeURIComponent(String(t.eudract_number).trim())}" target="_blank" rel="noopener" class="registry-badge"><span class="registry-badge-id">${escHtml(String(t.eudract_number).trim())}</span><span class="registry-badge-src">EU CTR</span></a>`);
    tmReg.innerHTML = badges.join('');
    tmReg.style.display = badges.length ? 'flex' : 'none';
  }
  const tmDesc = document.getElementById('tmDesc');
  if (tmDesc) {
    if (t.description) { tmDesc.textContent = t.description; tmDesc.style.display = 'block'; }
    else tmDesc.style.display = 'none';
  }
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeTrialModal = () => {
  const modal = document.getElementById('trialModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
};

// Contact section (expand/collapse + submit) via shared module.
initContact();

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.closeTrialModal(); });

// ── Boot ──────────────────────────────────────────────────────
(async () => {
  await loadResearchLines();  // must run first: fills researchLineMap + filter dropdown
  initTrialFilters();         // then load trials (calls loadTrials internally)
})();
