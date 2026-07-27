# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Project Overview

Single-page static website for the Dromtrasna Challenge, an annual charity run in
Abbeyfeale, Co. Limerick, Ireland. Supports Milford Care Centre.

**Live site:** https://dromtrasnachallenge.com — Cloudflare Pages, deployed from
the `main` branch of this repo. There is no build step; Cloudflare serves the repo
root as-is.

## Technology Stack

- Plain HTML5, CSS3, vanilla JavaScript. No build tools, bundlers, or frameworks.
- **Zero third-party requests at runtime** — fonts self-hosted, no analytics, no
  embeds, no cookies. Deliberate; see "Don't break these".

## Development

```bash
python3 -m http.server 8000     # then open http://localhost:8000
tools/check.sh                  # run before every commit
```

Open `index.html` directly only for quick checks — `file://` breaks the absolute
`/favicon.ico` style paths.

---

## Read this before editing anything

**`MAINTENANCE.md` has a recipe for every routine update.** Go there first. It is
written so you never need to read `index.html` end to end — each recipe starts with
the `grep` that lands on the right line.

`index.html` is ~1050 lines and `css/styles.css` is minified. **Reading either in
full costs ~15k tokens.** Don't. Instead:

```bash
grep -n "ANNUAL:" index.html    # every yearly-changing value, with line numbers
```

