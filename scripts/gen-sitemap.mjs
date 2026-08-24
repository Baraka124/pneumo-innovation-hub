// Post-build sitemap generator.
// Reads the actual built routes from dist/ and writes a correct sitemap —
// so it can never drift from the pages that exist. Run after `astro build`.
//
// Excludes: the noindex /feed page, the dynamic /line detail page
// (parameterised by ?id, no single canonical URL), and /404.

import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://neumact.org';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const EXCLUDE = new Set(['/feed', '/line', '/404']);

if (!existsSync(dist)) {
  console.error('gen-sitemap: dist/ not found — run astro build first.');
  process.exit(1);
}

// Collect routes from index.html files (folder/index.html → /folder).
const routes = new Set(['/']);
function walk(dir, base = '') {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '_astro' || entry === 'assets') continue;
      walk(full, `${base}/${entry}`);
    } else if (entry === 'index.html' && base) {
      routes.add(base);
    }
  }
}
walk(dist);

const urls = [...routes]
  .filter((r) => !EXCLUDE.has(r))
  .sort();

const today = new Date().toISOString().slice(0, 10);
const body = urls
  .map((r) => `  <url>\n    <loc>${SITE}${r}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

writeFileSync(join(dist, 'sitemap.xml'), xml);
console.log(`✓ sitemap.xml generated — ${urls.length} routes.`);
