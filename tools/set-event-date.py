#!/usr/bin/env python3
"""Set the event date everywhere it appears.

WHY THIS EXISTS
    The event date is duplicated in six places in three different formats. Miss one
    and the countdown disagrees with the hero badge, or Google's event rich result
    advertises last year's date. The six:

        index.html   og:description        "Saturday 17 October 2026"
        index.html   twitter:description   "Saturday 17 October 2026"
        index.html   JSON-LD startDate     "2026-10-17T10:00:00+01:00"
        index.html   JSON-LD endDate       "2026-10-17T15:00:00+01:00"
        index.html   .hero-date-badge      "Saturday, October 17, 2026"
        js/main.js   eventDate             "2026-10-17T10:00:00+01:00"

    The weekday name is computed, not copied, so it can't drift.

    Also updated, because they are all tied to the same year:
        JSON-LD name / og:title / twitter:title   "Dromtrasna Challenge 2026"
        JSON-LD validFrom                         "2026-01-01T00:00:00+00:00"
        medal section heading                     "YOUR 2026 MEDAL"
        medal image alt                           "2026 Dromtrasna Challenge ..."
        register CTA heading                      "Register for 2026"
        footer copyright                          "(c) 2026"
        sitemap.xml <lastmod>                     today's date

USAGE
    tools/set-event-date.py 2027-10-16
    tools/set-event-date.py 2027-10-16 --dry-run

NOT UPDATED (deliberately - these are last year's results, not this year's event):
    the "2025 RESULTS" heading, the nav "2025 Results" label, the "2025 Achievement"
    badge and the amounts beside them. Those change when results come in, not when
    the date is set. See MAINTENANCE.md.
"""

import argparse
import datetime
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# The event runs on Irish summer time in October, hence +01:00. Times of day are
# stable year to year: gates at 10:00, last finisher in by 15:00.
START_TIME = "T10:00:00+01:00"
END_TIME = "T15:00:00+01:00"


