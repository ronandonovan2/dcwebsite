#!/usr/bin/env bash
#
# Pre-commit sanity check for the Dromtrasna Challenge site.
#
# WHY THIS EXISTS
#   This site has no build step and no tests, which is deliberate - but it means
#   nothing catches the handful of mistakes that have actually broken it before.
#   Every check below corresponds to a real failure mode documented in CLAUDE.md.
#   Run it before every commit. It is fast and reads only.
#
# USAGE
#   tools/check.sh
#
# Exit code 0 = everything agrees. Non-zero = at least one FAIL.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
WARN=0

if [ -t 1 ]; then
    G=$'\033[32m'; R=$'\033[31m'; Y=$'\033[33m'; B=$'\033[1m'; N=$'\033[0m'
else
    G=""; R=""; Y=""; B=""; N=""
fi

ok()   { printf '  %sPASS%s  %s\n' "$G" "$N" "$1"; PASS=$((PASS + 1)); }
bad()  { printf '  %sFAIL%s  %s\n' "$R" "$N" "$1"; FAIL=$((FAIL + 1)); }
warn() { printf '  %sWARN%s  %s\n' "$Y" "$N" "$1"; WARN=$((WARN + 1)); }
head_() { printf '\n%s%s%s\n' "$B" "$1" "$N"; }

# ---------------------------------------------------------------- event date
head_ "Event date (6 locations must agree)"

START="$(grep -o '"startDate": "[0-9-]*' index.html | head -1 | sed 's/.*"//')"
if [ -z "$START" ]; then
    bad "no JSON-LD startDate found in index.html"
