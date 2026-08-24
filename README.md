# neumACt R&I — Astro rebuild (foundation)

Static Astro site for the public research website. Same Railway → Supabase
backend as before; nothing about the data flow changes. This rebuild fixes
the structural problems behind the "random patches" and the blank-page bugs.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # static output in dist/
```

## What this foundation proves (verified in the build)

- **Shell authored once.** `BaseLayout.astro` + `Head/Header/Footer` components.
  Every page uses them; there are no longer 11 divergent copies of the header,
  head, and footer. Change one, all pages change.
- **Clean URLs, guaranteed.** `src/pages/team.astro` → `dist/team/index.html`,
  served at `/team` (no `.html`). `trailingSlash` is locked in config, not left
  to the host default.
- **Content-hashed assets — the stale-cache blank is gone.** The build emits
  `_astro/index.BtqF-4AO.css`, `_astro/hoisted.*.js`, etc. The pages reference
  ONLY those hashed names — no plain `api.js`/`core.css` remains, so new HTML can
  never load an old cached script. Assets are then cached `immutable` for a year
  (see `public/_headers`) with zero staleness risk.
- **Visible-by-default reveal — the silent blank is gone.** `styles/reveal.css`
  makes content visible at rest; the entrance animation is pure CSS
  (`animation-timeline: view()`), no JS observer to die, no init script to throw
  in. The old `opacity:0` + observer pattern and its three band-aids are removed.
- **One API client.** `src/lib/api.js` wraps the backend with the existing
  hardened retry. Live data (header research-lines, homepage stats) fetches at
  runtime; a failure leaves sensible content in place, never a blank.

## Structure

```
src/
  layouts/BaseLayout.astro     the one shell
  components/Head|Header|Footer.astro
  lib/api.js                   backend client
  styles/
    core.css   polish.css      carried over unchanged (they work)
    home.css                   homepage-specific styles (was inline)
    reveal.css                 NEW — visible-by-default reveal
  pages/
    index.astro                homepage (hero + live stats) — full proof
    team.astro                 stub — proves clean-URL routing
public/
  _headers                     fixed cache policy
  logo.svg, assets/, manifest.json, CNAME, robots.txt, sitemap.xml
```

## Next (the port plan)

1. Port remaining pages into the shell, each as `src/pages/<name>.astro`:
   clinical, innovation, news, line, report, feed, privacidad, accesibilidad,
   aviso-legal. Each keeps its own content; all share Head/Header/Footer.
2. Move the client loaders from the old `api.js` (trials, news, team grid,
   constellation, opportunities, publications) into `src/lib/` modules, imported
   only by the pages that use them — so pages stop shipping code they don't need.
3. CSS phase: split the carried-over `core.css`/`polish.css`/`home.css` into a
   layered, tokenized system (`@layer reset, tokens, components, utilities`) and
   delete the per-page divergence. Tokens already exist in `:root` — lift once.
4. Lock the frontend↔backend contract (types generated from the backend Joi
   schemas) so a renamed field breaks the build instead of silently rendering blank.
```
