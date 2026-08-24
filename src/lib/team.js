// TEAM page controller: leads, full grid, constellation graph,
// publications strip, opportunities, and the profile modal.
// Ported from api.js; shared helpers come from api.js + ui.js.
import { apiFetch, escHtml } from './api.js';
import { buildAvatar, trimBioRolePrefix } from './ui.js';
const PAGE = 'team';

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
    const data = await fetchList('team');
    const leads = (data||[]).filter(m => m.coordinates_line)
      .sort((a,b) => {
        if (a.is_chief_of_department && !b.is_chief_of_department) return -1;
        if (!a.is_chief_of_department && b.is_chief_of_department) return 1;
        return (a.coordinates_line?.line_number||99) - (b.coordinates_line?.line_number||99);
      });
    if (!leads.length) { grid.innerHTML = '<p class="state-empty">Research lead profiles coming soon.</p>'; return; }
    grid.style.transition = 'none';
    grid.style.opacity = '0';
    grid.innerHTML = leads.map((m,i) => {
      const initials = (m.full_name||'').split(' ').filter(w=>w&&!['Dr.','Dra.','Prof.'].includes(w)).slice(0,2).map(n=>n[0]).join('').toUpperCase();
      const lineNum = m.coordinates_line?.line_number ? String(m.coordinates_line.line_number).padStart(2,'0') : '';
      const lineName = m.coordinates_line?.name || '';
      const expertise = _getExpertise(m.id);
      const isAffiliated = m.is_external;
      const leadInitialsId = 'lav' + Math.random().toString(36).slice(2, 9);
      const avatarArea = m.public_photo_url
        ? `<img src="${escHtml(m.public_photo_url)}" alt="${escHtml(m.full_name)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.style.display='none';document.getElementById('${leadInitialsId}').style.display='inline';"/><span id="${leadInitialsId}" class="lead-initials" style="display:none;">${initials}</span>`
        : `<span class="lead-initials">${initials}</span>`;

      // Research-focus tags only — role/seniority (Chief, PI) moved to the
      // name area as plain text, since "JEFE DE SERVICIO" is a title, not
      // a topic, and competing for attention with real expertise tags
      // diluted both.
      const tags = expertise.map(t=>`<span class="lead-tag">${escHtml(t)}</span>`).join('');

      const roleLine = [
        m.is_chief_of_department ? `<span lang="en">Department Chief</span><span lang="es">Jefe de Servicio</span>` : '',
        m.id === 'c290a7e5-7bea-4652-a0ef-251fbc73184d'
          ? `<span lang="en">Principal Investigator, neumACt</span><span lang="es">Investigador Principal, neumACt</span>`
          : (m.can_be_pi ? `<span lang="en">Principal Investigator</span><span lang="es">Investigador Principal</span>` : ''),
      ].filter(Boolean).join(' · ');

      // The department chief is also the PI of the platform's own
      // flagship line — that's the single most important institutional
      // fact on this page, and it deserves to be read before anything
      // else, not buried in the small muted spec line alongside their
      // medical specialization. A dedicated banner replaces roleLine
      // for this one card; everyone else keeps the existing inline
      // treatment, which is the right amount of weight for their role.
      const isChiefCard = !!m.is_chief_of_department;
      const roleBanner = isChiefCard
        ? `<div class="lead-role-banner">${roleLine.replace(' · ', ' <span class="rb-sep">|</span> ')}</div>`
        : '';

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
             ${pubCount > pubs.length ? `<a href="/news" class="ls-link" style="display:inline-block;margin-top:.5rem;"><span lang="en">+${pubCount - pubs.length} more →</span><span lang="es">+${pubCount - pubs.length} más →</span></a>` : ''}
           </div>`
        : '';

      const partnerNote = m.seeking_partner
        ? `<a href="/innovation" class="ls-link" style="display:inline-flex;align-items:center;gap:.4rem;margin-top:.625rem;">
             <span class="ls-dot" style="background:#d97706;"></span>
             <span lang="en">Seeking innovation partner</span><span lang="es">Buscando socio innovador</span> →
           </a>`
        : '';

      // Build the spec line as distinct, non-overlapping facts joined by
      // vertical bars -- not string concatenation that assumed
      // specialization and department affiliation would never say the
      // same thing. When someone's specialization literally is
      // "Neumología" at the Servicio de Neumología, the old fallback
      // text produced "Neumología · Neumología, CHUAC".
      const specParts = [];
      if (!isChiefCard && roleLine) specParts.push(roleLine);
      if (m.specialization) specParts.push(escHtml(m.specialization));
      if (isAffiliated) {
        specParts.push(escHtml(m.primary_dept_name || 'External'));
      } else if (!(m.specialization && /neumolog/i.test(m.specialization))) {
        specParts.push('Neumología, CHUAC');
      }
      const specLine = specParts.join(' <span class="lead-spec-sep">|</span> ');

      const delayClass = i > 0 ? ` reveal-d${Math.min(i,3)}` : '';
      const chiefClass = isChiefCard ? ' lead-chief' : '';
      return `<div class="lead-row${chiefClass} reveal${delayClass}">
        <div class="lead-visual">
          <div class="lead-avatar" data-line="L${lineNum}" aria-hidden="true">${avatarArea}</div>
          ${lineNum ? `<span class="lead-line-num">L${lineNum}</span>` : ''}
        </div>
        <div class="lead-copy">
          ${roleBanner}
          <div class="lead-name">${escHtml(m.display_name || m.full_name)}</div>
          <div class="lead-spec">${specLine}</div>
          ${lineName ? `<div class="lead-line-name">${escHtml(lineName)}</div>` : ''}
          ${m.public_bio ? `<p class="lead-bio">${escHtml(trimBioRolePrefix(m.public_bio))}</p>` : ''}
          ${tags ? `<div class="lead-tags">${tags}</div>` : ''}
          ${pubList}
          ${partnerNote}
        </div>
      </div>`;
    }).join('');
    requestAnimationFrame(() => { grid.style.transition = 'opacity .22s var(--ease-clinical)'; grid.style.opacity = '1'; });
    if (window._revealObserver) grid.querySelectorAll('.reveal').forEach(el=>window._revealObserver.observe(el));
  } catch(err) { console.error('Leads load failed:',err); grid.innerHTML='<p class="state-empty">Unable to load team profiles.</p>'; }
}

/* Person structured data for the whole team, injected once members
   load (the roster is API-driven, so this can't live statically in
   the HTML head). Each member becomes a schema.org Person affiliated
   with the department; ORCID becomes sameAs where present — the
   standard way research-group members get machine-readably linked to
   their institution and identifier graph. */
function injectTeamSchema(members) {
  if (document.getElementById('teamPersonSchema') || !members.length) return;
  const persons = members.map(m => {
    const p = {
      '@type': 'Person',
      'name': m.full_name || m.display_name,
      'affiliation': { '@type': 'MedicalOrganization',
        'name': 'Servicio de Neumología — Hospital Universitario A Coruña' }
    };
    if (m.specialization) p.jobTitle = m.specialization;
    if (m.orcid_id) p.sameAs = 'https://orcid.org/' + String(m.orcid_id).trim();
    if (m.public_photo_url) p.image = m.public_photo_url;
    return p;
  });
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'teamPersonSchema';
  s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': persons });
  document.head.appendChild(s);
}

/* PHASE 2 · 5 — The group as a constellation. Research groups ARE
   networks; this shows it. Deterministic radial layout (no physics,
   no jitter between visits): line hubs evenly spaced on an outer
   ring, each hub's coordinator placed just inside it, remaining
   members as a quiet inner orbit around the department core.
   Hovering a hub brightens its edge + lead. Pure SVG from the same
   two endpoints the page already calls. */
async function loadTeamConstellation() {
  const host = document.getElementById('teamConstellation');
  const wrap = document.getElementById('constellationWrap');
  if (!host || !wrap) return;
  try {
    const [linesRes, teamRes] = await Promise.all([
      apiFetch('/api/research-lines/website'),
      apiFetch('/api/team/website')
    ]);
    const lines = linesRes.data || [];
    const team = teamRes.data || [];
    if (lines.length < 2) return;

    const W = 900, H = 560, cx = W/2, cy = H/2;
    const Rhub = 215, Rcoord = 150, Rorbit = 78;
    const others = team.filter(m => !m.coordinates_line);
    let edges = '', hubs = '', coords = '', orbit = '';

    lines.forEach((l, i) => {
      const a = -Math.PI/2 + (i / lines.length) * Math.PI * 2;
      const hx = cx + Math.cos(a)*Rhub, hy = cy + Math.sin(a)*Rhub;
      const kx = cx + Math.cos(a)*Rcoord, ky = cy + Math.sin(a)*Rcoord;
      const num = 'L' + String(l.line_number).padStart(2,'0');
      const name = escHtml(l.short_name || l.name || '');
      const coordName = l.coordinator?.full_name ? escHtml(l.coordinator.full_name) : '';
      const g = 'cg' + i;
      edges += `<line class="const-edge" data-g="${g}" x1="${cx}" y1="${cy}" x2="${kx.toFixed(1)}" y2="${ky.toFixed(1)}"/>`;
      edges += `<line class="const-edge" data-g="${g}" x1="${kx.toFixed(1)}" y1="${ky.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}"/>`;
      if (coordName) coords += `
        <g class="const-coord" data-g="${g}">
          <circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="6"/>
          <text x="${kx.toFixed(1)}" y="${(ky + (hy>cy?18:-12)).toFixed(1)}">${coordName}</text>
        </g>`;
      hubs += `
        <a href="/line/?id=${l.id}" class="const-hub" data-g="${g}">
          <circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="17"/>
          <text class="const-hub-num" x="${hx.toFixed(1)}" y="${(hy+4).toFixed(1)}">${num}</text>
          <text class="const-hub-name" x="${hx.toFixed(1)}" y="${(hy + (hy>cy?36:-26)).toFixed(1)}">${name}</text>
        </a>`;
    });

    others.forEach((m, i) => {
      const a = (i / Math.max(others.length,1)) * Math.PI * 2 + 0.35;
      const ox = cx + Math.cos(a)*Rorbit, oy = cy + Math.sin(a)*Rorbit;
      orbit += `<circle class="const-member" cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="3.2"><title>${escHtml(m.full_name || '')}</title></circle>`;
    });

    host.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">
      <style>
        .const-edge{stroke:rgba(255,255,255,.14);stroke-width:1;transition:stroke .25s;}
        .const-hub circle{fill:rgba(0,179,179,.14);stroke:#00B3B3;stroke-width:1.4;transition:fill .25s;}
        .const-hub:hover circle,.const-hub:focus circle{fill:rgba(0,179,179,.4);}
        .const-hub-num{fill:#fff;font:600 11px 'DM Mono',monospace;text-anchor:middle;}
        .const-hub-name{fill:rgba(255,255,255,.55);font:500 11px 'DM Sans',sans-serif;text-anchor:middle;}
        .const-coord circle{fill:#fff;opacity:.75;transition:opacity .25s;}
        .const-coord text{fill:rgba(255,255,255,.45);font:400 10px 'DM Sans',sans-serif;text-anchor:middle;transition:fill .25s;}
        .const-member{fill:rgba(255,255,255,.30);}
        circle.const-core{fill:rgba(0,179,179,.9);}
        text.const-core-t{fill:rgba(255,255,255,.7);font:600 10px 'DM Mono',monospace;text-anchor:middle;letter-spacing:.1em;}
        g[data-lit="1"] .const-edge, .const-edge[data-lit="1"]{stroke:rgba(0,179,179,.75);}
      </style>
      <g id="constEdges">${edges}</g>
      ${orbit}
      <circle class="const-core" cx="${cx}" cy="${cy}" r="8"/>
      <text class="const-core-t" x="${cx}" y="${cy-16}">NEUMOLOGÍA</text>
      ${coords}
      ${hubs}
    </svg>`;

    // Hover a hub -> light its two edges + coordinator
    host.querySelectorAll('.const-hub').forEach(hub => {
      const g = hub.dataset.g;
      const lit = host.querySelectorAll(`[data-g="${g}"]`);
      hub.addEventListener('mouseenter', () => lit.forEach(el => {
        if (el.classList.contains('const-edge')) el.setAttribute('data-lit','1');
        if (el.classList.contains('const-coord')) el.querySelector('text').style.fill = '#00B3B3';
      }));
      hub.addEventListener('mouseleave', () => lit.forEach(el => {
        el.removeAttribute('data-lit');
        if (el.classList.contains('const-coord')) el.querySelector('text').style.fill = '';
      }));
    });
    wrap.style.display = '';
  } catch (err) {
    console.warn('Constellation unavailable:', err.message);
  }
}

