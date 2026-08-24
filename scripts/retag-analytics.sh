#!/usr/bin/env bash
#
# retag-analytics.sh — repoint this site's Google Analytics tag at a new GA4 property.
#
# WHY THIS EXISTS
#   The GA4 measurement ID is hardcoded in 11 files (10 static .html pages plus
#   scripts/add-analytics.js), twice in each: once in the gtag.js loader URL and
#   once in the gtag('config', ...) call. Re-tagging by hand risks a PARTIAL
#   rewrite, which silently splits traffic across two properties — the failure
#   mode is invisible until you notice your numbers halved.
#
#   This script makes the rewrite atomic and then HARD-ASSERTS that zero
#   occurrences of the old ID survive. It refuses to leave a half-done state.
#
# USAGE
#   scripts/retag-analytics.sh --dry-run G-NEWID12345    # show the plan, change nothing
#   scripts/retag-analytics.sh G-NEWID12345              # perform the rewrite
#   scripts/retag-analytics.sh --verify-live G-NEWID12345 # check the DEPLOYED site
#
set -euo pipefail

OLD_ID="G-XW5LFQ52YR"
SITE_BASE="https://www.sastamps.org"

DRY_RUN=0
VERIFY_LIVE=0
NEW_ID=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)     DRY_RUN=1 ;;
    --verify-live) VERIFY_LIVE=1 ;;
    -h|--help)     sed -n '2,20p' "$0"; exit 0 ;;
    -*)            echo "unknown flag: $1" >&2; exit 2 ;;
    *)             NEW_ID="$1" ;;
  esac
  shift
done

die() { echo "ERROR: $*" >&2; exit 1; }

[ -n "$NEW_ID" ] || die "no new measurement ID given. Usage: $0 [--dry-run] G-XXXXXXXXXX"

# A GA4 measurement ID is 'G-' followed by an alphanumeric token.
echo "$NEW_ID" | grep -qE '^G-[A-Z0-9]{6,12}$' \
  || die "'$NEW_ID' is not a valid GA4 measurement ID (expected G- followed by 6-12 uppercase alphanumerics)"

[ "$NEW_ID" != "$OLD_ID" ] || die "new ID is identical to the old one ($OLD_ID) — nothing to do"

cd "$(git rev-parse --show-toplevel)"

# ---------------------------------------------------------------- verify-live
if [ "$VERIFY_LIVE" -eq 1 ]; then
  echo "Verifying DEPLOYED site at $SITE_BASE expects $NEW_ID ..."
  fail=0
  for page in "" 404.html about.html archive.html contact.html glossary.html \
              index.html meetings.html membership.html newsletter.html search.html; do
    url="$SITE_BASE/$page"
    body="$(curl -sL --max-time 20 -A 'Mozilla/5.0 retag-verify' "$url" 2>/dev/null || true)"
    if [ -z "$body" ]; then
      printf '  ?? %-18s (no response)\n' "${page:-/}"; fail=1; continue
    fi
    has_new=$(printf '%s' "$body" | grep -c "$NEW_ID" || true)
    has_old=$(printf '%s' "$body" | grep -c "$OLD_ID" || true)
    if [ "$has_new" -gt 0 ] && [ "$has_old" -eq 0 ]; then
      printf '  OK %-18s new=%s old=0\n' "${page:-/}" "$has_new"
    else
      printf '  !! %-18s new=%s old=%s\n' "${page:-/}" "$has_new" "$has_old"; fail=1
    fi
  done
  [ "$fail" -eq 0 ] || die "live verification FAILED — the deployed site is not cleanly on $NEW_ID"
  echo "Live verification PASSED. Now confirm hits are arriving in GA4 Realtime for $NEW_ID."
  exit 0
fi

# ------------------------------------------------------------------- discover
# Deliberately excludes dist/ (built bundles carry only the unrelated
# G-XXXXXXXXXX placeholder), node_modules, and .git.
# Excludes dist/, node_modules, .git — and THIS SCRIPT, which necessarily contains
# the old ID in its own OLD_ID constant and must survive the rewrite intact.
SELF_REL="scripts/retag-analytics.sh"
mapfile -t FILES < <(grep -rl "$OLD_ID" . 2>/dev/null \
  | grep -vE '(^\./)?(node_modules|dist)/|/\.git/' | sed 's|^\./||' \
  | grep -vxF "$SELF_REL" | sort)

[ "${#FILES[@]}" -gt 0 ] || die "found no files containing $OLD_ID — already re-tagged, or run from the wrong repo"

total=0
echo "Re-tag plan:  $OLD_ID  ->  $NEW_ID"
echo
for f in "${FILES[@]}"; do
  n=$(grep -c "$OLD_ID" "$f" || true)
  total=$((total + n))
  printf '  %-32s %s occurrence(s)\n' "$f" "$n"
done
echo
echo "  ${#FILES[@]} files, $total occurrences"
echo

if [ "$DRY_RUN" -eq 1 ]; then
  echo "--dry-run: nothing was modified."
  exit 0
fi

# -------------------------------------------------------------------- rewrite
# BSD sed (macOS) needs an explicit empty suffix for -i; GNU sed must not get one.
if sed --version >/dev/null 2>&1; then SED_INPLACE=(-i); else SED_INPLACE=(-i ''); fi

for f in "${FILES[@]}"; do
  sed "${SED_INPLACE[@]}" "s/${OLD_ID}/${NEW_ID}/g" "$f"
done

# --------------------------------------------------------------------- assert
remaining=$(grep -rl "$OLD_ID" . 2>/dev/null \
  | grep -vE '(^\./)?(node_modules|dist)/|/\.git/' | sed 's|^\./||' \
  | grep -vxF "$SELF_REL" | wc -l | tr -d ' ')
[ "$remaining" -eq 0 ] \
  || die "rewrite incomplete — $remaining file(s) still contain $OLD_ID. Working tree is DIRTY; inspect with: git diff"

written=0
for f in "${FILES[@]}"; do
  n=$(grep -c "$NEW_ID" "$f" || true)
  written=$((written + n))
done
[ "$written" -eq "$total" ] \
  || die "occurrence count mismatch: expected $total, wrote $written. Inspect with: git diff"

echo "Rewrote $total occurrence(s) across ${#FILES[@]} file(s). Old ID: 0 remaining."
echo
echo "Next:"
echo "  1. git -C \"\$(pwd)\" diff                       # review"
echo "  2. commit and push (GitHub Pages deploys from the repo)"
echo "  3. scripts/retag-analytics.sh --verify-live $NEW_ID"
echo "  4. confirm hits in GA4 Realtime for $NEW_ID"
echo "  5. only THEN retire the old property ($OLD_ID)"
