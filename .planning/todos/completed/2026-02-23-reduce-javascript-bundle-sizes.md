---
created: 2026-02-23T14:10:27.865Z
title: Reduce JavaScript bundle sizes
area: performance
files:
  - esbuild.config.js
  - dist/js/meetings.min.js
  - dist/js/home.min.js
---

## Problem

Two page bundles are notably large: meetings.min.js (140KB, includes Vanilla Calendar Pro) and home.min.js (113KB). Shared libraries like Lunr search are potentially duplicated across bundles. No common chunk extraction is configured in esbuild.

## Solution

- Extract shared libraries (Lunr, calendar) into a common chunk loaded once
- Evaluate code-splitting for the calendar component (load only on scroll)
- Review bundle-analysis.json for duplication across bundles
- Consider lazy-loading Lunr search index on first search interaction
- Remove legacy script.min.js bundle if no longer needed

## Resolution (2026-10-01)

Done in #168: data JSON is fetched at runtime instead of being bundled (home.min.js 188 KB -> 104 KB, meetings.min.js 209 KB -> 135 KB). Code splitting needs pages to load bundles as type=module (they don't). Remaining, a product decision in open follow-ups: ~80 KB of calendar code in home.min.js serves home-page sections (countdown, quick stats, newsletter preview) that index.html never had.
