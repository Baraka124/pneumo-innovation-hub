# neumACt R&I — Site Reference Guide

**Servicio de Neumología · Hospital Universitario A Coruña (CHUAC) · SERGAS**
*Research & Innovation in Respiratory Medicine*

---

## 1. Logo File Naming

Place all logo files in the **root of the GitHub repository** alongside the HTML files. They are referenced directly by filename — no subfolders.

| Filename | What it is | Where it appears |
|---|---|---|
| `logo.svg` | neumACt wordmark SVG (the standalone brand mark with the italic *t*) | Header on every page · Footer on every page |
| `logo-2.png` | Composite institutional logo: SERGAS crest + lung icon + SERVICIO DE NEUMOLOGÍA + neumAC + ÁREA SANITARIA DE A CORUÑA Y CEE | Affiliation strip on every page (primary mark) |
| `aff1.png` | INIBIC — Fundación Galega de Investigación Biomédica | Affiliation strip — first affiliation slot |
| `aff2.png` | Second affiliation (assign as needed) | Affiliation strip — second slot |
| `aff3.png` | Third affiliation | Affiliation strip — third slot |
| `aff4.png` | Fourth affiliation | Affiliation strip — fourth slot |

### How the logo system works

When a logo file is present in the repo root, it renders immediately. When it is missing, a dashed placeholder box appears with the filename label inside — so you always know which slot needs which file. No code changes are needed when uploading logos; just name the files correctly and push to GitHub.

All logos are rendered with `filter: brightness(0) invert(1)` so they appear white on the dark navy background, regardless of the original file colour. If a logo has a transparent background it will render cleanly. If it has a white background it may show a white rectangle instead of a white logo — in that case, export the logo with a transparent background before uploading.

### Logo hierarchy

```
logo.svg        ← brand identity (header + footer)
logo-2.png      ← institutional affiliation (primary mark in the strip)
aff1–aff4.png   ← secondary institutional affiliations
```

`logo.svg` and `logo-2.png` are different things. The header carries the neumACt wordmark (`logo.svg`) — clean, minimal, brand. The affiliation strip carries the composite institutional logo (`logo-2.png`) — the SERGAS emblem, the department name, the full institutional chain. They should never be in the same position.

---

## 2. Design Principles

These are the rules that govern every editorial, visual, and language decision on the site. Any future update — adding a section, rewriting a paragraph, changing a heading — should be checked against these first.

---

### 2.1 The site is a department, not a product

The site represents a clinical research department inside a public hospital. It is not selling a service, qualifying a sponsor, or marketing a trial site. The reader is a clinician, investigator, academic collaborator, or peer institution. They are not a customer.

Every sentence should be writeable on a Nature Medicine methods section or a NEJM letter. If it sounds like it belongs on a pharmaceutical company's partnership page, it does not belong here.

---

### 2.2 Language rules — what is forbidden

| Forbidden | Why | Replace with |
|---|---|---|
| "Six Research Lines. One Mission." | Tagline construct — marketing pattern | State what the department does, not a slogan about it |
| "From Clinical Challenge to Deployed Solution" | Sales narrative arc | Describe what actually exists |
| "high-value clinical innovation partner" | Self-promotional superlative | Describe the infrastructure factually |
| "beyond a simple trial site" | Defensive marketing (implies insecurity) | Remove entirely |
| "qualifying our site for a sponsored study" | Sponsor-side perspective | Write from the department's perspective |
| "feasibility assessment" in the contact blurb | CRO-speak | "enquiries about active studies" |
| "What we bring" | Sales pitch framing | "Research infrastructure" |
| "Our Innovation Process" | Marketing construct | "Development pathway" |
| "Partnership models" | Commercial framing for an academic page | "Collaboration formats" |
| ✓ checkmarks in lists | AI-generated content pattern | Remove — use plain list items |
| "—" before eyebrow labels as decoration | AI tell | Remove |
| "~1K", "approximately 1,000", "close to 1,000" | Approximation of a known exact fact | "1,000 lung transplants performed at CHUAC, May 2026" |
| "world-class", "state-of-the-art", "cutting-edge" | Superlatives — unprovable and generic | Cite the specific achievement instead |
| Listing project names (AIRWAYSCOPE, SCOPE-3D, TUCUVI-LOLA) in the first paragraph | Assumes prior knowledge the reader does not have | Describe the problem they solve, then name them |
| "Translational and Precision Respiratory Medicine" as a branding phrase | Jargon as identity, not description | Describe what the research actually does |

