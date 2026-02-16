# Roadmap: SAPA Website v1.0 Fix Site Issues

## Overview

This milestone resolves critical issues discovered during the February 2026 site inspection of sastamps.org. The roadmap addresses asset loading failures, missing build artifacts, and display inconsistencies across three focused phases. Each phase delivers immediately verifiable fixes to restore full functionality and polish to the production site.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Asset Loading** - Fix fonts, favicon, and service worker/manifest references
- [ ] **Phase 2: Build & Deployment** - Deploy missing JS bundles and fix sitemap link
- [ ] **Phase 3: Display & UX Fixes** - Fix button visibility, rebuild 404 page, fix search scores, standardize footer

## Phase Details

### Phase 1: Asset Loading
**Goal**: All external assets load correctly without console 404 errors
**Depends on**: Nothing (first phase)
**Requirements**: ASSET-01, ASSET-02, ASSET-03
**Success Criteria** (what must be TRUE):
  1. Google Fonts (Open Sans 400/600/700, Merriweather 400/700) load on all pages without 404 errors
  2. Favicon displays in browser tabs across all pages
  3. No service worker or manifest 404 errors appear in browser console
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Fix Google Fonts URLs and standardize favicon references
- [ ] 01-02-PLAN.md — Fix service worker and manifest references

### Phase 2: Build & Deployment
**Goal**: All page-specific bundles deployed and accessible, sitemap link functional
**Depends on**: Phase 1
**Requirements**: BILD-01, BILD-02
**Success Criteria** (what must be TRUE):
  1. About, Archive, Membership, and Glossary pages load their JavaScript bundles without 404 errors
  2. Sitemap link in Glossary footer either works (sitemap.xml exists) or is removed (no broken link)
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Deploy page-specific JS bundles for About, Archive, Membership, Glossary
- [x] 02-02-PLAN.md — Remove broken sitemap link from Glossary footer

### Phase 3: Display & UX Fixes
**Goal**: All pages display correctly with consistent layout and functional UI elements
**Depends on**: Phase 2
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04
**Success Criteria** (what must be TRUE):
  1. Membership page "Download Membership Application" button is visible and clickable on dark blue background
  2. 404 error page displays correct information (founded 1896, loz33@hotmail.com, "Most Friday nights" schedule) with full navigation and current design
  3. Search result match percentages show normalized values (100% cap or appropriate labels) instead of raw scores
  4. Footer uses consistent 3-column structure and link set across all pages
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Fix membership button visibility and normalize search scores
- [ ] 03-02-PLAN.md — Rebuild 404 page with correct info and current design
- [ ] 03-03-PLAN.md — Standardize footer across all pages to match homepage

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Asset Loading | 0/2 | Not started | - |
| 2. Build & Deployment | 2/2 | Complete | 2026-02-16 |
| 3. Display & UX Fixes | 0/3 | Not started | - |
