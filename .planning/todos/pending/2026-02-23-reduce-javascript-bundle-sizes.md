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
