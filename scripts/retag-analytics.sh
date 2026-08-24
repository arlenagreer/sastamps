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
# CAUTION
#   PASTE the new measurement ID from the GA console. Never retype it. GA4 IDs carry
#   no checksum, so a typo that still matches ^G-[A-Z0-9]{6,12}$ passes validation,
#   rewrites every file, and passes --verify-live -- while collecting zero data.
#   The only real verification is seeing hits in GA4 Realtime.
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
# EXCLUSIONS, and why each one matters:
#   node_modules/, dist/  - vendored and built output; dist carries only the
#                           unrelated G-XXXXXXXXXX placeholder.
#   .git/                 - obvious.
#   .planning/, *.md      - the audit trail and docs. These DESCRIBE the old ID as
#                           historical fact. Rewriting them silently falsifies the
#                           record of what was changed and when.
#   this script           - contains the old ID in its own OLD_ID constant and must
#                           survive the rewrite intact to stay re-runnable.
SELF_REL="scripts/retag-analytics.sh"
EXCLUDE_RE='(^\./)?(node_modules|dist|\.planning)/|/\.git/|\.md$'
mapfile -t FILES < <(grep -rl "$OLD_ID" . 2>/dev/null \
  | grep -vE "$EXCLUDE_RE" | sed 's|^\./||' \
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
# NOTE the trailing `|| true`. Under `set -o pipefail` this pipeline returns
# non-zero on SUCCESS: once every file is rewritten, `grep -vxF "$SELF_REL"`
# filters out its last input line, emits nothing, and exits 1. `wc -l` still
# prints 0, but the pipeline's status is 1, which `set -e` turns into a silent
# abort of the whole script *after* the files were already modified. Without
# this guard the tool leaves a fully-correct rewrite on disk and reports failure.
remaining=$(grep -rl "$OLD_ID" . 2>/dev/null \
  | grep -vE "$EXCLUDE_RE" | sed 's|^\./||' \
  | grep -vxF "$SELF_REL" | wc -l | tr -d ' ' || true)
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

# add-analytics.js is a spent one-shot. Its mechanism is
#   content.replace('<head>', '<head>' + analyticsScript)
# which APPENDS a tag rather than replacing one, and it targets only 6 of the 10
# tagged pages. Re-running it after this rewrite injects a SECOND gtag loader and a
# SECOND config call -> every pageview counted twice.
if printf '%s\n' "${FILES[@]}" | grep -qxF 'scripts/add-analytics.js'; then
  echo "WARNING: scripts/add-analytics.js was re-tagged, but it is a spent one-shot."
  echo "         Re-running it appends a duplicate gtag block (double-counted pageviews)"
  echo "         and it only covers 6 of the 10 tagged pages. Strongly consider deleting"
  echo "         it -- git history preserves it. Left in place deliberately: that is"
  echo "         your call, not this script's."
  echo
fi
echo "Next:"
echo "  1. git diff                                  # review"
echo "  2. commit + push to main"
echo "  3. WAIT for the Actions 'deploy' job to succeed. GitHub Pages does NOT serve"
echo "     straight from the repo: .github/workflows/ci.yml has deploy(needs: test),"
echo "     so a test failure SKIPS the deploy and the old tag stays live."
echo "  4. scripts/retag-analytics.sh --verify-live $NEW_ID"
echo "  5. confirm hits in GA4 Realtime for $NEW_ID  <- THIS is the real verification."
echo "     --verify-live only proves the string is in the served HTML. A well-formed"
echo "     but WRONG id passes it while collecting nothing."
echo "  6. run both properties in parallel for one full reporting cycle"
echo "  7. only THEN retire the old property ($OLD_ID) - 35-day trash, then gone"
