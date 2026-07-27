#!/usr/bin/env bash
#
# Bump the ?v= cache-busting string on every asset URL.
#
# WHY THIS EXISTS
#   Cloudflare's browser TTL for /css/* and /js/* is 4 hours and it overrides the
#   shorter max-age in _headers. The ?v= query string is part of Cloudflare's cache
#   key, so editing css/styles.css or js/main.js WITHOUT bumping it means returning
#   visitors keep the stale file. The string appears ~60 times across three files.
#
#   This is also the escape hatch if the CDN ever serves something stale: a new
#   version string is a fresh cache key, and it needs no dashboard access.
#
# USAGE
#   tools/bump-version.sh              # bump to today's date (YYYYMMDD)
#   tools/bump-version.sh 20270105     # bump to a specific version
#
# Run it from anywhere; it locates the repo root itself.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FILES=(index.html css/styles.css js/main.js)

# Find the current version rather than making the caller remember it.
OLD="$(grep -oh '?v=[0-9]\{8\}' "${FILES[@]}" | sort -u | sed 's/?v=//')"

if [ -z "$OLD" ]; then
    echo "error: no ?v=YYYYMMDD string found in ${FILES[*]}" >&2
    exit 1
fi

if [ "$(echo "$OLD" | wc -l | tr -d ' ')" -ne 1 ]; then
    echo "error: asset versions are already out of sync. Found:" >&2
    echo "$OLD" | sed 's/^/  ?v=/' >&2
    echo "Pass the version you want explicitly: tools/bump-version.sh YYYYMMDD" >&2
    exit 1
fi

NEW="${1:-$(date +%Y%m%d)}"

if ! echo "$NEW" | grep -q '^[0-9]\{8\}$'; then
    echo "error: version must be 8 digits (YYYYMMDD), got '$NEW'" >&2
    exit 1
fi

if [ "$OLD" = "$NEW" ]; then
    echo "Already at ?v=$NEW - nothing to do."
    echo "(If you edited CSS or JS today and need to force a refresh, pass tomorrow's"
    echo " date or any higher number: tools/bump-version.sh $((NEW + 1)))"
    exit 0
fi

echo "Bumping ?v=$OLD -> ?v=$NEW"
echo

TOTAL=0
for f in "${FILES[@]}"; do
    # -o then count lines: grep -c would count matching LINES, not occurrences.
    n="$(grep -o "?v=$OLD" "$f" | wc -l | tr -d ' ')"
    # BSD sed (macOS) needs the empty arg to -i; this script targets macOS.
    sed -i '' "s/?v=$OLD/?v=$NEW/g" "$f"
    printf '  %-18s %3d replaced\n' "$f" "$n"
    TOTAL=$((TOTAL + n))
done

echo
echo "  total              $TOTAL"
echo
echo "Done. Verify with: tools/check.sh"
