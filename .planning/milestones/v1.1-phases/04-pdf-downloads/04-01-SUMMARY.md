---
phase: 04-pdf-downloads
plan: 01
subsystem: tooling
tags: [node-script, download, pdf-validation]

requires: []
provides:
  - Download script for archived newsletter PDFs
  - npm run download:newsletters command
affects: []

tech-stack:
  added: []
  patterns: [url-conversion, retry-logic, pdf-validation, concurrency-limiting]

key-files:
  created:
    - scripts/download-newsletters.mjs
  modified:
    - package.json

key-decisions:
  - "Used native Node.js fetch with concurrency limiting (3 concurrent downloads)"
  - "Dropbox dl=0 to dl=1 and Google Drive sharing URL to direct download conversion"

patterns-established:
  - "Download script pattern in scripts/ directory with npm script entry"

requirements-completed: [DL-01, DL-02, DL-03, DL-04, DL-05]

duration: 2min
completed: 2026-03-09
---

# Plan 04-01 Summary: Create Download Script

**Status:** Complete
**Date:** 2026-03-09

## What was done

Created `scripts/download-newsletters.mjs` -- a Node.js ES module script that:

1. Extracts the source HTML from git history (`git show HEAD:js/newsletter_archive/archived_newsletter_links.html`)
2. Parses all `<a href>` links organized by year context
3. Converts Dropbox URLs (`?dl=0` -> `?dl=1`) and Google Drive URLs (sharing -> `uc?export=download&id=`)
4. Applies the year-edition naming convention:
   - Bimonthly: `{year}-{nn}-{mon1}-{mon2}.pdf`
   - Quarterly: `{year}-q{n}-{mon1}-{mon2}-{mon3}.pdf`
   - Special: `{year}-special-covid.pdf`
5. Skips 2012 Jul/Aug (href="#") and all 2025 entries
6. Downloads with concurrency=3, retry logic (3 attempts, 2s delay)
7. Validates each file via `%PDF` magic bytes
8. Handles Google Drive virus scan redirects

Added `download:newsletters` npm script entry to `package.json`.

## Files modified

- `scripts/download-newsletters.mjs` (new) -- Download script
- `package.json` -- Added `download:newsletters` script

## Verification

- `node --check scripts/download-newsletters.mjs` passes
- Script contains Dropbox `?dl=1` and Google Drive `uc?export=download` URL conversion
- Script skips entries with `href="#"` and year 2025
- Script validates PDF magic bytes after download
- `npm run download:newsletters` resolves to the script
