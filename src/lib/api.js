// ──────────────────────────────────────────────────────────────
// API CLIENT — the one place the frontend talks to the backend.
//
// Same Railway → Supabase chain as before. Nothing about the data
// flow changes; this just gives every call one definition instead
// of 23 scattered fetch() sites, so a renamed route or field is
// fixed in exactly one location.
// ──────────────────────────────────────────────────────────────

export const API_BASE = 'https://neumac-manage-back-end-production.up.railway.app';

/**
 * Fetch JSON from the backend. 12s timeout, one retry with backoff
 * on 429 / 5xx / network failure (a page fires several calls at once,
 * so a quick nav burst can trip the rate limiter). Resolves parsed
 * JSON or throws. 4xx other than 429 throws immediately.
 */
export async function apiFetch(path, _isRetry = false) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { signal: ctrl.signal });
  } catch (err) {
    clearTimeout(timer);
    if (!_isRetry) {
      await new Promise((r) => setTimeout(r, 1200));
      return apiFetch(path, true);
    }
    throw err;
  }
  clearTimeout(timer);
  if (!res.ok) {
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && !_isRetry) {
      const ra = parseInt(res.headers.get('Retry-After'), 10);
      const waitMs = !isNaN(ra) ? Math.min(ra * 1000, 5000) : 1200;
      await new Promise((r) => setTimeout(r, waitMs));
      return apiFetch(path, true);
    }
    throw new Error(`API ${res.status}: ${path}`);
  }
  return res.json();
}

// Small escape helper reused by client renderers.
export function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ──────────────────────────────────────────────────────────────
// CONTRACT-DRIVEN FETCH — the only way controllers should read data.
//
// It unwraps the { data, meta } envelope in ONE place (so no controller
// can ever forget `.data` again — that was a whole class of blank-render
// bugs), and in dev it validates the response against the contract's
// `requires`, logging the exact missing field if the backend drifts.
// ──────────────────────────────────────────────────────────────
import { API } from './contract.js';

/** Fetch a list endpoint by contract key. Returns the unwrapped array. */
export async function fetchList(key, query = '') {
  const spec = API[key];
  if (!spec) throw new Error(`Unknown API contract key: ${key}`);
  const res = await apiFetch(spec.path + query);
  const data = spec.envelope ? (res && res.data) || [] : res;
  assertShape(key, Array.isArray(data) ? data[0] : data, spec.requires);
  return data;
}

/** Fetch a single-record endpoint by contract key. Returns the unwrapped object. */
export async function fetchOne(key, query = '') {
  const spec = API[key];
  if (!spec) throw new Error(`Unknown API contract key: ${key}`);
  const res = await apiFetch(spec.path + query);
  const data = spec.envelope ? (res && res.data) || null : res;
  assertShape(key, data, spec.requires);
  return data;
}

// Dev-only shape guard. Never throws in production (a stale contract must
// not take the site down); it logs loudly so drift is caught in development.
function assertShape(key, record, requires) {
  const dev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  if (!dev || !record || !requires || !requires.length) return;
  const missing = requires.filter((f) => !(f in record));
  if (missing.length) {
    console.error(
      `[contract] "${key}" (${API[key].path}) response is missing expected ` +
      `field(s): ${missing.join(', ')}. The backend shape drifted, or the ` +
      `contract in src/lib/contract.js is stale. Fix one of them.`
    );
  }
}
