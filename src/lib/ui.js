// Shared render helpers + status maps, used by page controllers.
// Ported from the old api.js so behaviour is identical.
import { escHtml } from './api.js';

// Avatar with photo + typographic monogram fallback (no-photo state).
export function buildAvatar(person, sizePx, shape = 'circle') {
  const initials = (person.full_name || '').split(' ')
    .filter((w) => w && !['Dr.', 'Dra.', 'Prof.'].includes(w))
    .slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  const radius = shape === 'circle' ? '50%' : 'var(--r-sm, 6px)';
  const fallbackId = 'av' + Math.random().toString(36).slice(2, 9);
  const noPhotoStyle = [
    `width:${sizePx}px`, `height:${sizePx}px`, `border-radius:${radius}`,
    'background:#F0F4F8', 'display:flex', 'align-items:center',
    'justify-content:center', 'flex-shrink:0',
    'border:1.5px dashed rgba(12,56,104,.18)',
    "font-family:'Fraunces',Georgia,serif", 'font-weight:600',
    'font-style:italic', `font-size:${Math.round(sizePx * 0.34)}px`,
    'color:var(--navy,#0C3868)', 'letter-spacing:-.01em',
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

// Strips a redundant leading role/affiliation sentence from a bio.
export function trimBioRolePrefix(bio) {
  if (!bio) return bio;
  const sentences = bio.split(/(?<=[.!?])\s+/);
  if (sentences.length < 2) return bio;
  const rolePattern = /^(Head of|Jefe de|Principal Investigator|Coordinator of|Coordinador[a]? de)/i;
  if (rolePattern.test(sentences[0])) return sentences.slice(1).join(' ');
  return bio;
}


export const STATUS_CLASS = {
  'Reclutando': 'recruiting',
  'Activo': 'active',
  'Completado': 'completed',
  'En preparación': 'prep',
};

export const STATUS_LABEL_EN = {
  'Reclutando': 'Recruiting',
  'Activo': 'Active',
  'Completado': 'Completed',
  'En preparación': 'In Preparation',
};

export function setLoading(el, rows = 3, dark = false) {
  const cls = dark ? 'api-skeleton-dark' : 'api-skeleton';
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

// Graceful error state: a centred card with icon, message, and a retry
// button — sized to hold the layout so a failed section doesn't leave a
// giant void. `retry` (optional) re-runs just that loader; otherwise the
// button reloads the page.
export function setError(el, msg = "This section couldn't load right now.", retry) {
  const card = `
    <div class="state-card state-card--error" role="alert">
      <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4.5M12 16h.01"/>
      </svg>
      <p class="state-msg">${msg}</p>
      <button class="state-retry" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
        <span lang="en">Try again</span><span lang="es">Reintentar</span>
      </button>
    </div>`;
  if (el.tagName === 'TBODY') {
    el.innerHTML = `<tr><td colspan="6" style="padding:0;">${card}</td></tr>`;
  } else {
    el.innerHTML = card;
  }
  const btn = el.querySelector('.state-retry');
  if (btn) btn.addEventListener('click', typeof retry === 'function' ? retry : () => location.reload());
  showApiDownBanner();
}

// Graceful empty state (no data yet, not an error) — a quiet card, no void.
export function setEmpty(el, msg = 'Nothing to show here yet.') {
  const card = `
    <div class="state-card state-card--empty">
      <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" width="24" height="24" aria-hidden="true">
        <path d="M3 7h18M3 12h18M3 17h10"/>
      </svg>
      <p class="state-msg">${msg}</p>
    </div>`;
  if (el.tagName === 'TBODY') el.innerHTML = `<tr><td colspan="6" style="padding:0;">${card}</td></tr>`;
  else el.innerHTML = card;
}

export function showApiDownBanner() {
  if (document.getElementById('apiDownBanner')) return;
  const b = document.createElement('div');
  b.id = 'apiDownBanner';
  b.setAttribute('role', 'status');
  b.style.cssText =
    'position:fixed;left:0;right:0;bottom:0;z-index:2500;background:#0C3868;color:#fff;' +
    'font-family:var(--ff-body,sans-serif);font-size:.8125rem;padding:.7rem 3rem .7rem 1.25rem;' +
    'text-align:center;box-shadow:0 -2px 12px rgba(7,17,31,.25);';
  b.innerHTML =
    '<span lang="en">Live data is temporarily unavailable — page content may be incomplete. Please try again shortly.</span>' +
    '<span lang="es">Los datos en vivo no están disponibles temporalmente; el contenido puede estar incompleto.</span>' +
    '<button aria-label="Dismiss" onclick="this.parentNode.remove()" style="position:absolute;right:.75rem;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(255,255,255,.7);font-size:1.1rem;cursor:pointer;line-height:1;">×</button>';
  document.body.appendChild(b);
}
