# SAPA Website (sastamps.org)

## What This Is

The San Antonio Philatelic Association website — a production static site for a stamp collecting club founded in 1896. Built with vanilla JavaScript ES6+, HTML5, CSS3 with PostCSS, and ESBuild for bundling. Deployed on GitHub Pages at sastamps.org. All 11 pages have consistent design, working assets, and page-specific JS bundles.

## Core Value

The website serves as the primary digital presence for SAPA, providing members and prospective members with meeting schedules, newsletters, membership information, and educational resources about philately.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Homepage with meeting schedule, newsletter preview, and club overview
- ✓ About page with club history, leadership, and mission
- ✓ Meetings page with calendar widget, schedule table, and Google Maps embed
- ✓ Newsletter page with current issue details and editor information
- ✓ Newsletter archive with PDF downloads
- ✓ Membership page with benefits, philosophy, and application download
- ✓ Resources page with educational materials, search/filter, and categories
- ✓ Glossary page with philatelic terms, search, and cross-references
- ✓ Contact page with form, location info, and directions
- ✓ Site-wide search powered by Lunr.js
- ✓ Tree-shaking build system with page-specific bundles via ESBuild
- ✓ Security headers and input sanitization
- ✓ Google Fonts load correctly on all pages — v1.0
- ✓ Favicon displays in browser tabs across all pages — v1.0
- ✓ Service worker and manifest references fixed (no console 404s) — v1.0
- ✓ Page-specific JS bundles for all pages (including archive, membership) — v1.0
- ✓ Broken sitemap link removed from glossary — v1.0
- ✓ Membership download button visible on dark background — v1.0
- ✓ 404 page rebuilt with correct info and current design — v1.0
- ✓ Search scores normalized to relative percentages — v1.0
- ✓ Footer consistent 3-column layout across all 11 pages — v1.0

### Active

- [ ] Download archived newsletter PDFs (2008-2024) from Dropbox/Google Drive to local repository
- [ ] Create `public/newsletter_archive/` directory with all archived PDFs
- [ ] Create reference JSON file mapping each PDF to its path, year, and edition index
- [ ] Update `archive.html` with year-grouped download links for all archived newsletters

### Out of Scope

- Backend/server-side rendering — static site architecture is intentional
- User accounts or authentication — not needed for a club informational site
- CMS integration — content managed via JSON data files and HTML
- PWA offline functionality — sw.js/manifest scope limited to removing 404 errors

## Context

Shipped v1.0 on 2026-02-16. All 9 issues from February 2026 site inspection resolved.
- 11 HTML pages with consistent design, assets, and footer
- Build system: ESBuild with tree-shaking, 7 page-specific bundles (~191KB total)
- Tech stack: Vanilla JS ES6+, HTML5, CSS3/PostCSS, Lunr.js search, vanilla-calendar-pro
- Deployed on GitHub Pages
- Known tech debt: 3 orphaned JS modules (data-loader, template-engine, pagination) built but unused

## Constraints

- **Tech stack**: Vanilla JS, no frameworks — maintain existing architecture
- **Hosting**: GitHub Pages — static files only, no server-side processing
- **Build**: ESBuild + PostCSS pipeline must remain functional
- **Compatibility**: Changes must not break existing page functionality

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild 404 page from scratch | Current page uses outdated template with wrong information | ✓ Good — correct info, consistent design |
| Address all 9 inspection issues | Complete fix preferred over partial to avoid lingering problems | ✓ Good — all resolved in single day |
| Follow about.js pattern for new entry points | Consistent architecture across all page bundles | ✓ Good — archive.js, membership.js match pattern |
| Remove sitemap link (not create sitemap.xml) | Simpler fix, sitemap not critical for static club site | ✓ Good — no broken link |
| Relative score normalization (top=100%) | More intuitive than absolute capping for users | ✓ Good — search results display clearly |
| Homepage footer as canonical template | Single source of truth for footer consistency | ✓ Good — all 11 pages match |

## Current Milestone: v1.1 Restore Newsletter Archive

**Goal:** Download ~90 archived newsletter PDFs (2008-2024) from external hosting and integrate them into the repository and archive page.

**Target features:**
- Download all archived PDFs to `public/newsletter_archive/`
- Create reference JSON mapping each PDF to path, year, edition
- Update `archive.html` with simple year-grouped download links
- Skip 2025+ issues already on the site

---
*Last updated: 2026-03-09 after v1.1 milestone started*
