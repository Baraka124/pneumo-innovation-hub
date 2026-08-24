import { defineConfig } from 'astro/config';

// neumACt R&I — public research site
// Static output; talks to the Railway backend at runtime (unchanged).
export default defineConfig({
  site: 'https://neumact.org',

  // Clean URLs: every page file becomes /name/index.html -> served at /name
  build: { format: 'directory' },

  // Lock trailing-slash behaviour instead of relying on the host default.
  // 'ignore' accepts both /team and /team/ ; canonical links are absolute so this stays safe.
  trailingSlash: 'ignore',

  // Content-hashed asset filenames are on by default in the build output
  // (e.g. _astro/api.a3f9c2.js). This is the fix for the stale-cache blank:
  // a changed file always gets a new URL, so HTML can never load old JS/CSS.
});