else
    END="$(grep -o '"endDate": "[0-9-]*' index.html | head -1 | sed 's/.*"//')"
    JSDATE="$(grep -o "new Date('[0-9-]*" js/main.js | head -1 | sed "s/.*'//")"

    [ "$END" = "$START" ] \
        && ok "JSON-LD endDate matches startDate ($START)" \
        || bad "JSON-LD endDate ($END) != startDate ($START)"

    [ "$JSDATE" = "$START" ] \
        && ok "js/main.js countdown matches ($JSDATE)" \
        || bad "js/main.js countdown ($JSDATE) != startDate ($START)"

    # Render the two human-readable forms from startDate and look for them.
    BADGE="$(python3 -c "
import datetime,sys
d=datetime.date.fromisoformat('$START')
print(d.strftime('%A, %B %-d, %Y'))" 2>/dev/null)"
    PROSE="$(python3 -c "
import datetime,sys
d=datetime.date.fromisoformat('$START')
print(d.strftime('%A %-d %B %Y'))" 2>/dev/null)"

    if grep -qF "$BADGE" index.html; then
        ok "hero date badge matches (\"$BADGE\")"
    else
        bad "hero date badge does not say \"$BADGE\" - run tools/set-event-date.py"
    fi

    N_PROSE="$(grep -cF "$PROSE" index.html)"
    if [ "$N_PROSE" -eq 2 ]; then
        ok "og:description + twitter:description match (\"$PROSE\")"
    else
        bad "expected 2 social descriptions saying \"$PROSE\", found $N_PROSE"
    fi
fi

# ------------------------------------------------------------ asset versions
head_ "Asset cache-busting (?v=)"

VERSIONS="$(grep -oh '?v=[0-9]\{8\}' index.html css/styles.css js/main.js | sort -u)"
NVER="$(echo "$VERSIONS" | wc -l | tr -d ' ')"
if [ "$NVER" -eq 1 ]; then
    TOTAL="$(grep -oh '?v=[0-9]\{8\}' index.html css/styles.css js/main.js | wc -l | tr -d ' ')"
    ok "all $TOTAL asset URLs on $VERSIONS"
else
    bad "asset versions disagree: $(echo "$VERSIONS" | tr '\n' ' ')"
    echo "        Fix with: tools/bump-version.sh"
fi

# Warn if CSS or JS was touched more recently than the version string was bumped.
VER_DATE="$(echo "$VERSIONS" | head -1 | sed 's/?v=//')"
if [ -n "${VER_DATE:-}" ] && [ "$NVER" -eq 1 ]; then
    for f in css/styles.css js/main.js; do
        MOD="$(date -r "$f" +%Y%m%d 2>/dev/null || echo "")"
        if [ -n "$MOD" ] && [ "$MOD" -gt "$VER_DATE" ]; then
            warn "$f modified $MOD but ?v=$VER_DATE - returning visitors will keep the old file"
            echo "        Fix with: tools/bump-version.sh"
        fi
    done
fi

# ------------------------------------------------------------------- gallery
head_ "Gallery (count recorded in 4 places)"

FULL="$(find images/gallery -maxdepth 1 -name 'gallery-*.jpg' | wc -l | tr -d ' ')"
THUMBS="$(find images/gallery/thumbs -maxdepth 1 -name 'gallery-*.jpg' | wc -l | tr -d ' ')"
BUTTONS="$(grep -c 'data-index="' index.html)"
LABELS="$(grep -o 'of [0-9]* full screen' index.html | sort -u | head -1 | grep -o '[0-9]*')"
LOOP="$(grep -o 'i <= [0-9]*' js/main.js | head -1 | grep -o '[0-9]*')"

if [ "$FULL" = "$THUMBS" ] && [ "$FULL" = "$BUTTONS" ] \
   && [ "$FULL" = "${LABELS:-x}" ] && [ "$FULL" = "${LOOP:-x}" ]; then
    ok "all agree on $FULL photos (files, thumbs, buttons, aria-labels, JS loop)"
else
    bad "gallery counts disagree"
    echo "        full-size files:    $FULL"
    echo "        thumbnails:         $THUMBS"
    echo "        grid buttons:       $BUTTONS"
    echo "        \"of N\" aria-labels: ${LABELS:-none found}"
    echo "        js/main.js loop:    ${LOOP:-none found}"
    echo "        Add photos with: tools/add-gallery-photo.py"
fi

# Every "of N" label should say the same N.
NDISTINCT="$(grep -o 'of [0-9]* full screen' index.html | sort -u | wc -l | tr -d ' ')"
[ "$NDISTINCT" -le 1 ] \
    && ok "every aria-label quotes the same total" \
    || bad "aria-labels quote $NDISTINCT different totals"

# ------------------------------------------------------- untracked images
head_ "Referenced files are committed"

MISSING=0
UNTRACKED=0
# Only look inside real references - src="", href="", content="", url() - so that
# example paths written in comments (images/medal-YYYY.jpg) are not mistaken for
# broken assets. Done in Python because the paths need normalising: strip the
# ?v= query, make /favicon.ico root-relative, and resolve the ../ in the url()
# references inside css/styles.css, which are relative to css/.
REFS="$(python3 tools/list-asset-refs.py)"
while IFS= read -r f; do
    [ -z "$f" ] && continue
    if [ ! -f "$f" ]; then
        bad "referenced but not on disk: $f"
        MISSING=$((MISSING + 1))
    elif ! git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
        bad "referenced but NOT COMMITTED: $f  (deploys as a broken image)"
        UNTRACKED=$((UNTRACKED + 1))
    fi
done <<< "$REFS"

NREFS="$(echo "$REFS" | grep -c . || true)"
[ "$MISSING" -eq 0 ] && [ "$UNTRACKED" -eq 0 ] \
    && ok "all $NREFS referenced assets exist and are tracked by git"

# Gallery images are built by a loop in JS, so they never appear as literals above.
GAL_UNTRACKED="$(git ls-files --others --exclude-standard images/gallery | wc -l | tr -d ' ')"
[ "$GAL_UNTRACKED" -eq 0 ] \
    && ok "no untracked files in images/gallery" \
    || bad "$GAL_UNTRACKED untracked file(s) in images/gallery - git add them"

# ------------------------------------------------------------ the redirect trap
head_ "Deployment traps"

if [ -e "_redirects" ]; then
    bad "_redirects exists. A catch-all like '/*  /  301' loops forever on"
    echo "        Cloudflare Pages and takes the whole site down. This has happened."
    echo "        Unmatched paths are handled by 404.html - delete _redirects."
else
    ok "no _redirects file (a catch-all in it once took the site down)"
fi

[ -f "_headers" ] \
    && ok "_headers present (CSP + cache policy)" \
    || bad "_headers is missing - the site would deploy with no CSP"

# ------------------------------------------------------------- lowercase font
head_ "Plane Crash font (subsetted to lowercase only)"

# fonts/planecrash-latin.woff2 contains a-z and 0-9 only - no uppercase glyphs
# (they were dropped to get it from 286KB to 88KB). Any element using the display
# font must therefore also force lowercase, or uppercase characters fall back to
# Impact/Arial Black one glyph at a time.
#
# A rule can be legitimately exempt if a more specific rule overrides its
# font-family, or if its text is lowercase in the markup already. List those here
# with the reason, so the check stays meaningful instead of being switched off.
FONT_EXEMPT='^h1{'          # .hero-title overrides font-family to Permanent Marker

BADFONT=0
while IFS= read -r line; do
    [ -z "$line" ] && continue
    num="${line%%:*}"
    rule="${line#*:}"
    case "$rule" in
        *text-transform:lowercase*) continue ;;
    esac
    if echo "$rule" | grep -q "$FONT_EXEMPT"; then
        continue
    fi
    warn "css/styles.css:$num uses var(--font-display) without text-transform:lowercase"
    echo "          ${rule%%\{*} - any uppercase character here renders in the"
    echo "          fallback font instead. Add text-transform:lowercase, or add it"
    echo "          to FONT_EXEMPT in this script with a reason."
    BADFONT=$((BADFONT + 1))