---

### 2.3 Repetition rules

If a concept is established once, it does not need to be stated again on the same page. The following words have a page-level budget:

| Word / phrase | Maximum uses per page (visible text) |
|---|---|
| "research line(s)" | 3 — once in the hero, once as a section heading, once in context |
| "INIBIC" | 2 — full name on first use: "Fundación Galega de Investigación Biomédica (INIBIC)", abbreviation thereafter |
| "CHUAC" | 4 |
| "SERGAS" | 2 |
| "coordinator" | Prefer "physician-investigator" or just the name; do not use as a prefix on every card |
| "six" (describing the research lines) | 2 — once is enough |

---

### 2.4 Heading hierarchy

The visual structure follows a three-tier rule:

```
EYEBROW        ← tiny mono uppercase (.6rem, letter-spaced) — WHO or WHERE
Large heading  ← display serif (h2, clamp 2–3rem) — WHAT
Body paragraph ← body sans (.9–1.0625rem) — WHY or HOW
```

The eyebrow and the heading below it must say **different things**. "Contact / Enquiries" is two words for the same action — broken hierarchy. The correct pattern is "Servicio de Neumología · CHUAC / Enquiries" — context then content.

---

### 2.5 The innovation page — what it must say

Innovation at the Servicio de Neumología is **not** about technology. It is about patients. The correct framing, in order:

1. **Why** — clinical problems encountered in treating respiratory disease patients
2. **Who** — clinicians as co-developers, not recipients of external tools
3. **What** — the type of work (AI, computational imaging, digital health)
4. **How** — evaluated within INIBIC's framework
5. **Proof** — active projects (AIRWAYSCOPE, SCOPE-3D, TUCUVI-LOLA) as examples, not the opening sentence

Never open the innovation page with a project name. Never open it with a technology. Open it with a patient problem.

---

### 2.6 Contrast rules

**Dark background** (navy `#0A1628` / `#0F1E36`):
- All h1/h2/h3 headings: `#fff`
- Body text: minimum `rgba(255,255,255,.78)`
- Secondary / meta: minimum `rgba(255,255,255,.65)`
- Labels / eyebrows: teal `rgba(0,153,153,.9)`
- Never use `rgba(255,255,255,.<0.55)` for any readable text

**Light background** (white `#fff` / off-white `#F5F5F0`):
- All h1/h2/h3: `#1A1A1A`
- Body text: `#404040`
- Eyebrows / labels: teal `#009999`

Stat numbers (`.hstat-num`, `.stat-num`) must be `color: #fff !important` with `-webkit-text-fill-color: #fff !important` and `background: none !important`. The gradient text (`linear-gradient` with `-webkit-text-fill-color: transparent`) is forbidden — it produces smeared, unreadable numbers on dark backgrounds.

---

### 2.7 The 1,000 transplant milestone

This is a precise fact, not an estimate.

**Correct:** "1,000 lung transplants performed at CHUAC — milestone reached May 2026"
**Wrong:** "~1K", "approximately 1,000", "close to 1,000", "nearly 1,000", "1K", "~1,000"

It appears in: the index hero stats panel, the team stats panel, the first research line card description (transplantation line), and the index latest banner.

---

### 2.8 Colour identity

| Role | Value | Name |
|---|---|---|
| Primary background | `#0A1628` | Deep navy |
| Secondary dark | `#0F1E36` | Navy 2 |
| Footer | `#07111F` | Footer navy |
| Brand accent | `#009999` | Teal |
| Accent 2 | `#00B3B3` | Teal 2 |
| White | `#FFFFFF` | — |
| Off-white | `#F5F5F0` | — |
| Body ink | `#1A1A1A` | — |

No pure black (`#000` or `background: black`) anywhere. The dark colour is deep navy, not black. This is the difference between a hospital research department and a tech startup.

---

## 3. Benchmark Institutions

These three institutions should be the reference for any question about content strategy, UI architecture, or editorial voice.

---

### 3.1 The Francis Crick Institute (London)
**crick.ac.uk**

**Why it is the primary benchmark:**
- A biomedical research institute inside a public-sector health system — closest structural analogue to neumACt
- Opens with mission, not statistics: "Discovery without boundaries" before any numbers appear
- Laboratory pages describe what the science is *for* (the disease, the problem) before listing methods or people
- No "partnership models" or "collaboration formats" — they say "work with us" once, then list specific mechanisms
- Publications are surfaced as proof of work, not as a marketing section

