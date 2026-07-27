#!/usr/bin/env python3
"""Add one or more photos to the gallery.

WHY THIS EXISTS
    The gallery is the fiddliest thing on the site to update by hand, because one
    new photo means four separate edits that must all agree:

        1. images/gallery/gallery-N.jpg          full size, used by the lightbox
        2. images/gallery/thumbs/gallery-N.jpg   600px wide, used by the grid
        3. index.html      a new <button> AND a rewrite of every "of N" aria-label
        4. js/main.js      the `for (let i = 1; i <= N; i++)` loop bound

    Miss #4 and the new photo is unreachable in the lightbox. Miss the aria-label
    sweep and every photo announces the wrong count to a screen reader.

USAGE
    tools/add-gallery-photo.py ~/Desktop/finish-line.jpg
    tools/add-gallery-photo.py ~/Desktop/*.jpg
    tools/add-gallery-photo.py ~/Desktop/finish-line.jpg --dry-run

    Source images are copied, not moved. Originals are left alone.

AFTER RUNNING
    git status --short     # the new images MUST be committed - Cloudflare builds
                           # from git, not from your disk, so an untracked image
                           # deploys as a broken image
    tools/check.sh
"""

import argparse
import pathlib
import re
import shutil
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit(
        "error: Pillow is not installed.\n"
        "       python3 -m pip install --user Pillow"
    )

ROOT = pathlib.Path(__file__).resolve().parent.parent
FULL_DIR = ROOT / "images" / "gallery"
THUMB_DIR = FULL_DIR / "thumbs"
INDEX = ROOT / "index.html"
MAINJS = ROOT / "js" / "main.js"

THUMB_WIDTH = 600
# Matches the settings used for the existing 32 thumbnails.
THUMB_SAVE = dict(quality=78, optimize=True, progressive=True)

# The grid shows the first 9 with a stagger animation; everything after that is
# hidden behind the "View All Memories" toggle.
STAGGER_COUNT = 9


