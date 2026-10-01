---
quick_id: 20260717-july31-sam-rodgers-program
title: "Post Philatex Q3-2026 Rev1 PDF + add July 31 Sam Rodgers program to schedule"
date: 2026-07-17
branch: content/philatex-q3-rev1-july31
status: in-progress
---

# Quick Task: Philatex Q3 2026 Rev1 + July 31 Sam Rodgers program

## Source of truth
Jim Durham email thread "Updated Philatex, Program added for July 31, Auction Reminder"
(Gmail thread `[Gmail message id redacted]`, Jul 16 2026). Attachment `Third Quarter 2026Rev1.pdf`
(7 pp, 870,143 bytes) saved to scratchpad. Jim's follow-up confirmed the **only** revision
is the added July 31 program (Sam Rodgers, "Cataloging U.S. Stamps"); articles were merely
reordered, not edited.

## Facts locked by codebase convention
- Newsletter PDF served at `public/SAPA-PHILATEX-Third-Quarter-2026.pdf` (same filename kept → no HTML link edits).
- July 31 meeting ALREADY exists in `meetings.json` (id `2026-07-31`, l2984-3019) as an `[UNVERIFIED]`
  "TBD or Bourse" placeholder → this is an EDIT, not an add.
- Stamp-program convention (H. Wallace, meetings.json:620-624): `type:"regular"`,
  `presenter:{name}`, `title:"Stamp Program: <topic>"`, desc "<name> presents '<topic>' ... Guests welcome!".
- CI (`.github/workflows/ci.yml`) runs full `npm run build` (incl. esbuild) on push to `main`,
  rebuilding bundles from source and deploying `_site`. Local `npm run serve` uses committed `dist/`,
  so rebuild locally for accurate UAT. Use `node esbuild.config.js` (+ 2 search scripts), NOT full
  `npm run build` (mutates package.json/HTML/images).
- Aug 28 legitimately stays "Stamp Program: TBD or Bourse" — DO NOT touch.

## Tasks
1. **PDF**: overwrite `public/SAPA-PHILATEX-Third-Quarter-2026.pdf` with Rev1.
2. **newsletters.json**: `fileSize` "916 KB"→"850 KB"; add July 31 program to `highlights[]`,
   `featuredArticles[]`, and `description`. Keep July 4 refs (still in PDF).
3. **meetings.json** (2984-3019): `title`→"Stamp Program: Cataloging U.S. Stamps",
   add `presenter:{name:"Sam Rodgers"}`, `topic`→"Cataloging U.S. Stamps", real `description`,
   strip `[UNVERIFIED]` from specialNotes; `type` stays "regular".
4. **data/calendar/2026-07-31-meeting.ics**: SUMMARY + DESCRIPTION.
5. **public/sapa-q3-2026-meetings.ics** (July 31 VEVENT): SUMMARY + DESCRIPTION.
6. **index.html:3858-3864**: replace July 4 Stamp Unveiling card → July 31 Sam Rodgers card.
7. **index.html:3804**: replace stale July 4 highlight bullet → July 31 program bullet.
8. **Rebuild**: `node esbuild.config.js` && `node scripts/build-search-index.js` && `node scripts/build-search-embedded.js`.
9. **Verify**: `git status` (only intended files), `npm run validate:data` (ajv), adversarial review, local `/browse` UAT.

## Verify (must-haves)
- Newsletter "Read Latest Issue" opens the Rev1 PDF (July 31 program on the calendar page).
- Meetings page calendar + list show "Cataloging U.S. Stamps" / Sam Rodgers on Fri Jul 31.
- Homepage next-meeting logic + Club News card + highlights reflect July 31 (no stale July 4 card).
- Search returns "Cataloging U.S. Stamps".
- Aug 28 unchanged. No stale July-31 "TBD or Bourse" remains in source or rebuilt dist.

## Gate
Do NOT merge to `main` / deploy without explicit user approval (standing rule). Sequence:
local UAT → user approval → merge → CI deploy → live (cache-busted) UAT.
