// Shared contact section: expand/collapse + form submit.
// Used by any page that includes the contact block (clinical, innovation).
import { API_BASE } from './api.js';

// Inline markup calls onclick="openContactForm('triggerId','bodyId')".
window.openContactForm = function (triggerId, bodyId) {
  const trig = document.getElementById(triggerId);
  const body = document.getElementById(bodyId);
  if (!trig || !body) return;
  const open = body.classList.toggle('open');
  trig.setAttribute('aria-expanded', String(open));
};

export function initContact() {
  const form =
    document.getElementById('researchForm') ||
    document.getElementById('innovForm') ||
    document.querySelector('form[data-contact]');
  if (!form) return;

  const btn = form.querySelector('button[type="submit"], .form-submit');
  const success = form.querySelector('.form-success') || document.getElementById('formSuccess');
  const originalText = btn ? btn.innerHTML : '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {};
    form.querySelectorAll('[name]').forEach((el) => { data[el.name] = el.value; });

    let message = data.message || '';
    if (data.secondary_topic) message = `[${data.secondary_topic}]\n\n${message}`;

    const payload = {
      name: data.contact_name || data.name || '',
      organisation: data.organisation || '',
      email: data.email || '',
      area_of_interest: data.area_of_interest || '',
      message,
    };

    if (!payload.name || !payload.email) {
      showMsg(success, 'Please fill in your name and email before sending.', true);
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      form.reset();
      showMsg(success, 'Thank you — your enquiry has been sent.', false);
    } catch (err) {
      showMsg(success, 'Something went wrong. Please email us directly.', true);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
    }
  });
}

function showMsg(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#dc2626' : '';
  el.classList.add('show');
  setTimeout(() => { el.classList.remove('show'); el.style.color = ''; }, 6500);
}
