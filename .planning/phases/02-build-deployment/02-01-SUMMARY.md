---
phase: 02-build-deployment
plan: 01
subsystem: build
tags: [esbuild, javascript, bundles, tree-shaking]

requires:
  - phase: 01-asset-loading
    provides: Base asset loading fixes
provides:
  - Page-specific JS bundles for archive and membership pages
  - Updated HTML references to page-specific bundles
affects: [03-display-ux-fixes]

tech-stack:
  added: []
  patterns: [page-specific entry points following about.js pattern]

key-files:
  created:
    - js/pages/archive.js
    - js/pages/membership.js
  modified:
    - esbuild.config.js
    - archive.html
    - membership.html

key-decisions:
  - "Followed about.js pattern exactly for new entry points"
  - "dist/ is gitignored so built bundles are not committed"

patterns-established:
  - "Page entry point pattern: import safe-dom, logger, breadcrumb, event-cleanup; init breadcrumb, mobile menu, service worker"

duration: 2min
completed: 2026-02-16
---

# Phase 2 Plan 01: Deploy Page-Specific JS Bundles Summary

**Created archive.js and membership.js entry points with esbuild config, updated HTML pages to reference page-specific bundles instead of legacy script.min.js**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T14:50:58Z
- **Completed:** 2026-02-16T14:52:25Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created js/pages/archive.js and js/pages/membership.js following about.js pattern
- Added both to esbuild.config.js pageConfigs array with proper globalName entries
- Built bundles: archive.min.js (8.67 KB), membership.min.js (8.69 KB)
- Updated archive.html and membership.html to reference page-specific bundles
- Verified no legacy script.min.js references remain in either HTML file

## Task Commits

Each task was committed atomically:

1. **Task 1: Create archive and membership page entry points and add to esbuild config** - `63629f3` (feat)
2. **Task 2: Update HTML pages to reference page-specific bundles** - `0f58788` (feat)

## Files Created/Modified
- `js/pages/archive.js` - Archive page entry point with breadcrumb, mobile menu, service worker
- `js/pages/membership.js` - Membership page entry point with same pattern
- `esbuild.config.js` - Added SAPA_ARCHIVE and SAPA_MEMBERSHIP to pageConfigs
- `archive.html` - Script reference changed to dist/js/archive.min.js
- `membership.html` - Script reference changed to dist/js/membership.min.js

## Decisions Made
- Followed about.js pattern exactly for consistency (no additional page functionality)
- dist/ directory is in .gitignore, so built bundles are not tracked in git

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four page-specific bundles (about, archive, membership, glossary) now build correctly
- Ready for Plan 02-02 (sitemap link removal) and Phase 3

---
*Phase: 02-build-deployment*
*Completed: 2026-02-16*
