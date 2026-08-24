// LINE detail page controller (/line/?id=<uuid>). Loads only on /line.
// Reuses the clinical-trials and news endpoints for a single line.
import { apiFetch, escHtml } from './api.js';
import { buildAvatar, trimBioRolePrefix } from './ui.js';

async function loadLineDetail() {
  const params = new URLSearchParams(location.search);
  const lineId = params.get('id');
  const loadingEl   = document.getElementById('lineLoadingState');
  const notFoundEl  = document.getElementById('lineNotFound');
  const loadErrorEl = document.getElementById('lineLoadError');
  const heroEl      = document.getElementById('lineHero');

  if (!lineId) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (notFoundEl) notFoundEl.style.display = '';
    return;
  }

  let line;
  try {
    ({ data: line } = await apiFetch(`/api/research-lines/${lineId}/website`));
    if (!line) {
      // Retry once — a genuine fetch hiccup shouldn't land on the same
      // "this line doesn't exist" dead-end as an actually-invalid URL.
      await new Promise(r => setTimeout(r, 800));
      ({ data: line } = await apiFetch(`/api/research-lines/${lineId}/website`));
    }
    if (!line) throw new Error('not found');
  } catch (err) {
    console.error('Research line load failed:', err.message);
    if (loadingEl) loadingEl.style.display = 'none';
    if (loadErrorEl) loadErrorEl.style.display = '';
    return;
  }

  /* 12 ── contextual crumb tier: "Research → L03 Severe asthma"
     under the nav. Deep pages get a visible place in the hierarchy
     instead of feeling orphaned. */
  try {
    const hdrMain = document.querySelector('.hdr .hdr-main');
    if (hdrMain && !document.getElementById('hdrCrumb')) {
      const crumb = document.createElement('div');
      crumb.className = 'hdr-crumb'; crumb.id = 'hdrCrumb';
      crumb.innerHTML = `<a href="/clinical/"><span lang="en">Research</span><span lang="es">Investigación</span></a>
        &nbsp;→&nbsp; <b>L${String(line.line_number).padStart(2,'0')} ${escHtml(line.short_name || line.name || '')}</b>`;
      hdrMain.appendChild(crumb);
    }
  } catch (e) { /* decorative */ }

  try {
    if (loadingEl) loadingEl.style.display = 'none';
    // heroEl is intentionally NOT shown here. Showing it before the render
    // below completes means any exception partway through this block
    // (a malformed field on one specific line, a slow/failed secondary
    // fetch, etc.) leaves a half-populated, already-visible page on
    // screen with no error state — which is indistinguishable from a
    // blank page to a visitor. heroEl is shown only once everything in
    // this block has finished without throwing (see end of try block).
    const collabEl = document.getElementById('lineCollabSection');
    if (collabEl) collabEl.style.display = '';

    // Page title / description, since this is one template for six lines
    const titleText = `${line.short_name || line.name} | neumACt R&I`;
    document.title = titleText;
    const titleTag = document.getElementById('pageTitle');
    if (titleTag) titleTag.textContent = titleText;
    const descTag = document.getElementById('pageDescription');
    if (descTag && line.description) descTag.setAttribute('content', line.description);

    // Canonical + JSON-LD — previously static and identical across all six
    // line pages, which tells search engines to treat five of the six as
    // duplicates of whichever one they happened to crawl first.
    const canonicalTag = document.getElementById('canonicalLink');
    if (canonicalTag) canonicalTag.setAttribute('href', `https://neumact.org/line/?id=${lineId}`);
    const jsonLdTag = document.getElementById('lineJsonLd');
    if (jsonLdTag) {
      jsonLdTag.textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'WebPage',
        name: titleText,
        description: line.description || `Research line ${line.line_number} at neumACt R&I.`,
        isPartOf: { '@type': 'WebSite', url: 'https://neumact.org', name: 'neumACt R&I' }
      });
    }
    const collabLink = document.getElementById('lineCollabLink');
    if (collabLink) collabLink.setAttribute('href', `/?line=${encodeURIComponent(line.short_name || line.name)}#contact`);

    // Hero
    const eyebrowEl = document.getElementById('lineEyebrow');
    if (eyebrowEl) {
      eyebrowEl.innerHTML = `<span lang="en">Research line ${String(line.line_number).padStart(2,'0')}</span><span lang="es">Línea de investigación ${String(line.line_number).padStart(2,'0')}</span>`;
    }
    const titleEl = document.getElementById('lineTitle');
    if (titleEl) titleEl.textContent = line.name || line.short_name;

    // Research-as-questions (#8): the elite research sites frame each
    // line as the question it chases, not a noun label. This slot
    // renders line.research_question (EN) / research_question_es (ES)
    // as the hero's driving statement the moment that field is filled
    // in neumDesk — until then it stays invisible, no empty box.
    const questionEl = document.getElementById('lineQuestion');
    if (questionEl) {
      const qEn = line.research_question || '';
      const qEs = line.research_question_es || line.research_question || '';
      if (qEn) {
        questionEl.innerHTML =
          `<span lang="en">${escHtml(qEn)}</span><span lang="es">${escHtml(qEs)}</span>`;
        questionEl.style.display = '';
      } else {
        questionEl.style.display = 'none';
      }
    }

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
      const coordAvId = 'cav' + Math.random().toString(36).slice(2, 9);
      const coordMonogram = `background:#F0F4F8;border:1.5px dashed rgba(12,56,104,.18);font-family:'Fraunces',Georgia,serif;font-weight:600;font-style:italic;font-size:1.875rem;color:#0C3868;letter-spacing:-.01em;`;
      const avatar = c.public_photo_url
        ? `<div style="width:96px;height:96px;border-radius:50%;box-shadow:0 1px 2px rgba(0,40,40,.08),0 6px 20px rgba(0,95,95,.18);overflow:hidden;flex-shrink:0;position:relative;"><img src="${escHtml(c.public_photo_url)}" alt="${escHtml(c.full_name)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.style.display='none';document.getElementById('${coordAvId}').style.display='flex';"><div id="${coordAvId}" style="display:none;position:absolute;inset:0;${coordMonogram}align-items:center;justify-content:center;">${escHtml(initials)}</div></div>`
        : `<div style="width:96px;height:96px;border-radius:50%;box-shadow:0 1px 2px rgba(0,40,40,.08),0 6px 20px rgba(0,95,95,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;${coordMonogram}">${escHtml(initials)}</div>`;

      // Every real role this person holds gets its own badge — these are
      // independent facts (chief, PI, and line coordinator are not
      // mutually exclusive), not a single slot picking the "best" one.
      // Previously an if/else-if meant a chief who was also a PI never
      // had that second, equally true fact shown at all.
      const roleBadges = [
        c.is_chief_of_department ? `<span class="role-badge" style="background:var(--blue-50);color:var(--navy-2);padding:.3rem .7rem;border-radius:var(--r-sm);font-size:var(--fs-label);"><span lang="en">Department Chief</span><span lang="es">Jefe de Servicio</span></span>` : '',
        c.id === 'c290a7e5-7bea-4652-a0ef-251fbc73184d'
          ? `<span class="role-badge" style="background:var(--blue-50);color:var(--navy-2);padding:.3rem .7rem;border-radius:var(--r-sm);font-size:var(--fs-label);"><span lang="en">Principal Investigator, neumACt</span><span lang="es">Investigador Principal, neumACt</span></span>`
          : (c.can_be_pi ? `<span class="role-badge" style="background:var(--blue-50);color:var(--navy-2);padding:.3rem .7rem;border-radius:var(--r-sm);font-size:var(--fs-label);"><span lang="en">Principal Investigator</span><span lang="es">Investigador Principal</span></span>` : ''),
      ].filter(Boolean).join('');

      coordCard.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:.5rem;padding-bottom:1.25rem;border-bottom:1px solid var(--border-l);">
          <div style="display:flex;gap:1rem;align-items:flex-start;">
            ${avatar}
            <div style="flex:1;min-width:0;">
              <p style="font-weight:500;font-size:var(--fs-body-sm);margin:0;">${escHtml(c.title ? c.title + ' ' + c.full_name : c.full_name)}</p>
              <p style="font-size:var(--fs-label);color:var(--ink-3);margin:2px 0 0;">
                <span lang="en">Coordinator, this line</span><span lang="es">Coordinador de esta línea</span>${c.specialization ? ' · ' + (c.id === 'c290a7e5-7bea-4652-a0ef-251fbc73184d' ? '<span lang="en">Pulmonologist</span><span lang="es">Neumólogo</span>' : escHtml(c.specialization)) : ''}
              </p>
              <p style="font-size:var(--fs-label);color:var(--ink-4);margin:2px 0 0;">
                <span lang="en">Servicio de Neumología, CHUAC</span><span lang="es">Servicio de Neumología, CHUAC</span>
              </p>
            </div>
          </div>
          ${roleBadges ? `<div style="display:flex;gap:.5rem;flex-wrap:wrap;padding-left:calc(56px + 1rem);">${roleBadges}</div>` : ''}
        </div>`;
      peopleSection.style.opacity = '0';
      peopleSection.style.display = '';
      requestAnimationFrame(() => { peopleSection.style.transition = 'opacity .25s var(--ease-clinical)'; peopleSection.style.opacity = '1'; });
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
        // Named projects mentioned in free-text description (e.g.
        // "CATARS-VAC, TUCUVI-LOLA, EARCO") are often real trials already
        // in the database — link each mention to the real record instead
        // of leaving it as inert text disconnected from the actual table.
        //
        // IMPORTANT: every match is found against the original plain-text
        // description, never against a string that already contains
        // inserted HTML from a previous match. Running a second regex
        // against partially-built HTML risks matching text that's sitting
        // inside an already-inserted <a> tag's attributes (e.g. a later
        // candidate name that happens to be a substring of an earlier
        // match's protocol_id once URL-encoded into the href), which
        // would split that tag and leak its closing fragment as visible
        // text. Collecting all match ranges up front and building the
        // final string in one left-to-right pass makes that impossible.
        const desc = line.description;
        const ranges = []; // {start, end, name, protocolId}
        (line.trials_list || []).forEach(t => {
          const shortName = (t.title || '').split(/[—-]/)[0].trim();
          const candidates = [...new Set([shortName, t.protocol_id].filter(s => s && s.length > 2))];
          candidates.forEach(name => {
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`(?<![\\w-])${escapedName}(?![\\w-])`, 'g');
            let m;
            while ((m = re.exec(desc))) {
              ranges.push({ start: m.index, end: m.index + name.length, name, protocolId: t.protocol_id || shortName });
            }
          });
        });
        // Sort by start position, then drop any range that overlaps one
        // already kept (first/longest match wins at a given position —
        // prevents double-linking the same span from two candidate names).
        ranges.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
        const kept = [];
        let lastEnd = -1;
        for (const r of ranges) {
          if (r.start >= lastEnd) { kept.push(r); lastEnd = r.end; }
        }
        let descHtml = '';
        let cursor = 0;
        for (const r of kept) {
          descHtml += escHtml(desc.slice(cursor, r.start));
          descHtml += `<a href="/clinical?search=${encodeURIComponent(r.protocolId)}" class="btn-text" style="font-size:inherit;border-bottom-width:1px;">${escHtml(r.name)}</a>`;
          cursor = r.end;
        }
        descHtml += escHtml(desc.slice(cursor));
        html += `<p style="margin-bottom:1.5rem;">${descHtml}</p>`;
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
        aboutSection.style.opacity = '0';
        aboutSection.style.display = '';
        requestAnimationFrame(() => { aboutSection.style.transition = 'opacity .25s var(--ease-clinical)'; aboutSection.style.opacity = '1'; });
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
              <p style="font-family:var(--ff-display);font-size:1.75rem;font-weight:700;margin:0;line-height:1;font-variant-numeric:tabular-nums;">${f.num}</p>
              <p style="font-size:var(--fs-label);color:var(--ink-3);margin-top:.25rem;"><span lang="en">${f.labelEn}</span><span lang="es">${f.labelEs}</span></p>
            </div>`).join('');
          factsEl.style.opacity = '0';
          factsEl.style.display = '';
          requestAnimationFrame(() => { factsEl.style.transition = 'opacity .25s var(--ease-clinical)'; factsEl.style.opacity = '1'; });
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
      trackSection.style.opacity = '0';
      trackSection.style.display = '';
      requestAnimationFrame(() => { trackSection.style.transition = 'opacity .25s var(--ease-clinical)'; trackSection.style.opacity = '1'; });
    }

    // Active trials — reuses the existing public trials endpoint, filtered by line
    const trialsSection = document.getElementById('lineTrialsSection');
    const trialsList = document.getElementById('lineTrialsList');
    try {
      const { data: trials } = await apiFetch(`/api/clinical-trials/website?line=${lineId}`);
      const activeTrials = (trials || []).filter(t => ['Reclutando','Activo','Active','Recruiting'].includes(t.status));
      if (activeTrials.length && trialsSection && trialsList) {
        trialsList.innerHTML = activeTrials.slice(0, 6).map((t, i) => `
          <a href="/clinical#research-lines" class="lt-trial-row" style="${i > 0 ? 'border-top:1px solid var(--border-l);' : ''}">
            <span class="lt-trial-phase">${escHtml(t.phase || 'Clinical study')}</span>
            <span class="lt-trial-title">${escHtml(t.title || t.protocol_id || '—')}</span>
            <svg class="lt-trial-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>`).join('');
        trialsSection.style.opacity = '0';
        trialsSection.style.display = '';
        requestAnimationFrame(() => { trialsSection.style.transition = 'opacity .25s var(--ease-clinical)'; trialsSection.style.opacity = '1'; });
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
      const roleTextFor = (m) => m.role_on_line ? escHtml(m.role_on_line)
        : m.is_chief_of_department ? '<span lang="en">Department Chief</span><span lang="es">Jefe de Servicio</span>'
        : m.id === 'c290a7e5-7bea-4652-a0ef-251fbc73184d' ? '<span lang="en">Principal Investigator, neumACt</span><span lang="es">Investigador Principal, neumACt</span>'
        : m.can_be_pi ? '<span lang="en">Principal Investigator</span><span lang="es">Investigador Principal</span>'
        : (m.specialization ? escHtml(m.specialization) : '');

// Toggles a line.html team-member card open/closed — shared by both
// click and keyboard (Enter/Space) activation, so the expand logic
// lives in one place instead of being duplicated inline per event type.
// Opens a line.html team member's bio in the same fixed-overlay modal
// used on team.html — previously this page used an inline accordion that
// pushed every card below it down the moment one expanded, which felt
// jarring on a multi-column grid. The overlay shows the bio without
// touching the page's layout at all.
function openLineProfileModal(m) {
  const overlay = document.getElementById('profileModalOverlay');
  const content = document.getElementById('profileModalContent');
  if (!overlay || !content) return;
  const initials = (m.full_name||'').split(' ').filter(w=>w&&!['Dr.','Dra.','Prof.'].includes(w)).slice(0,2).map(n=>n[0]).join('').toUpperCase();
  const avatar = buildAvatar(m, 72);
  const roleText = m.role_on_line ? escHtml(m.role_on_line)
    : m.is_chief_of_department ? '<span lang="en">Department Chief</span><span lang="es">Jefe de Servicio</span>'
    : m.id === 'c290a7e5-7bea-4652-a0ef-251fbc73184d' ? '<span lang="en">Principal Investigator, neumACt</span><span lang="es">Investigador Principal, neumACt</span>'
    : m.can_be_pi ? '<span lang="en">Principal Investigator</span><span lang="es">Investigador Principal</span>'
    : (m.specialization ? escHtml(m.specialization) : '');
  content.innerHTML = `
    <div style="display:flex;gap:1.25rem;align-items:flex-start;margin-bottom:1.25rem;">
      ${avatar}
      <div>
        <p style="font-weight:600;font-size:1.0625rem;margin:0;">${escHtml(m.title ? m.title + ' ' + m.full_name : m.full_name)}</p>
        ${roleText ? `<p style="font-size:.875rem;color:var(--ink-3);margin:2px 0 0;">${roleText}</p>` : ''}
      </div>
    </div>
    ${m.public_bio
      ? `<p style="font-size:.9375rem;line-height:1.65;color:var(--ink-2);margin:0;">${escHtml(m.public_bio)}</p>`
      : `<p style="font-size:.875rem;color:var(--ink-4);font-style:italic;margin:0;border-top:1px dashed var(--border-l);padding-top:1rem;">Bio not yet added.</p>`}
  `;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
window.openLineProfileModal = openLineProfileModal;
window._lineTeamData = [];

      window._lineTeamData = teamWithoutCoordinator;
      teamChips.style.transition = 'none';
      teamChips.style.opacity = '0';
      teamChips.innerHTML = teamWithoutCoordinator.map((m, i) => {
        const initials = (m.full_name||'').split(' ').filter(w=>w&&!['Dr.','Dra.','Prof.'].includes(w)).slice(0,2).map(n=>n[0]).join('').toUpperCase();
        const lineAvId = 'ltav' + i;
        const lineMonoStyle = `background:#F0F4F8;border:1.5px dashed rgba(12,56,104,.18);font-family:'Fraunces',Georgia,serif;font-weight:600;font-style:italic;color:#0C3868;letter-spacing:-.01em;`;
        const avatarInner = m.public_photo_url
          ? `<img src="${escHtml(m.public_photo_url)}" alt="${escHtml(m.full_name)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.style.display='none';document.getElementById('${lineAvId}').style.display='flex';this.parentElement.style.cssText+=';${lineMonoStyle.replace(/'/g,'"')}';"><span id="${lineAvId}" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;">${escHtml(initials)}</span>`
          : escHtml(initials);
        const avatarStyle = m.public_photo_url ? '' : lineMonoStyle;
        return `<div class="line-team-card">
          <div class="line-team-header" onclick="openLineProfileModal(window._lineTeamData[${i}])" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openLineProfileModal(window._lineTeamData[${i}]);}" tabindex="0" role="button" aria-label="${escHtml(m.full_name)} — view full profile">
            <div class="line-team-avatar" style="${avatarStyle}">${avatarInner}</div>
            <div style="min-width:0;flex:1;">
              <p class="line-team-name">${escHtml(m.title ? m.title + ' ' + m.full_name : m.full_name)}</p>
              ${roleTextFor(m) ? `<p class="line-team-role">${roleTextFor(m)}</p>` : ''}
            </div>
            <svg class="line-team-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="transform:rotate(-90deg);"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>`;
      }).join('');
      requestAnimationFrame(() => { teamChips.style.transition = 'opacity .22s var(--ease-clinical)'; teamChips.style.opacity = '1'; });
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
        pubsSection.style.opacity = '0';
        pubsSection.style.display = '';
        requestAnimationFrame(() => { pubsSection.style.transition = 'opacity .25s var(--ease-clinical)'; pubsSection.style.opacity = '1'; });
      }
    } catch (err) { console.error('Line publications load failed:', err); }

    // Everything above completed without throwing — safe to reveal now.
    if (heroEl) heroEl.style.display = '';

  } catch (err) {
    console.error('Research line render failed:', err.message);
    // Null-guarded: previously this catch itself threw when
    // #lineLoadError didn't exist in the markup (it was referenced
    // here but never added to the HTML), which turned a recoverable
    // render error into a fully blank page. Now every access is
    // guarded, and if the dedicated error element is somehow missing
    // we fall back to repurposing the loading element so the visitor
    // always sees *something* rather than white nothing.
    try { if (heroEl) heroEl.style.display = 'none'; } catch (_) {}
    if (loadErrorEl) {
      if (loadingEl) loadingEl.style.display = 'none';
      loadErrorEl.style.display = '';
    } else if (loadingEl) {
      loadingEl.style.display = '';
      loadingEl.innerHTML = '<p style="color:rgba(255,255,255,.6);">'
        + '<span lang="en">This line couldn\'t be loaded right now. '
        + '<a href="/clinical/" style="color:var(--teal-2,#00B3B3);">View all research lines</a>.</span>'
        + '<span lang="es">No se pudo cargar esta línea. '
        + '<a href="/clinical/" style="color:var(--teal-2,#00B3B3);">Ver todas las líneas</a>.</span></p>';
    }
  }
}  

loadLineDetail();
