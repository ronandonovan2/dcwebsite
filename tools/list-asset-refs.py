#!/usr/bin/env python3
"""Print every local asset path referenced by the site, one per line.

Used by tools/check.sh to verify that nothing referenced is missing or
uncommitted. Lives in its own file rather than as a heredoc inside check.sh
because bash mis-parses a heredoc containing quotes and parens when it sits
inside a $(...) command substitution.

Only real references are matched - src="", href="", content="" and CSS url() -
so example paths written in comments (images/medal-YYYY.jpg) are not mistaken
for broken assets.

Paths are normalised to be relative to the repo root: the ?v= query is stripped,
leading / is removed, and the ../ in css/styles.css url() references is resolved
(they are relative to css/, not to the root).
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# file -> directory that its relative URLs resolve against
SOURCES = {
    "index.html": "",
    "404.html": "",
    "site.webmanifest": "",
    "js/main.js": "",
    "css/styles.css": "css",
}

EXTS = "jpg|jpeg|png|webp|svg|ico|woff2"
PATTERN = re.compile(
    r'(?:src|href|content)="([^"]+?\.(?:' + EXTS + r'))'
    r"|url\(['\"]?([^'\")]+?\.(?:" + EXTS + r"))"
)


def main():
    found = set()
    for name, base in SOURCES.items():
        path = ROOT / name
        if not path.exists():
            continue
        for match in PATTERN.finditer(path.read_text(encoding="utf-8")):
            ref = (match.group(1) or match.group(2)).split("?")[0]
            if ref.startswith(("http://", "https://", "data:", "#")):
                continue
            if ref.startswith("/"):
                rel = ref.lstrip("/")
            elif base:
                rel = f"{base}/{ref}"
            else:
                rel = ref
            # Collapse any ../ segments, e.g. css/../fonts/x.woff2 -> fonts/x.woff2
            parts = []
            for part in pathlib.PurePosixPath(rel).parts:
                if part == "..":
                    if parts:
                        parts.pop()
                elif part != ".":
                    parts.append(part)
            found.add("/".join(parts))

    print("\n".join(sorted(found)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
