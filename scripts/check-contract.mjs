// Build-time contract check.
// Verifies every fetchList('x') / fetchOne('x') call across the controllers
// references a key that actually exists in src/lib/contract.js. A typo or a
// removed endpoint fails the build here instead of rendering blank at runtime.
//
// Run: node scripts/check-contract.mjs   (wired into `npm run build`)

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const libDir = join(root, 'src', 'lib');

const { API } = await import(pathToFileURL(join(libDir, 'contract.js')).href);
const validKeys = new Set(Object.keys(API));

let errors = 0;
const callRe = /\bfetch(?:List|One)\(\s*['"]([^'"]+)['"]/g;

for (const file of readdirSync(libDir)) {
  if (!file.endsWith('.js')) continue;
  const src = readFileSync(join(libDir, file), 'utf8');
  let m;
  while ((m = callRe.exec(src))) {
    if (!validKeys.has(m[1])) {
      console.error(`✗ ${file}: fetch*("${m[1]}") — no such key in contract.js`);
      errors++;
    }
  }
}

// Also scan .astro pages for inline fetch* calls
const pagesDir = join(root, 'src', 'pages');
const comps = join(root, 'src', 'components');
for (const dir of [pagesDir, comps]) {
  for (const file of readdirSync(dir)) {
    if (!/\.astro$/.test(file)) continue;
    const src = readFileSync(join(dir, file), 'utf8');
    let m;
    while ((m = callRe.exec(src))) {
      if (!validKeys.has(m[1])) {
        console.error(`✗ ${file}: fetch*("${m[1]}") — no such key in contract.js`);
        errors++;
      }
    }
  }
}

if (errors) {
  console.error(`\ncontract check FAILED: ${errors} invalid endpoint reference(s).`);
  process.exit(1);
}
console.log(`✓ contract check passed — all fetch* keys valid (${validKeys.size} endpoints).`);
