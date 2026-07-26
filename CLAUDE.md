# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-page static website for the Dromtrasna Challenge, an annual charity run in Abbeyfeale, Co. Limerick, Ireland. Supports Milford Care Centre.

**Live site:** https://dromtrasnachallenge.com (hosted on Cloudflare Pages, deployed from the `main` branch of this repo)

## Technology Stack

- Plain HTML5, CSS3, and vanilla JavaScript
- No build tools, bundlers, or frameworks
- **Zero third-party requests at runtime** — fonts are self-hosted, no analytics, no embeds, no cookies. This is deliberate (see "Don't break these" below).

## Development

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

Open `index.html` directly only for quick checks — `file://` breaks the absolute `/favicon.ico` style paths.

---

## Editing efficiently (read this first)

`index.html` is ~950 lines and `css/styles.css` is minified to one rule per line. **Reading either in full costs ~15k tokens.** Don't. Every editable thing has a stable, greppable anchor — find the line, then edit that line.

```bash
grep -n "data-target"  index.html      # -> the fundraising total
grep -n "October 17"   index.html      # -> the hero date badge
grep -n "\.faq-answer" css/styles.css  # -> the FAQ styles, one line
```

`css/styles.css` is minified but **one CSS rule per line**, so `grep -n` lands you exactly on the rule you want and `Edit` replaces just that line. Treat the minified format as a feature for this, not an obstacle.

### Quick edits reference

| To change… | File | Grep for |
|---|---|---|
| Event date (hero badge) | `index.html` | `hero-date-badge` |
| Countdown target | `js/main.js` | `eventDate` |
| Event date (Google rich result) | `index.html` | `startDate` |
| Fundraising total | `index.html` | `data-target` |
| Last year's amount | `index.html` | `highlight-amount` |
| Results / leaderboard | `index.html` | `leaderboard-title` |
| Sponsor names | `index.html` | `sponsor-name` |
| Main sponsor logos | `index.html` | `main-sponsors-grid` |
| FAQ entries | `index.html` | `faq-question` |
| Registration link | `index.html` | `eventmaster.ie` |
| Donate button | `index.html` | `btn-disabled` |
| Social links | `index.html` | `social-link` |
| Colours / spacing | `css/styles.css` | `:root` |
| Security + cache headers | `_headers` | — |

> **The event date lives in three places** and they must agree: the hero badge (`index.html`), the countdown (`js/main.js`), and the JSON-LD `startDate` (`index.html`). Grep `2026-10-17` and `October 17` to catch them all.

---

## Architecture

```
├── index.html                  # Whole site, one page, 13 sections
├── css/styles.css              # All styling (minified, one rule per line)
├── js/main.js                  # All behaviour, one function per feature
├── 404.html                    # Served by Cloudflare for unmatched paths
├── _headers                    # Cloudflare: CSP, security headers, caching
├── robots.txt / sitemap.xml    # SEO
├── favicon.svg / favicon.ico / apple-touch-icon.png / icon-{192,512}.png
├── site.webmanifest
├── fonts/                      # Self-hosted WOFF2 (see below)
└── images/
    ├── hero.jpg                # Desktop hero (1600px)
    ├── hero-mobile.jpg         # Phone hero (900px, ≤768px breakpoint)
    ├── og-image.jpg            # 1200×630 social preview
    ├── logo-default.png        # Nav logo, white text, over the hero
    ├── logo-scrolled.png       # Nav logo, colour, on the white sticky nav
    ├── medal-2026.jpg
    ├── route-map.jpg
    ├── cheque-milford.jpg
    ├── gallery/                # gallery-1..32.jpg  (full size, lightbox only)
    │   └── thumbs/             # gallery-1..32.jpg  (600px, the grid)
    ├── sponsors/               # sponsor-1..3.png
    └── charity-logos/          # milford-logo.png
```

### HTML sections (in order)

nav, hero, about, events, medal, route, impact, gallery, results, register/donate CTAs, sponsors, FAQ, contact, footer

### JavaScript modules (`js/main.js`)

One function per feature, all called from `DOMContentLoaded`:
`initNavigation`, `initCountdown`, `initScrollAnimations`, `initStaggeredGrids`, `initFAQ`, `initGallery`, `initSponsorMarquee`, `initAnimatedCounter`, `initParallax`, `initAnimationPausing`.

Plus a module-level `scrollLock` helper used by both the mobile nav and the lightbox (iOS Safari ignores `body{overflow:hidden}`, so it pins the body with `position:fixed` and restores the scroll offset).

### CSS design system

Custom properties in `:root` — colours, `--space-*` scale, `--radius-*`, `--shadow-*`, `--transition-*`. Breakpoints: 480, 600, 640, 700, 768, 900, 1024px.

---

## Don't break these

Each of these is load-bearing and non-obvious.

