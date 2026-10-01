---
quick_id: 20260717-july31-sam-rodgers-program
title: "Post Philatex Q3-2026 Rev1 PDF + add July 31 Sam Rodgers program to schedule"
date: 2026-07-17
branch: content/philatex-q3-rev1-july31
status: complete (merged #119 → c592fbf, deployed + verified live)
commits:
  - 89a7b61 feat(content): post Philatex Q3 2026 Rev1 + add July 31 Sam Rodgers program
  - b26792f build: regenerate bundles + search index for July 31 program
  - e843692 polish(home): future-proof FontAwesome 6 icon name for July 31 card
---

# Summary — Philatex Q3 2026 Rev1 + July 31 Sam Rodgers program

## What changed
Source of truth: Jim Durham email thread `[Gmail message id redacted]` ("Updated Philatex...").
Only substantive change = newly-confirmed July 31 program (Sam Rodgers, "Cataloging U.S. Stamps").

- **PDF**: `public/SAPA-PHILATEX-Third-Quarter-2026.pdf` overwritten with Rev1 (7 pp, 870,143 B). Same URL.
- **meetings.json** `2026-07-31`: title "Stamp Program: Cataloging U.S. Stamps", presenter Sam Rodgers,
  real topic/description, `[UNVERIFIED]` stripped. type "regular" (stamp-program convention).
- **ICS** (both): `data/calendar/2026-07-31-meeting.ics` + July 31 VEVENT in `public/sapa-q3-2026-meetings.ics`.
- **newsletters.json**: fileSize 916→850 KB; July 31 program added to description/highlights/featuredArticles (category "Education").
- **index.html**: Club News card (July 4 Stamp Unveiling → July 31 Special Presentation) + Latest Issue Highlights bullet.
- **Rebuilt**: `node esbuild.config.js` + `build-search-index.js` + `build-search-embedded.js` →
  dist/js/*.min.js, dist/data/search-*.json, search.html.

## Verification
- `npm run validate:data`: 0 errors, 36 pre-existing convention warnings.
- Adversarial review (gsd-code-reviewer): **SHIP** — 0 Critical/High/Medium. Aug 28 confirmed untouched.
- Local /browse UAT (localhost:3000): homepage card + highlights ✓, meetings list + calendar data ✓,
  PDF serves Rev1 (870,143 B) ✓, console errors 0 (GA/CSP blocks pre-existing). Screenshots in scratchpad.
- Search: July 31 doc embedded in index (verified statically); live search UI verification deferred to
  production (headless harness can't run page-scoped JS + unpkg lunr).

## Pending
- DEPLOY GATE: awaiting explicit user approval to merge `content/philatex-q3-rev1-july31` → main
  (CI runs `npm run build` and deploys to GitHub Pages). Then live cache-busted UAT (incl. search).

## Aug 28
Deliberately unchanged — remains "Stamp Program: TBD or Bourse" per the revised issue.