`css/styles.css` is minified but **one CSS rule per line**, so `grep -n` lands you
exactly on the rule you want and a single-line edit replaces it. Treat the minified
format as a feature for this, not an obstacle. The original readable source is in
git history if you need it (this doesn't touch the live file):

```bash
git show 11c3f26^:css/styles.css > /tmp/styles-readable.css
```

### Scripts — prefer these to hand-editing

| Task | Command |
|---|---|
| Verify everything agrees (before every commit) | `tools/check.sh` |
| Change the event date | `tools/set-event-date.py 2027-10-16` |
| Add gallery photos | `tools/add-gallery-photo.py photo.jpg` |
| Bump the `?v=` cache-buster | `tools/bump-version.sh` |

Each replaces an edit that spans several files and has to stay in sync. If a script
refuses to run because the markup moved, fix the script — don't route around it by
hand, or the next run will be wrong too.

---

## Architecture

| Path | What it is |
|---|---|
| `index.html` | The whole site, one page, 13 sections |
| `css/styles.css` | All styling. Minified, one rule per line |
| `js/main.js` | All behaviour, one function per feature |
| `404.html` | Served by Cloudflare for unmatched paths |
| `_headers` | Cloudflare: CSP, security headers, caching |
| `MAINTENANCE.md` | Task-by-task update recipes |
| `tools/` | `check.sh` + the update scripts |
| `sitemap.xml` | `<lastmod>` is hand-maintained |
| `site.webmanifest` | Hardcodes the beneficiary name in `description` |
| `images/hero{,-mobile}.jpg` | Desktop 1400px / phone 900px, swapped at ≤768px |
| `images/logo-{default,scrolled}.png` | Nav logo over the hero / on the white sticky nav |
| `images/gallery/` | Full size, lightbox only. `thumbs/` is the 600px grid |

**Sections in order:** nav, hero, about, events, medal, route, impact, gallery,
results, register/donate CTAs, sponsors, FAQ, contact, footer.

**`js/main.js`** — one function per feature, all called from `DOMContentLoaded`:
`initNavigation`, `initCountdown`, `initScrollAnimations`, `initStaggeredGrids`,
`initFAQ`, `initRouteExplorer`, `initGallery`, `initSponsorMarquee`,
`initAnimatedCounter`, `initParallax`, `initHeroSpotlight`, `initHeroRoute`,
`initScrollProgress`, `initMedalTilt`, `initAnimationPausing`. Plus a module-level
`scrollLock` used by both the mobile nav and the lightbox (iOS Safari ignores
`body{overflow:hidden}`, so it pins the body with `position:fixed` and restores the
scroll offset).

**CSS** — design tokens in `:root` (colours, `--space-*`, `--radius-*`,
`--shadow-*`, `--transition-*`). Breakpoints: 400, 480, 600, 640, 700, 768, 900,
1024, 1100px. Layout breakpoints otherwise follow the nav at 769px; the route
section is the one deliberate exception (see item 16).

---

## Don't break these

Each is load-bearing and non-obvious. Most have broken the site before.
`tools/check.sh` catches items 1, 2, 4, 5, 6, 7 and 9 automatically.

**1. The Plane Crash font has no uppercase glyphs.**
`fonts/planecrash-latin.woff2` contains **a–z and 0–9 only** — uppercase was
dropped to get the file from 286KB to 88KB. Six rules use
`font-family: var(--font-display)`; five set `text-transform: lowercase`, and the
sixth (`h1`) is safe only because `.hero-title` overrides its font-family to
Permanent Marker. **Any new element using the display font must also set
`text-transform: lowercase`**, or its uppercase characters silently fall back to
Impact/Arial Black, one glyph at a time.

**2. The strict CSP blocks all third-party resources.**
`_headers` sets `default-src 'self'` with no `'unsafe-inline'`. Adding a YouTube
embed, a map, a donation widget, or analytics will make it **silently blank** until
you add its origin to the matching directive. Symptom: "Refused to load…" in the
browser console. Inline `<script>`, inline `<style>`, and `onclick="…"` attributes
are all blocked — keep behaviour in `js/main.js`. (The JSON-LD blocks are fine;
`application/ld+json` is data, not executed script. Don't add comment keys inside
them, though — unknown properties surface as warnings in Google's Rich Results
Test.)

**3. Fonts are self-hosted on purpose.**
Do not reintroduce `fonts.googleapis.com`. It would add two third-party origins to
the critical path, send visitor IPs to Google (an EU privacy concern), and require
loosening the CSP.

**4. The event date lives in six places.**
`index.html` og:description, twitter:description, JSON-LD `startDate`, JSON-LD
`endDate`, the `.hero-date-badge`, and `eventDate` in `js/main.js` — in three
different formats. **Use `tools/set-event-date.py`**, which also handles the
year-tied strings (`validFrom`, titles, medal heading, copyright, sitemap
`lastmod`).

**5. The gallery uses two sets of images.**
The grid points at `images/gallery/thumbs/`; the lightbox array in `initGallery()`
points at the full-size `images/gallery/`. The count is recorded in **three** places
in code — every `aria-label="… of 32 …"`, the `data-index` attributes, and the
`for (let i = 1; i <= 32; i++)` bound in `js/main.js` — plus the files on disk.
**Use `tools/add-gallery-photo.py`**, which handles all of them.

**6. Never add a `_redirects` catch-all like `/*  /  301`.**
This took the site down once. Netlify refuses to redirect a path to itself;
**Cloudflare Pages does not** — `/` matches `/*`, redirects to `/`, and loops
forever, taking every URL with it. Unmatched paths are handled by `404.html`, which
Cloudflare Pages serves automatically. Leave it that way.

**7. Bump `?v=` when you edit CSS or JS.**
Every asset URL carries a `?v=YYYYMMDD` string, in 60 places across three files.
The query string is part of Cloudflare's cache key, so **editing `css/styles.css`
or `js/main.js` without bumping it means returning visitors keep the old file**
(Cloudflare's browser TTL is 4 hours and overrides the shorter `max-age` in
`_headers`). Run `tools/bump-version.sh`. This is also the escape hatch if the CDN
ever serves something stale — a new version string is a fresh cache key and needs
no dashboard access.

**8. Cache headers assume CSS/JS filenames are not content-hashed.**
`/images/*` and `/fonts/*` are cached for a year as immutable; `/css/*` and `/js/*`
deliberately are not. If you ever start hashing filenames, revisit `_headers`.

**9. Commit new images.**
An image referenced in the HTML but left untracked deploys as a **broken image** —
Cloudflare builds from git, not from your disk. `tools/check.sh` catches this;
`git status --short` shows it.

**10. Body text must stay at or above 4.5:1 contrast.**
`--color-gray-600` is `#697079`, chosen because it clears WCAG AA on **both** white
and the `#F8F9FA` section backgrounds. The previous `#868E96` failed at 3.3:1.
Don't lighten it.

**11. Don't use `transition: all` on anything that toggles `visibility`.**
CSS transitions flip discrete properties like `visibility` at the *midpoint*, so
the element stays unfocusable for half the duration. This broke lightbox focus once
already — see the comment on the `.lightbox` rule.

**12. Gallery tiles are `<button>`, not `<div>`.**
That is what makes 32 photos reachable by keyboard. Don't convert them back.

**13. The route map is inline SVG, and the JPEG it was traced from is the spec.**
The map in the route section is hand-authored `<svg>`, not an image. Its
`viewBox="85 20 655 880"` is in the pixel coordinates of `images/route-map.jpg`,
which is now **unreferenced but deliberately kept** — it is how you find the
coordinate for anything you want to move. Label positions and `rotate()` angles are
measured off it too, not just the `d` data. Three traps: the SVG must contain **no
`style=` attributes** (blocked by `style-src 'self'`, and `tools/check.sh` fails on
them — use the `.rm-*` classes instead); a route's line, markers and button are
three separate elements tied together only by matching `data-route`; and the group
order is load-bearing —

```
rm-road > [rm-routes-base] > rm-routes > rm-place/rm-sub/rm-lane > rm-markers > rm-water > start > rm-runner
```

Labels sit **after** the routes so a 5px line can't bury a place name, and carry a
white knockout halo (`paint-order:stroke`) for where one crosses anyway. Putting
the label groups back above `.rm-routes` silently undoes both. `rm-runner` is last
for the same family of reason — see item 18. Recipe in `MAINTENANCE.md` →
"Editing the route map".

**14. The unselected routes are hidden by `stroke-dashoffset`, not by opacity.**
`initRouteExplorer` clones every `.rm-route` into a grey `.rm-route-base` layer
underneath, then winds the coloured copies back out of sight. That is what keeps
the whole road network visible and followable while one route is highlighted —
dimming the coloured paths instead would take the surrounding roads with it.
Without JavaScript none of this runs and all three routes simply show in colour,
which is still readable; `.is-interactive` is what switches the SVG into
one-route-at-a-time mode, so never make dimming the default.

**15. The route buttons are a `radiogroup`, not a `tablist`.**
They pick what the single map highlights; they don't each reveal their own panel.
`role="tab"` without a matching `tabpanel` is broken ARIA, so if you re-add
per-route text, switch the roles back deliberately rather than half-way. The
`#route-status` live region is what tells a screen reader the map changed, since
the SVG is `role="img"`.

**16. The route section splits into two columns at 1100px, not 769px.**
Every other section follows the nav's 769px boundary. The route map can't: it is a
fixed 655×880 drawing carrying ~15 labels, so its legibility is set by how many CSS
pixels wide it *renders*, not by how much room the section has. Splitting at 769
handed the map column 320px — scale 0.49, the smallest the map rendered anywhere on
the site, narrower than on a 360px phone — and dropped its labels to 5–9px. For the
same reason the map's type is sized in four steps keyed to rendered width rather
than viewport width, and those steps **drop** labels as well as grow type
(`.rm-minor` at ≤480, all of `.rm-lane` at ≤400). The table is in `css/styles.css`
above the steps. If you change either breakpoint, re-check the widths listed in
`MAINTENANCE.md` → "Editing the route map".

**17. The seconds tile pulses on `.countdown-slot`, not on `.countdown-number`.**
Two animations want the countdown digits: `countdown-pulse` (the seconds tile
breathing, 1s infinite) and `digitRollIn` (the odometer roll on every change).
Both animate `transform`, so one element can only have one of them — and
`.countdown-item:last-child .countdown-number` outranks
`.countdown-number.digit-change`, so putting the pulse back on the number silently
wins. The symptom is subtle and easy to miss: the outgoing digit's ghost still
rolls *out* while the new one just appears behind a pulse, so only the seconds
tile looks wrong and only for 420ms at a time. Keeping the pulse on the wrapping
slot gives each animation its own element and nothing to fight over.

**18. The `.rm-runner` group must stay the last child of the route SVG.**
It rides the tip of the line while a route draws. Everything above it in the group
order is deliberately layered (item 13), and the runner has to clear all of it —
moved earlier it slides *under* the labels, markers and start/finish dot at exactly
the moments it is meant to be visible. It is positioned by
`setAttribute('transform', …)`, which is an SVG attribute and not an inline style,
so it stays inside the CSP and `tools/check.sh`'s no-`style=` rule. Its position
each frame is read back out of the CSS transition with
`getComputedStyle(path).strokeDashoffset` rather than re-timed in JS, so the 1600ms
in the stylesheet is the single source of truth for the timing — change the
stylesheet and the runner follows.

**19. The hero's route watermark ships as an empty `<path>` on purpose.**
`.hero-route-line` carries no `d` in the markup; `initHeroRoute` copies it across
from `.rm-route[data-route="10k"]` at runtime. That is the same single-source rule
as item 13 — pasting the `d` into the hero would put the route geometry in two
places, and the copy would drift the first time anyone re-traces the course.
Without JavaScript the path simply renders nothing, which is fine: it is
`aria-hidden` decoration, desktop-only, and at `opacity:0.18` it is deliberately
near the threshold of visible. If it ever needs dialling, that one value in
`css/styles.css` is the whole control.

---

## Key data points

- **Event date:** Saturday, 17 October 2026, 10:00 IST (2K Kids Run 10:00, all
  other events 11:00)
- **Total raised to date:** €238,804.16
- **2025 event raised:** €34,145.63
- **Venue:** Dromtrasna National School, Abbeyfeale, Co. Limerick, V94 W5RC
- **Registration:** https://eventmaster.ie/event/m1wpfyVFM8
- **Contact:** dromtrasnachallenge@gmail.com

## Known open items

- **Donate CTA** is an intentional "Coming Soon" placeholder (`btn-disabled` on a
  `<span>`, not an `<a>`). Wire up a real URL when one exists.
- `images/cheque-stitas.jpg` and `images/charity-logos/Friends-of-st-ita-logo.webp`
  are unreferenced, as are the `.records-banner` / `.record*` CSS rules — leftovers
  from when St. Ita's Community Hospital was a co-beneficiary. **Deliberately kept**
  for now; St. Ita's is still named in the impact section's `.highlight-text`.
- `images/route-map.jpg` is unreferenced since the route section became inline SVG,
  but is **deliberately kept** — it is the coordinate reference the SVG was traced
  from. See "Don't break these" item 13.
- **No elevation profile.** The route section still describes elevation in prose
  only. A real profile needs GPX for the three courses, which doesn't exist yet;
  don't synthesise one, runners train on these numbers.