async function loadTeamGroup() {
  const grid = document.getElementById('teamGroup');
  if (!grid) return;
  try {
    const data = await fetchList('team');
    const group = (data||[]).filter(m => !m.coordinates_line);
    if (!group.length) { grid.style.display='none'; return; }
    window._teamGroupData = group; // for the click-to-expand profile modal
    injectTeamSchema(data || []);
    const roleLabel = { attending_physician:'Attending Physician', medical_resident:'Resident', fellow:'Fellow', nurse_practitioner:'Nurse Practitioner', studies_coordinator:'Studies Coordinator', data_manager:'Data Manager', labtech:'Lab Technician', biomedical_engineer:'Biomedical Engineer', administrator:'Administrator' };
    grid.style.transition = 'none';
    grid.style.opacity = '0';
    grid.innerHTML = group.map(m => {
      const initials = (m.full_name||'').split(' ').filter(w=>w&&!['Dr.','Dra.','Prof.'].includes(w)).slice(0,2).map(n=>n[0]).join('').toUpperCase();
      const role = roleLabel[m.staff_type] || m.staff_type;
      return `<div class="team-member" onclick="openProfileModal('${escHtml(m.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openProfileModal('${escHtml(m.id)}');}" style="cursor:pointer;" tabindex="0" role="button" aria-label="View profile for ${escHtml(m.full_name)}">
        <div class="tm-avatar">${m.public_photo_url ? `<img src="${escHtml(m.public_photo_url)}" alt="${escHtml(m.full_name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" loading="lazy"/>` : initials}</div>
        <div style="min-width:0;">
          <div class="tm-name">${escHtml(m.display_name || m.full_name)}</div>
          <div class="tm-role">${escHtml(role)}</div>
          ${m.specialization ? `<div class="tm-spec">${escHtml(m.specialization)}</div>` : ''}
        </div>
      </div>`;
    }).join('');
    requestAnimationFrame(() => { grid.style.transition = 'opacity .22s var(--ease-clinical)'; grid.style.opacity = '1'; });
  } catch(err) { console.error('Team group load failed:',err); if (grid) grid.innerHTML = '<p class="state-empty">Unable to load team list.</p>'; }
}

