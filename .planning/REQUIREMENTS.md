# Requirements: SAPA Website Fix Site Issues

**Defined:** 2026-02-16
**Core Value:** Primary digital presence for SAPA — meeting schedules, newsletters, membership info, educational resources

## v1 Requirements

Requirements for milestone v1.0. Each maps to roadmap phases.

### Assets & Infrastructure

- [ ] **ASSET-01**: Google Fonts (Open Sans 400/600/700, Merriweather 400/700) load correctly on all pages without 404 errors
- [ ] **ASSET-02**: Favicon displays in browser tabs across all pages
- [ ] **ASSET-03**: Service worker and manifest references are either fixed (files deployed) or removed (references cleaned up) so no console 404 errors occur

### Content & Display

- [ ] **DISP-01**: Membership page "Download Membership Application" button is visible and clickable on the dark blue CTA background
- [ ] **DISP-02**: 404 error page is rebuilt to match current site design with correct founding year (1896), correct email (loz33@hotmail.com), correct meeting schedule ("Most Friday nights"), and full navigation
- [ ] **DISP-03**: Search result match percentages display normalized values (capped at 100% or labeled appropriately) instead of raw scores like "2025%"
- [ ] **DISP-04**: Footer layout is consistent across all pages using the same 3-column structure and link set

### Build & Deployment

- [ ] **BILD-01**: Page-specific JavaScript bundles for About, Archive, Membership, and Glossary pages are deployed and load without 404 errors
- [ ] **BILD-02**: Broken sitemap.xml link in Glossary footer is either fixed (sitemap created) or removed

## v2 Requirements

Deferred to future release.

- **STYLE-01**: Standardize newsletter PDF naming convention (spaces vs hyphens)

## Out of Scope

| Feature | Reason |
|---------|--------|
| PWA offline functionality | sw.js/manifest scope is limited to removing 404 errors, not building full PWA support |
| Redesigning any page layouts | Scope is fixing issues, not redesigning — preserve existing design |
| Adding new pages or features | This milestone is strictly bug fixes and consistency |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ASSET-01 | Phase 1 | Pending |
| ASSET-02 | Phase 1 | Pending |
| ASSET-03 | Phase 1 | Pending |
| BILD-01 | Phase 2 | Pending |
| BILD-02 | Phase 2 | Pending |
| DISP-01 | Phase 3 | Pending |
| DISP-02 | Phase 3 | Pending |
| DISP-03 | Phase 3 | Pending |
| DISP-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after roadmap creation*