def fail(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def current_count():
    """Highest N for which images/gallery/gallery-N.jpg exists."""
    ns = []
    for p in FULL_DIR.glob("gallery-*.jpg"):
        m = re.fullmatch(r"gallery-(\d+)\.jpg", p.name)
        if m:
            ns.append(int(m.group(1)))
    if not ns:
        fail(f"no gallery-N.jpg files found in {FULL_DIR}")
    if sorted(ns) != list(range(1, max(ns) + 1)):
        missing = sorted(set(range(1, max(ns) + 1)) - set(ns))
        fail(f"gallery numbering has gaps (missing {missing}) - fix that first")
    return max(ns)


def asset_version():
    m = re.search(r"\?v=(\d{8})", INDEX.read_text(encoding="utf-8"))
    if not m:
        fail("could not find a ?v=YYYYMMDD string in index.html")
    return m.group(1)


def make_thumb(src, dest):
    with Image.open(src) as im:
        im = im.convert("RGB")
        h = round(im.height * THUMB_WIDTH / im.width)
        im.resize((THUMB_WIDTH, h), Image.LANCZOS).save(dest, "JPEG", **THUMB_SAVE)
    return THUMB_WIDTH, h


def button_html(index, n, total, width, height, version):
    """One grid tile. Must stay a <button> - that is what makes the gallery
    keyboard-reachable. Don't turn these back into <div>s."""
    cls = "gallery-item stagger-item" if n <= STAGGER_COUNT else "gallery-item gallery-item--extra"
    return (
        f'                    <button type="button" class="{cls}" data-index="{index}" '
        f'aria-label="View event photo {n} of {total} full screen">\n'
        f'                        <img src="images/gallery/thumbs/gallery-{n}.jpg?v={version}" '
        f'alt="" width="{width}" height="{height}" loading="lazy" decoding="async">\n'
        f'                    </button>\n'
    )


def main():
    ap = argparse.ArgumentParser(description="Add photos to the Dromtrasna gallery.")
    ap.add_argument("images", nargs="+", type=pathlib.Path, help="source image file(s)")
    ap.add_argument("--dry-run", action="store_true", help="report without writing")
    args = ap.parse_args()

    for src in args.images:
        if not src.is_file():
            fail(f"{src} is not a file")

    old_total = current_count()
    new_total = old_total + len(args.images)
    version = asset_version()

    print(f"Gallery: {old_total} photos -> {new_total}")
    print()

    index_text = INDEX.read_text(encoding="utf-8")
    js_text = MAINJS.read_text(encoding="utf-8")

    # Sanity-check the three places the count is recorded before touching anything.
    n_labels = len(re.findall(rf"of {old_total} full screen", index_text))
    n_buttons = len(re.findall(r'data-index="\d+"', index_text))
    m_loop = re.search(r"for \(let i = 1; i <= (\d+); i\+\+\)", js_text)
    if not m_loop:
        fail("could not find the gallery loop bound in js/main.js")
    if not (n_labels == n_buttons == old_total == int(m_loop.group(1))):
        fail(
            "the gallery count already disagrees between files:\n"
            f"       files on disk:        {old_total}\n"
            f'       "of N" aria-labels:   {n_labels}\n'
            f"       data-index buttons:   {n_buttons}\n"
            f"       js/main.js loop:      {m_loop.group(1)}\n"
            "       Run tools/check.sh and fix that before adding more."
        )

    new_buttons = ""
    for offset, src in enumerate(args.images):
        n = old_total + offset + 1
        full_dest = FULL_DIR / f"gallery-{n}.jpg"
        thumb_dest = THUMB_DIR / f"gallery-{n}.jpg"

        if args.dry_run:
            with Image.open(src) as im:
                h = round(im.height * THUMB_WIDTH / im.width)
            w = THUMB_WIDTH
            print(f"  would add {src.name}")
        else:
            shutil.copy2(src, full_dest)
            w, h = make_thumb(src, thumb_dest)
            print(f"  {src.name}")
        print(f"      -> images/gallery/gallery-{n}.jpg")
        print(f"      -> images/gallery/thumbs/gallery-{n}.jpg  ({w}x{h})")

        new_buttons += button_html(n - 1, n, new_total, w, h, version)

    # index.html: insert the new buttons just before the grid's closing </div>,
    # then sweep every aria-label up to the new total.
    closing = "                </div>\n\n                <div class=\"gallery-toggle-wrap reveal\">"
    if index_text.count(closing) != 1:
        fail("could not locate the end of #gallery-grid in index.html - "
             "the markup around .gallery-toggle-wrap has changed")
    index_text = index_text.replace(closing, new_buttons + closing)

    index_text, n_swept = re.subn(
        rf"of {old_total} full screen", f"of {new_total} full screen", index_text
    )
    if n_swept != old_total:
        fail(f"expected to rewrite {old_total} aria-labels, rewrote {n_swept}")

    # js/main.js: the loop bound that builds the lightbox array.
    js_text, n_js = re.subn(
        r"for \(let i = 1; i <= \d+; i\+\+\)",
        f"for (let i = 1; i <= {new_total}; i++)",
        js_text,
    )
    js_text = js_text.replace(
        f"// Gallery image paths (generate for all {old_total})",
        f"// Gallery image paths (generate for all {new_total})",
    )
    if n_js != 1:
        fail(f"expected 1 loop bound in js/main.js, found {n_js}")

    print()
    print(f"  index.html   +{len(args.images)} buttons, {n_swept} aria-labels rewritten")
    print(f"  js/main.js   loop bound -> {new_total}")

    if args.dry_run:
        print("\nDry run - nothing written.")
        return

    INDEX.write_text(index_text, encoding="utf-8")
    MAINJS.write_text(js_text, encoding="utf-8")

    print()
    print("Done. Now:")
    print("  1. tools/bump-version.sh   # js/main.js changed, so the ?v= must move")
    print("  2. git add images/gallery  # untracked images deploy as broken images")
    print("  3. tools/check.sh")


if __name__ == "__main__":
    main()
