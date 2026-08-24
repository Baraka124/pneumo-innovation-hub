// ──────────────────────────────────────────────────────────────
// API CONTRACT — the single source of truth for every backend
// endpoint the public site consumes.
//
// Why this exists: the recurring silent bugs on this project were all
// shape drift — a response treated as a bare array when it's actually
// `{ data: [...] }`, or a renderer reading a field the backend renamed.
// Plain fetch() can't catch either. This file declares, in one place:
//   • path      — the endpoint
//   • envelope  — true when the payload is wrapped in { data, meta }
//                 (every /website endpoint is; confirmed against the backend)
//   • requires  — the fields the frontend renderers actually depend on.
//                 In dev, responses are checked against these and a precise
//                 error is logged if any are missing (drift, from either side).
//
// Change an endpoint or a field the UI needs? Change it HERE, once.
// ──────────────────────────────────────────────────────────────

export const API = {
  researchLines: {
    path: '/api/research-lines/website',
    envelope: true,
    requires: ['id', 'line_number', 'name', 'short_name', 'keywords', 'coordinator'],
  },
  trials: {
    path: '/api/clinical-trials/website',
    envelope: true,
    requires: ['id', 'protocol_id', 'title', 'phase', 'status', 'research_line'],
  },
  projects: {
    path: '/api/innovation-projects/website',
    envelope: true,
    requires: ['id', 'title', 'category', 'description'],
  },
  news: {
    path: '/api/news/website',
    envelope: true,
    requires: ['id', 'title', 'post_type'],
  },
  team: {
    path: '/api/team/website',
    envelope: true,
    requires: ['id', 'full_name', 'staff_type'],
  },
  stats: {
    path: '/api/public/stats',
    envelope: false,
    requires: [],
  },
  contact: {
    path: '/api/contact',
    method: 'POST',
  },
};

// Keys usable as a typed union in JSDoc: @type {import('./contract.js').ApiKey}
/** @typedef {keyof typeof API} ApiKey */