// Click-to-expand profile modal — shared by team.html's team-member cards.
// Looks up the already-fetched record by ID rather than a second request.
function openProfileModal(staffId) {
  const m = (window._teamGroupData || []).find(x => x.id === staffId);
  if (!m) return;
  const overlay = document.getElementById('profileModalOverlay');
  const content = document.getElementById('profileModalContent');
  if (!overlay || !content) return;
  const initials = (m.full_name||'').split(' ').filter(w=>w&&!['Dr.','Dra.','Prof.'].includes(w)).slice(0,2).map(n=>n[0]).join('').toUpperCase();
  const roleLabel = { attending_physician:'Attending Physician', medical_resident:'Resident', fellow:'Fellow', nurse_practitioner:'Nurse Practitioner', studies_coordinator:'Studies Coordinator', data_manager:'Data Manager', labtech:'Lab Technician', biomedical_engineer:'Biomedical Engineer', administrator:'Administrator' };
  const role = roleLabel[m.staff_type] || m.staff_type;
  const avatar = buildAvatar(m, 72);
  content.innerHTML = `
    <div style="display:flex;gap:1.25rem;align-items:flex-start;margin-bottom:1.25rem;">
      ${avatar}
      <div>
        <p style="font-weight:600;font-size:1.0625rem;margin:0;">${escHtml(m.display_name || m.full_name)}</p>
        <p style="font-size:.875rem;color:var(--ink-3);margin:2px 0 0;">${escHtml(role)}</p>
        ${m.specialization ? `<p style="font-size:.8125rem;color:var(--ink-4);margin:2px 0 0;font-family:var(--ff-mono);">${escHtml(m.specialization)}</p>` : ''}
      </div>
    </div>
    ${m.public_bio
      ? `<p style="font-size:.9375rem;line-height:1.65;color:var(--ink-2);margin:0;">${escHtml(m.public_bio)}</p>`
      : `<p style="font-size:.875rem;color:var(--ink-4);font-style:italic;margin:0;border-top:1px dashed var(--border-l);padding-top:1rem;">Bio not yet added.</p>`}
    ${(m.orcid_id || m.scholar_url || m.researchgate_url) ? `
    <div class="scholar-links">
      ${m.orcid_id ? `<a href="https://orcid.org/${escHtml(String(m.orcid_id).trim())}" target="_blank" rel="noopener" class="scholar-link scholar-orcid"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zM7.4 18.4H5.5V7.6h1.9v10.8zM6.4 6.3a1.1 1.1 0 110-2.2 1.1 1.1 0 010 2.2zm12.3 12.1h-1.9v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8v5.4H11V7.6h1.8v1.5h.03c.25-.48.87-1 1.8-1 1.9 0 2.3 1.27 2.3 2.9v5.4z"/></svg><span>ORCID <span class="scholar-id">${escHtml(String(m.orcid_id).trim())}</span></span></a>` : ''}
      ${m.scholar_url ? `<a href="${escHtml(m.scholar_url)}" target="_blank" rel="noopener" class="scholar-link">Google Scholar →</a>` : ''}
      ${m.researchgate_url ? `<a href="${escHtml(m.researchgate_url)}" target="_blank" rel="noopener" class="scholar-link">ResearchGate →</a>` : ''}
    </div>` : ''}
  `;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeProfileModal() {
  const overlay = document.getElementById('profileModalOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;

// Legacy loadTeam() — used by clinical.html #teamGrid.
// Excludes line coordinators — they already get a full profile card
// via loadTeamLeads() above this section; showing them again here in
// a flatter card was straight duplication, same person twice on one page.
async function loadTeam() {
  if (PAGE === 'team') return;
  const grid = document.getElementById('teamGrid');
  if (!grid) return;
  try {
    const data = await fetchList('team');
    const members = (data || []).filter(m => !m.coordinates_line);
    if (!members.length) { grid.innerHTML='<p style="padding:2rem;color:#6B6B6B;font-size:.875rem;">Team information coming soon.</p>'; return; }
    grid.style.transition = 'none';
    grid.style.opacity = '0';
    grid.innerHTML = members.map(m => {
      const initials = (m.full_name||'').split(' ').filter(w=>w&&!['Dr.','Dra.','Prof.'].includes(w)).slice(0,2).map(n=>n[0]).join('').toUpperCase();
      const lineTag = m.coordinates_line ? `<span class="tca-line">L${String(m.coordinates_line.line_number).padStart(2,'0')} — ${escHtml(m.coordinates_line.name)}</span>` : '';
      const affiliTag = m.is_external ? `<span class="tca-affil">${escHtml(m.primary_dept_name||'Affiliated')}</span>` : '';
      return `<div class="team-card-api">
        <div class="tca-avatar">${m.public_photo_url ? `<img src="${escHtml(m.public_photo_url)}" alt="${escHtml(m.full_name)}" style="width:40px;height:40px;object-fit:cover;border-radius:50%;" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;">${escHtml(initials)}</span>` : initials}</div>
        <div style="flex:1;min-width:0;">
          <div class="tca-name">${escHtml(m.display_name || m.full_name)}</div>
          ${m.specialization ? `<div class="tca-spec">${escHtml(m.specialization)}</div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.375rem;">${lineTag}${affiliTag}</div>
          ${m.public_bio ? `<p class="tca-bio">${escHtml(trimBioRolePrefix(m.public_bio))}</p>` : ''}
        </div>
      </div>`;
    }).join('');
    requestAnimationFrame(() => { grid.style.transition = 'opacity .22s var(--ease-clinical)'; grid.style.opacity = '1'; });
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
    const data = await fetchList('news', '?type=publication&limit=30');
    const pubs = (data || []).filter(p => p.journal_name);

    if (!pubs.length) { inner.innerHTML = '<div class="pub-card" style="color:rgba(255,255,255,.4);font-size:.875rem;padding:2rem;">No publications available.</div>'; return; }

    inner.style.transition = 'none';
    inner.style.opacity = '0';
    inner.innerHTML = pubs.map(p => {
      const year = p.published_at ? new Date(p.published_at).getFullYear() : '';
      const authorLine = p.authors_text ? p.authors_text.split(';')[0].trim() + (p.authors_text.includes(';') ? ' et al.' : '') : (p.author?.full_name || '');
      return `
        <div class="pub-card">
          <div class="pub-card-top">
            <span class="pub-journal" title="${escHtml(p.journal_name)}">${escHtml(p.journal_name)}</span>
            <span class="pub-year">${year}</span>
          </div>
          <div class="pub-title">${escHtml(p.title)}</div>
          ${authorLine ? `<div class="pub-authors">${escHtml(authorLine)}</div>` : ''}
          ${p.doi
            ? `<a href="https://doi.org/${escHtml(p.doi)}" target="_blank" rel="noopener" class="pub-doi-link">DOI →</a>`
            : `<a href="/news" class="pub-doi-link"><span lang="en">View</span><span lang="es">Ver</span> →</a>`}
        </div>`;
    }).join('');
    requestAnimationFrame(() => { inner.style.transition = 'opacity .22s var(--ease-clinical)'; inner.style.opacity = '1'; });

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
        <a href="/clinical" class="opp-link">
          <span lang="en">View study</span><span lang="es">Ver estudio</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:10px;height:10px;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>`).join('');

    const projCards = seekingProjects.slice(0, 2).map(p => `
      <div class="opp-card">
        <span class="opp-type opp-type--inno"><span lang="en">Innovation · Seeking partner</span><span lang="es">Innovación · Buscando socio</span></span>
        <div class="opp-title">${escHtml(p.title || '—')}</div>
        <div class="opp-meta">${p.current_stage ? escHtml(p.current_stage.charAt(0).toUpperCase() + p.current_stage.slice(1)) : ''}</div>
        <a href="/innovation" class="opp-link">
          <span lang="en">View project</span><span lang="es">Ver proyecto</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:10px;height:10px;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>`).join('');

    grid.innerHTML = trialCards + projCards;

  } catch (err) {
    console.error('Opportunities load failed:', err);
  }
}

/* init — team page */
loadTeamLeads();
loadTeamGroup();
loadTeamConstellation();
loadPublicationStrip();
loadOpportunities();
