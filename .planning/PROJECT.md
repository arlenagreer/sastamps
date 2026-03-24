# SAPA Website (sastamps.org)

## What This Is

The San Antonio Philatelic Association website — a production static site for a stamp collecting club founded in 1896. Built with vanilla JavaScript ES6+, HTML5, CSS3 with PostCSS, and ESBuild for bundling. Deployed on GitHub Pages at sastamps.org. All 11 pages have consistent design, working assets, and page-specific JS bundles. Content current through Q2 2026 (Vol. 132, Issue #2).

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
- ✓ Q2 2026 newsletter PDF published and metadata updated — v1.2
- ✓ 13 Q2 meeting entries (Apr-Jun 2026) with ICS calendar files — v1.2
- ✓ Newsletter, meetings, and homepage updated with Q2 2026 content — v1.2
- ✓ BOG roster updated (Steve Mabie Treasurer, Arlen Greer Webmaster) — v1.2
- ✓ TSDA stamp show schedule added to meetings page — v1.2
- ✓ Announcements: new members, picnic, program highlights — v1.2
- ✓ Mailing address verified on contact page — v1.2

### Active

<!-- Current scope: v1.3 Philatex Update Agent -->

- [ ] `/philatex-update` skill as entry point (accepts PDF path)
- [ ] Custom agent definition for non-linear newsletter processing
- [ ] PDF reading with newsletter review/proofreading and layout feedback
- [ ] Automated content extraction and site updates (data files, HTML pages, metadata)
- [ ] Human checkpoint before committing changes

### Out of Scope

- Backend/server-side rendering — static site architecture is intentional
- User accounts or authentication — not needed for a club informational site
- CMS integration — content managed via JSON data files and HTML
- PWA offline functionality — sw.js/manifest scope limited to removing 404 errors
- Automated newsletter ingestion pipeline — manual update process sufficient for quarterly cadence
- Member directory or member count display — privacy considerations

## Context

Shipped v1.2 on 2026-03-23. Q2 2026 content update complete with newsletter, meetings, and announcements.
- v1.3 goal: codify the v1.2 update workflow into a reusable agent + skill for future editions
- 11 HTML pages with consistent design, assets, and footer
- Build system: ESBuild with tree-shaking, 7 page-specific bundles (~191KB total)
- Tech stack: Vanilla JS ES6+, HTML5, CSS3/PostCSS, Lunr.js search, vanilla-calendar-pro
- Deployed on GitHub Pages
- Newsletter archive: 99 PDFs in `public/newsletter_archive/` + Q2 2026, JSON catalogue with 100 entries
- Known tech debt: 3 orphaned JS modules (data-loader, template-engine, pagination) built but unused
- Quarter look-ahead logic added for homepage (shows next quarter within 14 days)

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
| Single-commit content update for v1.2 | All Q2 2026 changes interdependent, phased execution unnecessary | ✓ Good — clean delivery, all 17 requirements met |
| Quarter look-ahead logic for homepage | Show next quarter meetings within 14 days of quarter start | ✓ Good — smoother transition between quarters |

---
## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-24 after v1.3 milestone start*