def fail(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


class Editor:
    """Applies regex substitutions, refusing to silently do nothing."""

    def __init__(self, path, dry_run):
        self.path = path
        self.dry_run = dry_run
        self.text = path.read_text(encoding="utf-8")
        self.original = self.text
        self.changes = []

    def sub(self, label, pattern, replacement, expected=1):
        new_text, n = re.subn(pattern, replacement, self.text)
        if n != expected:
            fail(
                f"{self.path.name}: expected {expected} match(es) for {label}, found {n}.\n"
                f"       The markup has moved since this script was written. Fix the\n"
                f"       pattern in tools/set-event-date.py rather than editing by hand,\n"
                f"       or the next run will be wrong too.\n"
                f"       Pattern: {pattern}"
            )
        self.text = new_text
        self.changes.append((label, n))

    def save(self):
        if self.text == self.original:
            return 0
        if not self.dry_run:
            self.path.write_text(self.text, encoding="utf-8")
        return sum(n for _, n in self.changes)


def main():
    ap = argparse.ArgumentParser(description="Set the Dromtrasna Challenge event date.")
    ap.add_argument("date", help="new event date, YYYY-MM-DD")
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="report what would change without writing anything",
    )
    args = ap.parse_args()

    try:
        new = datetime.date.fromisoformat(args.date)
    except ValueError:
        fail(f"'{args.date}' is not a valid YYYY-MM-DD date")

    index = ROOT / "index.html"
    mainjs = ROOT / "js" / "main.js"
    sitemap = ROOT / "sitemap.xml"

    for p in (index, mainjs, sitemap):
        if not p.exists():
            fail(f"{p} not found - run this from inside the repo")

    # Discover the current date from the JSON-LD, so the caller needn't supply it.
    m = re.search(r'"startDate":\s*"(\d{4}-\d{2}-\d{2})T', index.read_text(encoding="utf-8"))
    if not m:
        fail("could not find the JSON-LD startDate in index.html")
    old = datetime.date.fromisoformat(m.group(1))

    if old == new:
        print(f"Event date is already {new.isoformat()} - nothing to do.")
        return

    oy, ny = old.year, new.year

    # The three human-readable renderings, weekday computed rather than copied.
    old_badge = old.strftime("%A, %B %-d, %Y")     # Saturday, October 17, 2026
    new_badge = new.strftime("%A, %B %-d, %Y")
    old_prose = old.strftime("%A %-d %B %Y")       # Saturday 17 October 2026
    new_prose = new.strftime("%A %-d %B %Y")

    print(f"Event date: {old.isoformat()} -> {new.isoformat()}")
    print(f"  hero badge:   {old_badge!r} -> {new_badge!r}")
    print(f"  social prose: {old_prose!r} -> {new_prose!r}")
    if oy != ny:
        print(f"  year strings: {oy} -> {ny}")
    print()

    # ---- index.html -------------------------------------------------------
    e = Editor(index, args.dry_run)

    e.sub("JSON-LD startDate",
          rf'"startDate": "{old.isoformat()}{re.escape(START_TIME)}"',
          f'"startDate": "{new.isoformat()}{START_TIME}"')
    e.sub("JSON-LD endDate",
          rf'"endDate": "{old.isoformat()}{re.escape(END_TIME)}"',
          f'"endDate": "{new.isoformat()}{END_TIME}"')
    e.sub("hero date badge", re.escape(old_badge), new_badge)
    e.sub("og/twitter description date", re.escape(old_prose), new_prose, expected=2)

    if oy != ny:
        e.sub("JSON-LD validFrom",
              rf'"validFrom": "{oy}-01-01T00:00:00\+00:00"',
              f'"validFrom": "{ny}-01-01T00:00:00+00:00"')
        e.sub("event name (JSON-LD + og:title + twitter:title)",
              rf'Dromtrasna Challenge {oy}', f'Dromtrasna Challenge {ny}', expected=3)
        e.sub("medal heading", rf'YOUR {oy} MEDAL', f'YOUR {ny} MEDAL')
        e.sub("medal image alt", rf'alt="{oy} Dromtrasna', f'alt="{ny} Dromtrasna')
        e.sub("register CTA heading", rf'Register for {oy}', f'Register for {ny}')
        e.sub("footer copyright", rf'&copy; {oy} Dromtrasna', f'&copy; {ny} Dromtrasna')

    n_index = e.save()

    # ---- js/main.js -------------------------------------------------------
    j = Editor(mainjs, args.dry_run)
    j.sub("countdown eventDate",
          rf"new Date\('{old.isoformat()}{re.escape(START_TIME)}'\)",
          f"new Date('{new.isoformat()}{START_TIME}')")
    n_js = j.save()

    # ---- sitemap.xml ------------------------------------------------------
    s = Editor(sitemap, args.dry_run)
    today = datetime.date.today().isoformat()
    s.sub("sitemap lastmod",
          r"<lastmod>\d{4}-\d{2}-\d{2}</lastmod>",
          f"<lastmod>{today}</lastmod>")
    n_sitemap = s.save()

    for editor, count in ((e, n_index), (j, n_js), (s, n_sitemap)):
        print(f"  {editor.path.relative_to(ROOT)}  ({count} replacements)")
        for label, n in editor.changes:
            print(f"      - {label} x{n}")

    print()

    # The medal photo is named by year and can't be renamed automatically - there
    # is a new design each year. Warn loudly, because the alt text now says the new
    # year while the file may still be last year's picture.
    if oy != ny:
        medal_old = ROOT / "images" / f"medal-{oy}.jpg"
        medal_new = ROOT / "images" / f"medal-{ny}.jpg"
        if not medal_new.exists() and medal_old.exists():
            print(f"  !! images/medal-{ny}.jpg does not exist yet.")
            print(f"     index.html still points at images/medal-{oy}.jpg, but its alt text")
            print(f"     now says {ny}. Add the new photo, update the src and its")
            print(f"     width/height, then re-run tools/check.sh.")
            print()

    if args.dry_run:
        print("Dry run - nothing written.")
    else:
        print("Done. Now:")
        print("  1. tools/check.sh          # confirm all six locations agree")
        print("  2. add this year's medal photo and update its src + width/height")
        print("  3. update the Eventmaster registration URL (new event id each year)")
        print("  4. tools/bump-version.sh   # js/main.js changed")


if __name__ == "__main__":
    main()
