// ──────────────────────────────────────────────────────────────
// INNOVATION page controller. Loads only on /innovation.
// ──────────────────────────────────────────────────────────────
import { apiFetch, escHtml } from './api.js';
import { setLoading, setError } from './ui.js';
import { initContact } from './contact.js';

const CATEGORY_CLASS = {
  'Dispositivo': 'cat-device',
  'Salud Digital': 'cat-digital',
  'IA / ML': 'cat-ai',
  'Tecnología Quirúrgica': 'cat-surgical',
};

const CATEGORY_ICON = {
  'Dispositivo': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="9" height="9"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M7 7h2l1 3 2-6 1 3h3"/></svg>`,
  'Salud Digital': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="9" height="9"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>`,
  'IA / ML': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="9" height="9"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6" y2="6"/><line x1="6" y1="18" x2="6" y2="18"/></svg>`,
  'Tecnología Quirúrgica': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="9" height="9"><path d="M20 7l-9 9-4-4 9-9 4 4z"/><path d="M4 20l1-4"/></svg>`,
};

async function loadProjects() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
  setLoading(grid, 4, true); // dark section

  try {
    let projects = await fetchList('projects');
    if (!projects?.length) {
      await new Promise((r) => setTimeout(r, 800));
      projects = await fetchList('projects');
    }
    if (!projects.length) {
      setError(grid, 'Unable to load projects right now. Please refresh the page.');
      return;
    }

    grid.innerHTML = projects.map((p, i) => {
      const catClass = CATEGORY_CLASS[p.category] || 'cat-device';
      const catIcon = CATEGORY_ICON[p.category] || CATEGORY_ICON['Dispositivo'];
      const delay = i % 2 === 0 ? '' : ' reveal-d1';
      return `
        <div class="project-card reveal${delay}">
          <div class="project-top">
            <span class="project-cat-badge ${catClass}">${catIcon}${escHtml(p.category)}</span>
            ${p.development_stage ? `<span class="stage-badge">${escHtml(p.development_stage)}</span>` : ''}
          </div>
          <h3 class="project-title">${escHtml(p.title)}</h3>
          <p class="project-desc">${escHtml(p.description)}</p>
          ${p.partner_needs?.length
            ? `<p class="project-needs-label"><span lang="en">Partner Needs</span><span lang="es">Necesidades del Socio</span></p>
               <div class="project-needs">${p.partner_needs.map((n) => `<span class="pneed">${escHtml(n)}</span>`).join('')}</div>`
            : ''}
        </div>`;
    }).join('');
  } catch (err) {
    setError(grid);
  }
}

loadProjects();
initContact();
