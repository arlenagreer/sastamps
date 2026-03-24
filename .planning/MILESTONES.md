# Milestones

## v1.3 Philatex Update Agent (Shipped: 2026-03-24)

**Phases:** 3 | **Plans:** 4 | **Commits:** 13 | **Artifacts:** 3
**Git range:** `4a6d8cc`..`d6d2468`

**Key accomplishments:**
1. Created `/philatex-update` skill (273-line SKILL.md) as reusable entry point for quarterly newsletter updates
2. Created philatex-newsletter-agent (393-line agent definition) with 9-step PDF extraction and site update workflow
3. Extended newsletter schema with Calendar and Humor categories for `featuredArticles.category` enum
4. Implemented deny-by-default permitted-file scope boundary (10 file patterns)
5. Added duplicate edition check against newsletters.json before processing
6. Designed 10-item key-facts human checkpoint with red-flags-first ordering and approve/reject/fix-and-retry flow
7. Implemented [UNVERIFIED] marking strategy for ambiguous extractions with schema validation gates

**Archive:** `milestones/v1.3-MILESTONE-AUDIT.md`

---

## v1.2 Philatex Q2 2026 Content Update (Shipped: 2026-03-23)

**Phases:** 3 | **Plans:** N/A (single commit) | **Commits:** 1 | **Files changed:** 31
**Git range:** `88fc137`

**Key accomplishments:**
1. Published Q2 2026 newsletter PDF and updated metadata catalogue
2. Added 13 April-June 2026 meeting entries with ICS calendar files
3. Updated homepage with upcoming meetings, latest issue, and highlights
4. Updated newsletter page current issue and 2026 archive sections
5. Updated BOG roster (Steve Mabie as Treasurer, Arlen Greer as Webmaster)
6. Added announcements: new members, annual picnic, Joe Perez program, TSDA shows

**Archive:** `milestones/v1.2-ROADMAP.md`, `milestones/v1.2-REQUIREMENTS.md`

---

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

