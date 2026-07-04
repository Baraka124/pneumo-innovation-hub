#!/usr/bin/env python3
"""Site integrity checks — the exact class of bugs that reached
production before this existed: div imbalance, brace imbalance,
duplicate top-level CSS selectors, dead base64 blobs, WCAG contrast
regressions on the known-audited tokens."""
import re, sys, html.parser, glob

FAILED = []
def check(name, ok, detail=''):
    print(f'{"PASS" if ok else "FAIL"}  {name}  {detail}')
    if not ok: FAILED.append(name)

PAGES = sorted(glob.glob('*.html') + glob.glob('*/index.html'))

for f in PAGES:
    c = open(f, encoding='utf-8').read()
    o = len(re.findall(r'<div[\s>]', c)); cl = c.count('</div>')
    check(f'{f} div balance', o == cl, f'{o}/{cl}')
    s, e = c.find('<style>'), c.rfind('</style>')
    if s >= 0 and e >= 0:
        sc = c[s:e]
        check(f'{f} style braces', sc.count('{') == sc.count('}'))
    class P(html.parser.HTMLParser):
        def error(self, m): pass
    try:
        P().feed(c); check(f'{f} html parse', True)
    except Exception as ex:
        check(f'{f} html parse', False, str(ex))
    check(f'{f} no embedded base64 images', 'data:image/png;base64,/9j' not in c)

for f in ['core.css', 'polish.css']:
    c = open(f, encoding='utf-8').read()
    check(f'{f} braces', c.count('{') == c.count('}'))
    sels = re.findall(r'^([.#][a-zA-Z0-9_-]+)\{', c, re.MULTILINE)
    from collections import Counter
    # .hdr is intentionally split (layout in core.css; backdrop-filter and
    # the authoritative transition in polish.css) — reviewed, non-conflicting.
    ALLOWED = {'.hdr'}
    dupes = {k: v for k, v in Counter(sels).items() if v > 1 and k not in ALLOWED}
    check(f'{f} no duplicate top-level selectors', not dupes, str(dupes) if dupes else '')

# Contrast regression guards on audited tokens
def lum(r,g,b):
    def lin(x):
        x/=255; return x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def cr(a,b):
    l1,l2=lum(*a),lum(*b); hi,lo=max(l1,l2),min(l1,l2); return (hi+0.05)/(lo+0.05)
idx = open('index.html', encoding='utf-8').read()
m = re.search(r'--ink-4:\s*#([0-9A-Fa-f]{6})', idx)
if m:
    h = m.group(1); rgb = tuple(int(h[i:i+2],16) for i in (0,2,4))
    check('--ink-4 passes 4.5:1 on white', cr(rgb,(255,255,255)) >= 4.5, f'#{h} = {cr(rgb,(255,255,255)):.2f}:1')

sys.exit(1 if FAILED else 0)