done <<< "$(grep -n 'var(--font-display)' css/styles.css | grep -v '@font-face')"

NFONT="$(grep -c 'var(--font-display)' css/styles.css)"
[ "$BADFONT" -eq 0 ] \
    && ok "all $NFONT display-font rules force lowercase (or are listed exempt)"

# ------------------------------------------------------------------ CSP purity
head_ "Content Security Policy (default-src 'self', no unsafe-inline)"

# -oh + wc, because grep -c across several files prints "file:count" per file.
INLINE_STYLE="$(grep -oh 'style="' index.html 404.html | wc -l | tr -d ' ')"
[ "$INLINE_STYLE" -eq 0 ] \
    && ok "no inline style= attributes" \
    || bad "$INLINE_STYLE inline style= attribute(s) - the CSP will block them"

ONHANDLER="$(grep -oE '\son(click|load|error|change|submit)=' index.html | wc -l | tr -d ' ')"
[ "$ONHANDLER" -eq 0 ] \
    && ok "no inline event handlers" \
    || bad "$ONHANDLER inline on*= handler(s) - the CSP will block them"

# Only SUBRESOURCE loads matter here. Outbound <a href> links (Eventmaster,
# MyRunResults, the socials) and JSON-LD sameAs URLs cost nothing at runtime and
# are not subject to the CSP - flagging those would make this check pure noise.
# What would break the site is a stylesheet, script, font, image or iframe served
# from another origin, because default-src 'self' silently blocks it.
# Subresource-loading contexts only. Deliberately NOT matched: <link rel=canonical>,
# og:url and og:image content= - those are metadata, not fetches.
SUBRES_RE='(src|srcset)="https?://[a-z0-9.-]+'
SUBRES_RE="$SUBRES_RE"'|rel="(stylesheet|preload|preconnect|dns-prefetch|modulepreload)"[^>]*href="https?://[a-z0-9.-]+'
SUBRES_RE="$SUBRES_RE"'|href="https?://[a-z0-9.-]+[^>]*rel="(stylesheet|preload|preconnect|dns-prefetch|modulepreload)"'
SUBRES_RE="$SUBRES_RE"'|url\(https?://[a-z0-9.-]+|@import[^;]*https?://[a-z0-9.-]+'

THIRD="$(grep -ohE "$SUBRES_RE" index.html 404.html css/styles.css js/main.js 2>/dev/null \
        | grep -oE 'https?://[a-z0-9.-]+' \
        | sed 's|https*://||' \
        | sort -u \
        | grep -v '^dromtrasnachallenge\.com$' || true)"
IFRAME="$(grep -oh '<iframe' index.html 404.html 2>/dev/null | wc -l | tr -d ' ')"
if [ -z "$THIRD" ] && [ "${IFRAME:-0}" -eq 0 ]; then
    ok "no third-party subresources (fonts stay self-hosted, no embeds)"
else
    bad "third-party subresource(s) - the CSP in _headers will silently block these"
    [ -n "$THIRD" ] && echo "$THIRD" | sed 's/^/          /'
    [ "${IFRAME:-0}" -gt 0 ] && echo "          ${IFRAME} <iframe> element(s)"
    echo "        Either self-host it, or add its origin to the matching CSP"
    echo "        directive in _headers. Symptom in the browser: \"Refused to load...\"."
fi

# --------------------------------------------------------------- results year
head_ "Consistency"

RYEAR="$(grep -o '[0-9]\{4\} RESULTS' index.html | head -1 | grep -o '^[0-9]*')"
NAVYEAR="$(grep -o '>[0-9]\{4\} Results<' index.html | head -1 | grep -o '[0-9]\{4\}')"
if [ -n "$RYEAR" ] && [ "$RYEAR" = "$NAVYEAR" ]; then
    ok "results heading and nav label both say $RYEAR"
else
    bad "results heading ($RYEAR) and nav dropdown label ($NAVYEAR) disagree"
fi

SITEMAP_DATE="$(grep -o '<lastmod>[0-9-]*' sitemap.xml | sed 's/.*>//')"
TODAY="$(date +%Y-%m-%d)"
[ "$SITEMAP_DATE" \< "$TODAY" ] || [ "$SITEMAP_DATE" = "$TODAY" ] \
    && ok "sitemap.xml lastmod is $SITEMAP_DATE" \
    || warn "sitemap.xml lastmod ($SITEMAP_DATE) is in the future"

# -------------------------------------------------------------------- summary
printf '\n%s%s%s\n' "$B" "────────────────────────────────────────" "$N"
printf '  %s%d passed%s' "$G" "$PASS" "$N"
[ "$WARN" -gt 0 ] && printf ', %s%d warning%s' "$Y" "$WARN" "$N"
[ "$FAIL" -gt 0 ] && printf ', %s%d FAILED%s' "$R" "$FAIL" "$N"
printf '\n\n'

exit $((FAIL > 0 ? 1 : 0))