**1. The Plane Crash font is lowercase-only and subsetted to lowercase.**
`fonts/planecrash-latin.woff2` contains **no uppercase glyphs** — they were dropped to get the file from 286KB to 88KB, which is safe because all five rules using the font also set `text-transform: lowercase`. If you add a new element with `font-family: var(--font-display)`, it **must** also set `text-transform: lowercase` or it will silently fall back to Impact/Arial Black.

**2. The strict CSP blocks all third-party resources.**
`_headers` sets `default-src 'self'` with no `'unsafe-inline'`. Adding a YouTube embed, a map, a donation widget, or analytics will make it **silently blank** until you add its origin to the matching directive. Symptom: a "Refused to load…" error in the browser console. Inline `<script>`, inline `<style>`, and `onclick="…"` attributes are all blocked too — keep behaviour in `js/main.js`. (The JSON-LD block is fine; `application/ld+json` is data, not executed script.)

**3. Fonts are self-hosted on purpose.**
Do not reintroduce `fonts.googleapis.com`. It would add two third-party origins to the critical path, send visitor IPs to Google (an EU privacy concern), and require loosening the CSP.

**4. The gallery uses two sets of images.**
The grid points at `images/gallery/thumbs/`; the lightbox array in `initGallery()` points at the full-size `images/gallery/`. **Adding a photo means adding both**, and updating the `for (let i = 1; i <= 32; i++)` loop bound in `js/main.js` plus the `aria-label="… of 32 …"` counts. Regenerate a thumbnail with:
```bash
python3 -c "from PIL import Image; im=Image.open('images/gallery/gallery-33.jpg'); im.resize((600,round(im.height*600/im.width))).save('images/gallery/thumbs/gallery-33.jpg',quality=78,optimize=True,progressive=True)"
```

**5. Gallery tiles are `<button>`, not `<div>`.**
That is what makes 32 photos reachable by keyboard. Don't convert them back.

**6. Never add a `_redirects` catch-all like `/*  /  301`.**
This took the site down once. Netlify refuses to redirect a path to itself; **Cloudflare Pages does not** — `/` matches `/*`, redirects to `/`, and loops forever, taking every URL with it. Unmatched paths are handled by `404.html`, which Cloudflare Pages serves automatically. Leave it that way.

**7. Bump `?v=` when you edit CSS or JS.**
Every asset URL carries `?v=20260726`. The query string is part of Cloudflare's cache key, so **editing `css/styles.css` or `js/main.js` without bumping the version means returning visitors keep the old file** (Cloudflare's browser TTL is 4 hours, and it overrides the shorter `max-age` in `_headers`). Bump it everywhere at once:
```bash
OLD=20260726; NEW=$(date +%Y%m%d)
sed -i '' "s/?v=$OLD/?v=$NEW/g" index.html css/styles.css js/main.js
```
This is also the escape hatch if the CDN ever serves something stale — a new version string is a fresh cache key and needs no dashboard access.

**8. Cache headers assume CSS/JS filenames are not content-hashed.**
`/images/*` and `/fonts/*` are cached for a year as immutable; `/css/*` and `/js/*` deliberately are not. If you ever start hashing filenames, revisit `_headers`.

**9. Commit new images.**
An image referenced in the HTML but left untracked deploys as a broken image — Cloudflare builds from git, not from your disk. After adding images:
```bash
git status --short          # nothing referenced should be untracked
```

**10. Body text must stay at or above 4.5:1 contrast.**
`--color-gray-600` is `#697079`, chosen because it clears WCAG AA on **both** white and the `#F8F9FA` section backgrounds. The previous `#868E96` failed at 3.3:1. Don't lighten it.

**11. Don't use `transition: all` on anything that toggles `visibility`.**
CSS transitions flip discrete properties like `visibility` at the *midpoint*, so the element stays unfocusable for half the duration. This broke lightbox focus once already — see the comment on the `.lightbox` rule.

---

## Key data points

- **Event date:** Saturday, 17 October 2026, 10:00 IST (2K Kids Run 10:00, all other events 11:00)
- **Total raised to date:** €238,804.16
- **2025 event raised:** €34,145.63
- **Venue:** Dromtrasna National School, Abbeyfeale, Co. Limerick, V94 W5RC
- **Registration:** https://eventmaster.ie/event/m1wpfyVFM8
- **Contact:** dromtrasnachallenge@gmail.com

## Known open items

- **Donate CTA** is an intentional "Coming Soon" placeholder (`btn-disabled`). Wire up a real URL when one exists.
- **Main sponsor logos** use placeholder alt text (`alt="Sponsor 1"` etc.) — replace with the real company names.
- `images/cheque-stitas.jpg` and the `.records-banner` / `.record*` CSS rules are unreferenced leftovers from when St. Ita's Community Hospital was a co-beneficiary. Safe to delete once that's confirmed retired.
