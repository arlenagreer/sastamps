---
created: 2026-10-02T04:00:00.000Z
title: Open follow-ups from the 2026-10-01 site work
area: general
---

## Problem

Everything known to be wrong or unfinished after PRs #164-#171, in one place, most visitor-visible first. Items marked DECISION need the owner.

## Visitor-facing

1. DECISION: Meetings page "RSVP" (13 buttons) says "RSVP Confirmed" but only saves to the visitor's browser; the club is never told. Remove, or make it send (e.g. via the contact relay).
2. DECISION: "Set Reminder" (13 buttons) is browser-only (in-page notification if the visitor returns). Remove, or replace with a calendar-file download.
3. Glossary has only 5 terms (data/glossary/glossary.json) although it is presented as a terminology database.
4. Glossary search clear button may be covered by the suggestions dropdown (seen in headless Chrome; confirm in the UAT).
5. Contact form posts through FormSubmit with arlenagreer@gmail.com visible in the page source (spam exposure); no alias was offered on activation. DECISION: proper server-side handler / club inbox (owner reminder 2026-10-08).

## Data

6. 2025-Q2 (14) and 2025-Q3 (36) calendar files fail check-ics (older layout; past events).
7. meetings.json Dec 5 and Dec 12, 2025: descriptions don't match titles (past events).
8. Bourse no-fee policy awaiting the officer's confirmation (separate todo).

## Code and quality

9. Dormant code: home.js sections (countdown, quick stats, newsletter preview) have no containers on index.html (~80 KB calendar code in home.min.js); search.js #search-interface path treats results as an array; search-engine filters drop years/dateRange; home findNextMeeting day-of comparison; parseLocalDate accepts impossible dates; newsletter normaliser sorts empty dates unpredictably.
10. Unreachable [data-theme=dark] CSS (light-only site): remove.
11. Event JSON-LD for the next meeting, generated from meetings.json at build.
12. Make test:a11y blocking and enable color-contrast in .pa11yrc.json (0 true violations as of #170).
13. Audit the inline <script> blocks inside HTML pages for XSS (search.html result rendering).
14. Calendar picnic colour #f39c12 on #fef9e7 (~2.08:1) if shown as text.
15. check-site-build same-site regex edge cases (percent-encoded userinfo, ports) and a pinned-hash check for the Font Awesome SRI across 11 pages.
16. Store a Lighthouse baseline and track it.

## Solution

Work the visitor-facing items first; the two DECISION items are for the owner.