**What to copy — content:**
- The lab page structure: disease context → approach → current projects → people → publications
- Their "News & Events" feed mixes scientific publications, institutional news, and human stories (fellowships, appointments) — all treated with equal editorial weight
- INIBIC first-mention pattern: they introduce the Crick itself fully on first reference, abbreviate after

**What to copy — UI:**
- Section backgrounds alternate: navy → white → navy. No section is both dark-text and dark-background
- Navigation labels are plain nouns: Research, Science Groups, News, About. No marketing verbs
- The affiliation strip is a single horizontal row, low opacity, white on dark — logos are identifiers not advertisements
- Typography: large serif display for headlines, clean sans-serif body, monospace for labels/metadata

**What NOT to copy:**
- Their mega-menu (too complex for a department site)
- Their image-heavy homepage (neumACt's content is publication and trial data, not photography)

---

### 3.2 Instituto de Salud Carlos III (ISCIII) — isciii.es
**Why it is the second benchmark:**
- The Spanish public biomedical research reference institution — same regulatory context (AEMPS, GCP, CE MDR), same language, same funder landscape
- Uses institutional tone without selling: statements of fact, not promises of value
- Their clinical trial and research group pages use the same three-tier heading structure (eyebrow / title / body) that neumACt should follow
- No superlatives anywhere on the site

**What to copy — content:**
- How they name research groups: "Grupo de investigación en [disease area]" — descriptive, not branded
- Their contact pages: no "qualifying your site" language — just an address, a phone, and an email with a two-line description of what the contact is for
- How they handle INIBIC-equivalent bodies (CIBER, ISCIII itself): full name on first use, abbreviation after, never used as a marketing claim ("ISCIII-backed" is never on their pages)

**What to copy — UI:**
- Their publication list design: author, journal, year, DOI — no star ratings, no "highly cited" badges
- Their clinical trials section: table format with filter by condition, phase, and status — no marketing around the trials themselves

**What NOT to copy:**
- Their navigation (too bureaucratic for neumACt's audience)
- Their overall visual design (dated — neumACt is already ahead here)

---

### 3.3 Stanford Medicine — Pulmonary, Allergy & Critical Care
**med.stanford.edu/paccm**

**Why it is the third benchmark:**
- Elite academic medical department — the visual and editorial ceiling to aim for
- Their research section opens with the disease and the patient, not the researcher or the grant
- Statistical claims are always sourced and specific: not "world-leading" but "X publications in the last year, Y NIH grants"
- Human content (appointments, fellows, lab news) lives alongside scientific content — the site reads as a living department, not a brochure

**What to copy — content:**
- How they frame clinical trials: the patient benefit first, the mechanism second, the investigator third
- Their faculty pages: photo, title, one-sentence research focus, then links to publications and active trials — no marketing bio
- The "News" pattern: a mix of peer-reviewed publications, conference presentations, and institutional updates — treating all three as equally valid outputs of the department

**What to copy — UI:**
- Clean white content sections with generous vertical padding — no information crammed
- The navigation never changes across screen sizes — on mobile, it collapses to a hamburger with the same five items in the same order
- Section headings are left-aligned, not centred — gives the page an editorial, newspaper quality
- Tighter typography on the research portfolio pages: smaller type, more items per screen, respecting that the reader is a professional not a casual visitor

**What NOT to copy:**
- Stanford's mega-menu and institutional navigation (Stanford Medicine has dozens of departments; neumACt has five pages)
- Their fundraising / "Give" sections (not applicable)
- Their heavy use of photography (neumACt's identity is text and data, not people photography)

---

## 4. Quick Reference: The Three Questions

Before publishing or committing any change to the site, ask:

1. **Would a Nature Medicine editor find this sentence credible?** If it sounds like marketing, rewrite it as a statement of fact.

2. **Is this word or phrase appearing for the first time, or is it the third time this page has said the same thing?** If it is repetition without new information, cut it.

3. **If a clinician from the Crick lands on this page looking for a collaboration partner, does the first paragraph tell them what the department does — not what it aspires to be?** If not, move the aspiration to the About section and lead with the work.

---

*Last updated: June 2026 · neumACt R&I · Servicio de Neumología · CHUAC*
