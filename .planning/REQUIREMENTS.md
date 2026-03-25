# Requirements: SAPA Website — v1.4 Philatelic Design Refresh

**Defined:** 2026-03-25
**Core Value:** The website serves as the primary digital presence for SAPA, providing members and prospective members with meeting schedules, newsletters, membership information, and educational resources about philately.

## v1.4 Requirements

Requirements for the Philatelic Design Refresh milestone. Each maps to roadmap phases.

### Theme Foundation

- [ ] **THEME-01**: Site uses custom "Philatelic" DaisyUI theme with OKLCH color palette (parchment base, postal blue primary, stamp red secondary, antique gold accent)
- [ ] **THEME-02**: DaisyUI theme applies `--noise: 1` paper texture and `--depth: 1` tactile shadow effects
- [ ] **THEME-03**: Body text renders in Lora (replacing Open Sans) with fallback to Palatino Linotype
- [ ] **THEME-04**: Hero/display text renders in Playfair Display for special feature titles
- [ ] **THEME-05**: Postmark-style elements render in Courier Prime monospace
- [ ] **THEME-06**: Font loading uses preconnect and display=swap for performance (no FOIT)
- [ ] **THEME-07**: Tailwind CSS build pipeline produces optimized output via `npm run build:tw`

### Tier 1 Component Swaps

- [ ] **COMP-01**: All buttons across the site use DaisyUI `btn` variants matching existing visual hierarchy (primary, secondary, outline, sm, lg)
- [ ] **COMP-02**: All card components use DaisyUI `card` with stamp-themed hover effects (peel/lift)
- [ ] **COMP-03**: Site navigation/header uses DaisyUI `navbar` with responsive mobile menu
- [ ] **COMP-04**: Modal dialogs (meetings, resources) use DaisyUI `modal` with accessible focus management
- [ ] **COMP-05**: Contact form uses DaisyUI form components (input, textarea, select) with existing validation logic preserved

### Tier 2 Component Swaps

- [ ] **COMP-06**: Resource categories use DaisyUI `collapse`/`accordion` components
- [ ] **COMP-07**: Newsletter archive timeline uses DaisyUI `timeline` component with stamp-themed styling
- [ ] **COMP-08**: List pagination uses DaisyUI `pagination` component
- [ ] **COMP-09**: Breadcrumb navigation uses DaisyUI `breadcrumbs` component across all pages
- [ ] **COMP-10**: Search interface filter controls use DaisyUI `select` and `input` components

### Animations

- [ ] **ANIM-01**: Cards display stamp perforation border effect using CSS radial gradients
- [ ] **ANIM-02**: Cards lift with 3D stamp-peel effect on hover (perspective transform with shadow)
- [ ] **ANIM-03**: Postmark stamping animation plays on page load or scroll-trigger for decorative elements
- [ ] **ANIM-04**: Envelope opening animation reveals content on hover/click for featured sections
- [ ] **ANIM-05**: Spinning globe element visible on homepage for "explore the world" motif
- [ ] **ANIM-06**: Stamp cards flip to reveal details on hover (3D preserve-3d transform)
- [ ] **ANIM-07**: Floating/falling stamp shapes drift as subtle page background decoration
- [ ] **ANIM-08**: All animations respect `prefers-reduced-motion: reduce` media query

### Stock Images & Hero

- [ ] **IMG-01**: Public domain stamp images sourced and integrated (from PICRYL, National Postal Museum, or Library of Congress)
- [ ] **IMG-02**: Stock images optimized for web (WebP format, responsive sizes via existing Sharp pipeline)
- [ ] **IMG-03**: Homepage hero section redesigned with stamp-themed layout and animation
- [ ] **IMG-04**: Key pages (about, meetings, membership) feature relevant philatelic imagery

### Quality & Compatibility

- [ ] **QA-01**: Existing page functionality preserved (search, calendar, forms, archive downloads)
- [ ] **QA-02**: Old custom CSS removed incrementally as DaisyUI components replace them
- [ ] **QA-03**: Bundle sizes validated via `npm run analyze:bundle` — no regression beyond 20%
- [ ] **QA-04**: All pages render correctly at mobile, tablet, and desktop breakpoints

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Dark Mode

- **DARK-01**: Philatelic dark theme (leather-bound album aesthetic) with automatic toggle
- **DARK-02**: Dark mode respects `prefers-color-scheme` media query

### Advanced Interactions

- **ADV-01**: Magnifying glass hover effect tracks mouse position on stamp images
- **ADV-02**: Page transition animations between routes

## Out of Scope

| Feature | Reason |
|---------|--------|
| React/Vue/Svelte adoption | Must remain vanilla JS static site |
| DaisyUI Blueprint MCP (paid) | License cost unnecessary; Context7 docs sufficient |
| Dark mode | Simplifies scope; light-only appropriate for community club site |
| Shoelace/Web Awesome components | DaisyUI covers all needed components without Shadow DOM complexity |
| Full CSS rewrite (remove all old CSS at once) | Gradual migration safer; removes old CSS as components are swapped |
| Vanilla Calendar Pro replacement | Calendar library works well; only restyle the wrapper |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| THEME-01 | Phase 13 | Pending |
| THEME-02 | Phase 13 | Pending |
| THEME-03 | Phase 13 | Pending |
| THEME-04 | Phase 13 | Pending |
| THEME-05 | Phase 13 | Pending |
| THEME-06 | Phase 13 | Pending |
| THEME-07 | Phase 13 | Pending |
| COMP-01 | Phase 14 | Pending |
| COMP-02 | Phase 14 | Pending |
| COMP-03 | Phase 14 | Pending |
| COMP-04 | Phase 14 | Pending |
| COMP-05 | Phase 14 | Pending |
| ANIM-01 | Phase 14 | Pending |
| ANIM-02 | Phase 14 | Pending |
| COMP-06 | Phase 15 | Pending |
| COMP-07 | Phase 15 | Pending |
| COMP-08 | Phase 15 | Pending |
| COMP-09 | Phase 15 | Pending |
| COMP-10 | Phase 15 | Pending |
| IMG-01 | Phase 16 | Pending |
| IMG-02 | Phase 16 | Pending |
| IMG-03 | Phase 16 | Pending |
| IMG-04 | Phase 16 | Pending |
| ANIM-03 | Phase 16 | Pending |
| ANIM-04 | Phase 16 | Pending |
| ANIM-05 | Phase 16 | Pending |
| ANIM-06 | Phase 17 | Pending |
| ANIM-07 | Phase 17 | Pending |
| ANIM-08 | Phase 17 | Pending |
| QA-01 | Phase 17 | Pending |
| QA-02 | Phase 17 | Pending |
| QA-03 | Phase 17 | Pending |
| QA-04 | Phase 17 | Pending |

**Coverage:**
- v1.4 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 — traceability populated by roadmapper*
