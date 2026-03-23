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
- ✓ Newsletter archive with PDF downloads — v1.0
- ✓ Download archived newsletter PDFs (2008-2024) from Dropbox/Google Drive — v1.1
- ✓ JSON catalogue mapping 99 newsletter entries to local paths — v1.1
- ✓ Year-grouped archive page with safe DOM rendering — v1.1
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

<!-- Current scope: v1.2 Philatex Q2 2026 Content Update -->

- [ ] Add Q2 2026 newsletter PDF and update newsletters.json metadata
- [ ] Update newsletter.html Current Issue and 2026 Archive sections
- [ ] Add 13 Q2 meeting entries (Apr-Jun 2026) to meetings.json
- [ ] Update meetings.html schedule section and download schedule button
- [ ] Generate ICS calendar files for Q2 2026 meetings
- [ ] Verify/update Board of Governors roster (Rick Cross as Secretary)
- [ ] Add TSDA stamp show schedule (including San Antonio May 8-9)
- [ ] Update homepage: Upcoming Meeting, Read Latest Issue link, Latest Issue Highlights
- [ ] Add announcements: new members, condolence, annual picnic, upcoming program
- [ ] Verify mailing address on contact page

### Out of Scope

- Backend/server-side rendering — static site architecture is intentional
- User accounts or authentication — not needed for a club informational site
- CMS integration — content managed via JSON data files and HTML
- PWA offline functionality — sw.js/manifest scope limited to removing 404 errors

## Context

Shipped v1.1 on 2026-03-09. Newsletter archive restored with 98 PDFs (2008-2024).
Starting v1.2 on 2026-03-23. Philatex Q2 2026 (Vol. 132, Issue #2) arrived — content update cycle.
- 11 HTML pages with consistent design, assets, and footer
- Build system: ESBuild with tree-shaking, 7 page-specific bundles (~191KB total)
- Tech stack: Vanilla JS ES6+, HTML5, CSS3/PostCSS, Lunr.js search, vanilla-calendar-pro
- Deployed on GitHub Pages
- Newsletter archive: 98 PDFs in `public/newsletter_archive/`, JSON catalogue with 99 entries
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
| Safe DOM rendering for archive | No innerHTML even with trusted JSON — XSS prevention | ✓ Good — createElement/textContent throughout |
| Compact list layout for archived years | Visual contrast with rich cards for recent issues | ✓ Good — dense scanning for 17 years of content |
| Lean JSON schema for catalogue | Only programmatically-derivable fields, not manual metadata | ✓ Good — 99 entries auto-generated |

## Current Milestone: v1.2 Philatex Q2 2026 Content Update

**Goal:** Update the website with all content from the Philatex Second Quarter 2026 newsletter (Vol. 132, Issue #2)

**Target features:**
- Newsletter PDF publication and metadata update
- Q2 2026 meeting schedule (April–June, 13 meetings)
- ICS calendar files for Q2 meetings
- Homepage content refresh (upcoming meetings, latest issue, highlights)
- Board of Governors verification
- TSDA stamp show schedule
- Announcements (new members, condolence, picnic, program)
- Contact/mailing address verification

---
*Last updated: 2026-03-23 after v1.2 milestone start*
