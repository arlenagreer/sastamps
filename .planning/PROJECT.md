# SAPA Website (sastamps.org)

## What This Is

The San Antonio Philatelic Association website — a production static site for a stamp collecting club founded in 1896. Built with vanilla JavaScript ES6+, HTML5, CSS3 with PostCSS, and ESBuild for bundling. Deployed on GitHub Pages at sastamps.org.

## Core Value

The website serves as the primary digital presence for SAPA, providing members and prospective members with meeting schedules, newsletters, membership information, and educational resources about philately.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

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

### Active

<!-- Current scope: Milestone v1.0 — Fix Site Issues -->

See `.planning/REQUIREMENTS.md`

### Out of Scope

- Backend/server-side rendering — static site architecture is intentional
- User accounts or authentication — not needed for a club informational site
- CMS integration — content managed via JSON data files and HTML

## Current Milestone: v1.0 Fix Site Issues

**Goal:** Resolve all display, functionality, and consistency issues identified during the February 2026 site inspection.

**Target fixes:**
- Google Fonts loading failures (all pages)
- Invisible membership download button
- Outdated/incorrect 404 error page
- Missing service worker and manifest
- Search score display bug
- Missing favicon
- Page-specific JS bundle 404s
- Footer inconsistency across pages
- Broken sitemap link

## Context

- Site deployed on GitHub Pages
- Build system uses ESBuild with tree-shaking optimization
- Calendar integration via vanilla-calendar-pro
- Search index built with Lunr.js
- Dependency updates applied February 16, 2026 (5 Dependabot PRs merged)
- Site inspection performed February 16, 2026 via Playwright automation
- Full inspection report at `~/Desktop/sastamps-site-inspection-report.md`

## Constraints

- **Tech stack**: Vanilla JS, no frameworks — maintain existing architecture
- **Hosting**: GitHub Pages — static files only, no server-side processing
- **Build**: ESBuild + PostCSS pipeline must remain functional
- **Compatibility**: Changes must not break existing page functionality

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild 404 page from scratch | Current page uses outdated template with wrong information | — Pending |
| Address all 9 inspection issues | Complete fix preferred over partial to avoid lingering problems | — Pending |

---
*Last updated: 2026-02-16 after site inspection and milestone initialization*
