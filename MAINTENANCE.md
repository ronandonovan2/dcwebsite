# Maintenance playbook

Recipes for updating the site. `CLAUDE.md` covers the hazards; this file covers the
tasks. You should not need to read `index.html` end to end to do anything here —
every recipe starts with the `grep` that lands you on the right line.

**Golden rule: run `tools/check.sh` before every commit.** It verifies the things
that are duplicated across files and have broken the site before.

```bash
python3 -m http.server 8000     # preview at http://localhost:8000
tools/check.sh                  # verify before committing
```

---

## The one command to start with

Everything that changes from one year to the next is tagged in `index.html`:

```bash
grep -n "ANNUAL:" index.html
```

That is your whole yearly checklist, with line numbers, in one screen. Use it
instead of reading the file.

---

## New year rollover

Do these in order. Steps 1 and 5 are scripted; the rest are content you have to
supply.

```bash
# 1. Date, year strings, JSON-LD, countdown, sitemap - all six date locations
tools/set-event-date.py 2027-10-16

# 2. New medal photo (see "Replace the medal photo" below)
# 3. New Eventmaster registration URL (see "Registration link")
# 4. Last year's results and totals (see "Results" and "Fundraising totals")

# 5. Cache-bust, because js/main.js changed
tools/bump-version.sh

# 6. Verify and commit
tools/check.sh
git status --short          # nothing referenced should be untracked
```

---

## Event date

**Scripted — don't do this by hand.** The date lives in six places in three
different formats, and the weekday name has to be recomputed.

```bash
tools/set-event-date.py 2027-10-16
tools/set-event-date.py 2027-10-16 --dry-run    # preview first
```

It updates:

| Where | Format |
|---|---|
| `index.html` og:description | `Saturday 16 October 2027` |
| `index.html` twitter:description | `Saturday 16 October 2027` |
| `index.html` JSON-LD `startDate` | `2027-10-16T10:00:00+01:00` |
| `index.html` JSON-LD `endDate` | `2027-10-16T15:00:00+01:00` |
| `index.html` `.hero-date-badge` | `Saturday, October 16, 2027` |
| `js/main.js` `eventDate` | `2027-10-16T10:00:00+01:00` |

Plus, when the year changes: the JSON-LD `name`, `og:title`, `twitter:title`,
`validFrom`, the medal heading and alt text, the register CTA heading, the footer
copyright, and `sitemap.xml` `<lastmod>`.

The script refuses to run if the markup has moved out from under it, rather than
silently doing nothing. If that happens, fix the pattern in the script — don't
work around it by editing by hand, or the next run will be wrong too.

If the start times ever change (currently 10:00 for the 2K Kids Run, 11:00 for
everything else), those are in the event cards and in `START_TIME`/`END_TIME` at
the top of `tools/set-event-date.py`:

```bash
grep -n "event-time\|11:00 AM\|10:00 AM" index.html
```

---

## Fundraising totals

```bash
grep -n "data-target\|highlight-amount\|impact-years" index.html
```

- **Cumulative total** — the `data-target` attribute on `.counter-number`. The
  visible `0` is a placeholder that `js/main.js` animates up to the target. Write
  it as a plain number, no commas: `data-target="273000.00"`.
- **Last year's total** — `.highlight-amount`, written for display: `&euro;34,145.63`.
- **Years running** — `.impact-years`.
- The sentence naming the beneficiaries is the `.highlight-text` `<p>` just below.

---

## Results

The leaderboard is 12 podium places (10K and 5K × Men's and Women's × top 3). To
see all of them without reading the section:

```bash
grep -n 'leaderboard-title\|leaderboard-category\|class="name"\|class="time"' index.html
```

That returns ~30 lines instead of the ~160 the section occupies. Edit the `.name`
and `.time` lines in place.

Each place looks like this — keep the `gold`/`silver`/`bronze` class matching the
position:

```html
<div class="podium-item gold">
    <span class="position">1</span>
    <span class="name">John Fitzgerald</span>
    <span class="time">36:10</span>
</div>
```

Also update the year in two places, which must agree (`tools/check.sh` verifies):

```bash
grep -n "RESULTS</h2>\|Results</a>" index.html
```

**Results link** — the MyRunResults URL has a new event id each year:

```bash
grep -n "myrunresults" index.html
```

---

## Registration link

New Eventmaster event id each year. It appears **twice** — in the JSON-LD offers
block and on the button:

```bash
grep -n "eventmaster.ie" index.html
```

---

## Gallery photos

**Scripted.** Adding a photo by hand means four edits that must agree, and missing
the JS loop bound makes the new photo unreachable in the lightbox.

