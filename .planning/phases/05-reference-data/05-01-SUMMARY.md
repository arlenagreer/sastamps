---
phase: 05-reference-data
plan: 01
subsystem: data
tags: [json, schema, catalogue]

requires:
  - phase: 04-pdf-downloads
    provides: 98 PDFs in public/newsletter_archive/
provides:
  - archived-newsletters.json with 99 entries mapping all archived PDFs
  - archived-newsletter.schema.json for validation
affects: []

tech-stack:
  added: []
  patterns: [json-catalogue, schema-validation]

key-files:
  created:
    - data/newsletters/archived-newsletters.json
    - data/schemas/archived-newsletter.schema.json
  modified: []

key-decisions:
  - "Lean schema with only programmatically-derivable fields (id, title, year, edition, editionLabel, filePath, status)"
  - "2012 Jul/Aug included as unavailable entry with null filePath"

patterns-established:
  - "Archived data catalogue pattern with separate schema validation"

requirements-completed: [REF-01, REF-02]

duration: 2min
completed: 2026-03-09
---

## Summary

Created the archived newsletters JSON catalogue and validation schema for the SAPA website newsletter archive (2008-2024).

### Files Created

1. **data/schemas/archived-newsletter.schema.json** - JSON Schema Draft-07 validation for the archived newsletter data structure. Validates entry fields (id, title, year, edition, editionLabel, filePath, status), metadata object, and top-level wrapper.

2. **data/newsletters/archived-newsletters.json** - Complete catalogue of 99 newsletter entries (98 available + 1 unavailable) sorted chronologically from 2008-02 through 2024-Q4.

### Key Details

- 99 total entries across 17 years (2008-2024)
- 98 entries with `status: "available"` and valid filePaths to PDFs in `public/newsletter_archive/`
- 1 entry (`2012-04` Jul/Aug) with `status: "unavailable"` and `filePath: null`
- 2008 starts at edition 02 (no Jan/Feb issue)
- 2020 includes 7 entries: 6 bimonthly + special Covid-19 edition
- 2024 uses quarterly format: Q2, Q3, Q4
- All 98 file paths verified against actual PDFs on disk

### Verification Results

- Valid JSON: both files parse without errors
- Entry count: 99
- Chronological sort: 2008-02 (first) through 2024-Q4 (last)
- 2012-04 status: unavailable, filePath: null
- Missing files on disk: 0
- Metadata: totalIssues=99, availableIssues=98, yearRange 2008-2024
