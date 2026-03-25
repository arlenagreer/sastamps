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
- ✓ `/philatex-update` skill as reusable entry point for quarterly newsletter updates — v1.3
- ✓ Custom agent definition (9-step workflow) for non-linear newsletter processing — v1.3
- ✓ Human checkpoint with 10-item key-facts review before committing changes — v1.3

### Active

<!-- Current scope: v1.4 Philatelic Design Refresh -->

- [ ] Custom "Philatelic" DaisyUI theme with nostalgic color palette (parchment, postal blue, stamp red, antique gold)
- [ ] Typography update: Open Sans → Lora body, add Playfair Display hero + Courier Prime postmark elements
- [ ] Stamp-themed CSS animation library (perforation, peel, postmark, envelope, globe, card flip, floating stamps, magnifying glass)
- [ ] Tier 1 component swaps: buttons, cards, navigation/header, modal dialogs, form system
- [ ] Tier 2 component swaps: accordion, timeline, pagination, breadcrumbs, search UI
- [ ] Public domain stock image integration (PICRYL, National Postal Museum, Library of Congress)
- [ ] Hero section redesign with stamp-themed animations

### Out of Scope

- Backend/server-side rendering — static site architecture is intentional
- User accounts or authentication — not needed for a club informational site
- CMS integration — content managed via JSON data files and HTML
- PWA offline functionality — sw.js/manifest scope limited to removing 404 errors
- Automated newsletter ingestion pipeline — manual update process sufficient for quarterly cadence
- Member directory or member count display — privacy considerations

## Current Milestone: v1.4 Philatelic Design Refresh

**Goal:** Modernize the website's frontend with Tailwind CSS + DaisyUI, a custom nostalgic "Philatelic" theme, stamp-themed animations, updated typography, and public domain stock images — evoking childhood wonder about stamp collecting.

**Target features:**
- Custom "Philatelic" DaisyUI v5 theme (warm parchment backgrounds, deep postal blue, rich stamp red, antique gold accents)
- Swap 15 UI components (buttons, cards, nav, modals, forms, accordion, timeline, pagination, breadcrumbs, search) with DaisyUI equivalents
- 8 stamp-themed CSS animations (perforation borders, stamp peel, postmark stamping, envelope opening, globe spinning, card flip, floating stamps, magnifying glass)
- Typography: keep Merriweather headings, replace Open Sans with Lora, add Playfair Display + Courier Prime
- Public domain stock images from PICRYL, National Postal Museum, Library of Congress
- Hero section redesign with animations
- Light mode only, gradual CSS migration

## Context

Shipped v1.3 on 2026-03-24. Philatex Update Agent complete with skill + agent definition.
- v1.4 goal: visual design refresh using DaisyUI component library with nostalgic stamp-collecting theme
- Foundation already installed: Tailwind CSS v4 + DaisyUI v5.5.19, build pipeline working (`npm run build:tw`)
- Design document at `docs/design/philatelic-theme-design.md` with complete theme CSS, animations, stock image sources
- 11 HTML pages with consistent design, assets, and footer
- Build system: ESBuild with tree-shaking, 7 page-specific bundles (~191KB total) + Tailwind CSS pipeline
- Tech stack: Vanilla JS ES6+, HTML5, CSS3/PostCSS, Tailwind CSS v4, DaisyUI v5, Lunr.js search, vanilla-calendar-pro
- Deployed on GitHub Pages
- Newsletter archive: 100 PDFs, JSON catalogue with 100 entries
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
| Single-commit content update for v1.2 | All Q2 2026 changes interdependent, phased execution unnecessary | ✓ Good — clean delivery, all 17 requirements met |
| Quarter look-ahead logic for homepage | Show next quarter meetings within 14 days of quarter start | ✓ Good — smoother transition between quarters |
| Tailwind CSS v4 + DaisyUI v5 for design refresh | Modern component library compatible with vanilla JS via CSS classes | — Pending |
| Gradual CSS migration (coexistence) | Old CSS + Tailwind side-by-side during component swap, remove old as replaced | — Pending |
| Light mode only for v1.4 | Simplifies scope; dark mode not needed for community club site | — Pending |
| Lora as body font replacement | Calligraphic warmth of transitional serif reads like stamp catalog; better than neutral Open Sans | — Pending |
| DaisyUI over other libraries | Pure CSS (no JS dependency), Tailwind plugin, semantic classes, 50+ components, works with vanilla JS | — Pending |

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
*Last updated: 2026-03-25 after v1.4 milestone start*
