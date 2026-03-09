---
phase: quick-fix
plan: "01"
subsystem: newsletter-archive
tags: [build, bundle, newsletter, archive]
dependency_graph:
  requires: []
  provides: [archive-bundle-updated]
  affects: [archive-page]
tech_stack:
  added: []
  patterns: [esbuild-bundle-rebuild]
key_files:
  created: []
  modified:
    - dist/js/archive.min.js
    - dist/bundle-analysis.json
decisions:
  - "Force-added dist/js/archive.min.js to git (already tracked despite .gitignore) to ship the rebuilt bundle"
metrics:
  duration: "41 seconds"
  completed_date: "2026-03-09"
  tasks_completed: 2
  files_modified: 2
---

# Quick Fix 01: Rebuild Archive Bundle for Archived Newsletter Links

**One-liner:** Rebuilt stale dist/js/archive.min.js (Feb 16 → Mar 9) via esbuild so renderArchivedNewsletters() is compiled into the production bundle, enabling 2008-2024 newsletter PDF links to appear on the archive page.

## What Was Done

The archive page (`archive.html`) was loading a stale `dist/js/archive.min.js` bundle dated February 16. Meanwhile, the source `js/pages/archive.js` had been updated on March 9 to include `renderArchivedNewsletters()` — a function that fetches `data/newsletters/archived-newsletters.json` and renders year-grouped PDF links into the `#archived-newsletters` container.

The fix was simply to run `npm run build:js` to recompile all page-specific bundles via esbuild. The archive bundle rebuilt successfully at 10.45 KB and now contains the `archived-newsletters` fetch reference.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rebuild JS bundles | 97f4dbd | dist/js/archive.min.js, dist/bundle-analysis.json |
| 2 | Human verification | approved | — (visual browser check) |

## Verification

- `grep -c "archived-newsletters" dist/js/archive.min.js` returns `1` (confirmed present)
- Bundle size: 10.45 KB
- All 10 page-specific bundles rebuilt successfully

## Human Verification

**Status: APPROVED**

Verified by user on 2026-03-09. Older newsletter links (2008-2024) appear correctly on the archive page, grouped by year with clickable PDF links below the 2025-2026 newsletter cards.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] dist/js/archive.min.js rebuilt and committed (97f4dbd)
- [x] grep confirms "archived-newsletters" present in bundle (count: 1)
- [x] SUMMARY.md created at correct path

## Self-Check: PASSED
