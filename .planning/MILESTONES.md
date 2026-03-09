# Milestones

## v1.1 Restore Newsletter Archive (Shipped: 2026-03-09)

**Phases:** 3 | **Plans:** 4 | **Commits:** 15 | **Files changed:** 13
**Git range:** `86bce9f`..`44bec2f`

**Key accomplishments:**
1. Built Node.js download script for archived newsletter PDFs with retry logic and PDF validation
2. Downloaded 98 archived newsletter PDFs (2008-2024) from Dropbox and Google Drive
3. Created JSON catalogue (99 entries) with validation schema mapping all archived PDFs
4. Added dynamic year-grouped archive sections to archive.html with safe DOM rendering
5. Maintained XSS-safe rendering (no innerHTML) and graceful handling of unavailable 2012 Jul/Aug issue

**Archive:** `milestones/v1.1-ROADMAP.md`, `milestones/v1.1-REQUIREMENTS.md`

---

## v1.0 Fix Site Issues (Shipped: 2026-02-16)

**Phases:** 3 | **Plans:** 7 | **Commits:** 24 | **Files changed:** 36
**Git range:** `854938c`..`5a026bf`

**Key accomplishments:**
1. Fixed Google Fonts URLs and standardized favicon references across all 11 pages
2. Fixed service worker and manifest references (eliminated console 404 errors)
3. Created page-specific JS bundles for archive and membership pages with ESBuild
4. Fixed membership CTA button visibility and normalized search scores to relative percentages
5. Rebuilt 404 page from scratch with correct club info and current site design
6. Standardized footer across all 11 pages to consistent 3-column layout

**Archive:** `milestones/v1.0-ROADMAP.md`, `milestones/v1.0-REQUIREMENTS.md`

---