```bash
tools/add-gallery-photo.py ~/Desktop/finish-line.jpg
tools/add-gallery-photo.py ~/Desktop/*.jpg          # several at once
tools/add-gallery-photo.py ~/Desktop/photo.jpg --dry-run

git add images/gallery                              # REQUIRED - see below
tools/bump-version.sh                               # js/main.js changed
tools/check.sh
```

The script copies the source (it doesn't move it), generates the 600px thumbnail,
appends the grid button with the right `data-index`, rewrites every `of N`
aria-label, and bumps the loop bound in `js/main.js`.

**Committing the images is not optional.** Cloudflare builds from git, not from
your disk, so an untracked image deploys as a broken image. `tools/check.sh`
catches this.

To remove a photo, renumber the remaining files so `gallery-1..N` has no gaps —
the script refuses to run on a gappy sequence.

---

## Sponsors

**Main sponsors** (logos):

```bash
grep -n "main-sponsors-grid" index.html
```

Three `<img>` tags. The company name lives **only** in the `alt` attribute, so keep
it accurate. A replacement logo needs its own true `width`/`height` — they're all
different aspect ratios.

**Community sponsors** (the scrolling marquee):

```bash
grep -n "sponsor-name" index.html | head
grep -c "sponsor-name" index.html          # how many there are
```

One `<span class="sponsor-name">Name</span>` per line, alphabetised within each of
the two rows, split roughly evenly. `js/main.js` duplicates each row's HTML at
runtime so the marquee loops seamlessly — **add each name once only**, or it will
appear twice.

---

## FAQ

```bash
grep -n "faq-question" index.html
```

Each entry is a `.faq-item` block: a `<button class="faq-question">` with the
question text and a chevron SVG, then a `.faq-answer` div with the answer. Copy an
existing block wholesale and change the two text nodes — the `aria-expanded` and
the accordion behaviour come from `js/main.js` and need no wiring.

---

## Replace the medal photo

```bash
grep -n "medal-image-photo\|YOUR .* MEDAL" index.html
```

1. Add `images/medal-2027.jpg`
2. Update the `src`, the `alt`, **and the `width`/`height`** to the real pixel
   dimensions — every image on the site carries them to stop the page jumping
   about as it loads
3. `git add images/`

---

## Contact details and social links

```bash
grep -n "dromtrasnachallenge@gmail.com" index.html    # 4 places
grep -n "social-link" index.html                      # contact + footer
grep -n "sameAs" index.html                           # JSON-LD
```

Each social network appears three times: JSON-LD `sameAs`, the contact section, and
the footer.

---

## Colours, spacing, styling

```bash
grep -n ":root" css/styles.css        # all design tokens, one line
```

`css/styles.css` is minified but **one CSS rule per line**, so `grep -n` lands you
exactly on the rule and you can edit that single line. Treat that as a feature.

```bash
grep -n "\.faq-answer" css/styles.css
grep -n "\.podium-item" css/styles.css
```

If you need the original readable source, it's in git from before the minification
commit — this does not change the live file:

```bash
git show 11c3f26^:css/styles.css > /tmp/styles-readable.css
```

**After any CSS or JS edit, run `tools/bump-version.sh`.** Without it, returning
visitors keep the old file for up to four hours.

---

## Adding a whole new section

1. Copy an existing `<section class="section" id="...">` block as the skeleton
2. Add the nav link (`grep -n "nav-menu" index.html`)
3. Add the styles to `css/styles.css`
4. If it needs behaviour, add an `init*` function to `js/main.js` and call it from
   the `DOMContentLoaded` handler — **no inline `<script>` or `onclick`**, the CSP
   blocks both
5. If it uses `var(--font-display)`, it **must** also set `text-transform: lowercase`
6. `tools/bump-version.sh && tools/check.sh`

---

## What `tools/check.sh` verifies

| Check | The failure it prevents |
|---|---|
| Six event-date locations agree | countdown disagreeing with the hero badge, or Google advertising last year's date |
| All `?v=` strings identical | half-bumped cache-buster |
| CSS/JS newer than the `?v=` date | editing CSS or JS and forgetting to bump |
| Gallery count agrees in 5 places | new photo unreachable in the lightbox; wrong count read out to screen readers |
| Referenced assets exist and are committed | broken images on the live site (Cloudflare builds from git) |
| No `_redirects` file | the redirect loop that took the site down once |
| Display-font rules force lowercase | text silently falling back to Impact |
| No inline `style=` / `on*=` / third-party subresources | content silently blocked by the CSP |
| Results year matches the nav label | mismatched years after a rollover |

It reads only — it never edits anything.
