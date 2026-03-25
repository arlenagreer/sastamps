# Roadmap: SAPA Website

## Milestones

- ✅ **v1.0 Fix Site Issues** — Phases 1-3 (shipped 2026-02-16)
- ✅ **v1.1 Restore Newsletter Archive** — Phases 4-6 (shipped 2026-03-09)
- ✅ **v1.2 Philatex Q2 2026 Content Update** — Phases 7-9 (shipped 2026-03-23)
- ✅ **v1.3 Philatex Update Agent** — Phases 10-12 (shipped 2026-03-24)
- 🔄 **v1.4 Philatelic Design Refresh** — Phases 13-17 (active)

## Phases

<details>
<summary>✅ v1.0 Fix Site Issues (Phases 1-3) — SHIPPED 2026-02-16</summary>

- [x] Phase 1: Asset Loading (2/2 plans) — completed 2026-02-16
- [x] Phase 2: Build & Deployment (2/2 plans) — completed 2026-02-16
- [x] Phase 3: Display & UX Fixes (3/3 plans) — completed 2026-02-16

</details>

<details>
<summary>✅ v1.1 Restore Newsletter Archive (Phases 4-6) — SHIPPED 2026-03-09</summary>

- [x] Phase 4: PDF Downloads (2/2 plans) — completed 2026-03-09
- [x] Phase 5: Reference Data (1/1 plan) — completed 2026-03-09
- [x] Phase 6: Archive Page (1/1 plan) — completed 2026-03-09

</details>

<details>
<summary>✅ v1.2 Philatex Q2 2026 Content Update (Phases 7-9) — SHIPPED 2026-03-23</summary>

- [x] Phase 7: Newsletter and Data — completed 2026-03-23
- [x] Phase 8: Page Updates — completed 2026-03-23
- [x] Phase 9: Verification and Announcements — completed 2026-03-23

</details>

<details>
<summary>✅ v1.3 Philatex Update Agent (Phases 10-12) — SHIPPED 2026-03-24</summary>

- [x] **Phase 10: Skill Scaffold** - Create the `/philatex-update` entry point with permitted-file scope and idempotency check (completed 2026-03-24)
- [x] **Phase 11: Extraction and Update Workflow** - Encode PDF reading, content extraction, schema validation, and all site file updates (completed 2026-03-24)
- [x] **Phase 12: Human Checkpoint Design** - Structure the review pause so it leads with key facts and surfaces [UNVERIFIED] items before committing (completed 2026-03-24)

</details>

### v1.4 Philatelic Design Refresh

**Milestone Goal:** Modernize the website's frontend with a custom nostalgic "Philatelic" DaisyUI v5 theme, stamp-themed animations, updated typography, and public domain stock images — evoking childhood wonder about stamp collecting.

- [ ] **Phase 13: Theme Foundation** - Custom Philatelic DaisyUI theme, typography stack, and build pipeline producing optimized Tailwind output
- [ ] **Phase 14: Tier 1 Component Swaps** - Buttons, cards, navigation, modals, and forms replaced with DaisyUI equivalents plus card perforation and peel animations
- [ ] **Phase 15: Tier 2 Component Swaps** - Accordion, timeline, pagination, breadcrumbs, and search UI replaced with DaisyUI equivalents
- [ ] **Phase 16: Stock Images and Hero** - Public domain philatelic images integrated and hero section redesigned with stamp-themed animations
- [ ] **Phase 17: Animation Polish and QA** - Stamp card flip, floating stamps, reduced motion support, bundle validation, and responsive verification

## Phase Details

### Phase 10: Skill Scaffold
**Goal**: Users can invoke `/philatex-update <pdf-path>` and the skill starts cleanly, checks for duplicate editions, and has explicit scope boundaries before any writes
**Depends on**: Nothing (first phase of v1.3)
**Requirements**: SKILL-01, SKILL-02, SKILL-03
**Success Criteria** (what must be TRUE):
  1. Running `/philatex-update path/to/newsletter.pdf` invokes the skill without error
  2. If the newsletter edition already exists in newsletters.json, the skill reports a duplicate and stops without modifying any files
  3. The skill file contains a reference checklist with exact JSON field names, HTML section IDs, and ICS file naming conventions
  4. The permitted-file list (files the agent may touch) is explicitly enumerated in the skill — any file outside the list requires human confirmation
**Plans**: 1 plan

Plans:
- [x] 10-01-PLAN.md — Create /philatex-update SKILL.md with duplicate check, reference checklist, and permitted-file scope

### Phase 11: Extraction and Update Workflow
**Goal**: After invocation, the agent reads the newsletter PDF, extracts all structured content, validates against JSON schemas, and updates every affected site file — including ICS calendar files and an ESBuild rebuild
**Depends on**: Phase 10
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, WORK-02, WORK-03
**Success Criteria** (what must be TRUE):
  1. Agent reads the PDF and produces extracted content covering meetings, announcements, officers, and TSDA shows
  2. Agent generates a proofreading/layout feedback report alongside the extraction
  3. All extracted data is validated against data/schemas/ before any file is written; schema violations are flagged, not silently accepted
  4. Ambiguous or low-confidence extractions are marked [UNVERIFIED] in staged output so the human can spot them at review time
  5. After updating meetings.json, the agent runs `npm run build:js` to rebuild ESBuild bundles; all of newsletters.json, meetings.json, ICS calendar files, homepage, newsletter page, and meetings page are updated
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — Extend newsletter schema and create philatex-newsletter-agent definition with full extraction/update workflow
- [x] 11-02-PLAN.md — Wire agent into SKILL.md with spawning instructions and post-agent verification

### Phase 12: Human Checkpoint Design
**Goal**: Before any commit, the agent surfaces a structured review summary — key facts first, full diff secondary — so the human can confidently approve or reject the staged changes
**Depends on**: Phase 11
**Requirements**: WORK-01
**Success Criteria** (what must be TRUE):
  1. Agent pauses and presents a checkpoint before running any git commit
  2. The checkpoint leads with a 10-item key-facts summary (dates, new entries, officer changes, [UNVERIFIED] count) before showing diffs
  3. Human can approve changes to proceed to commit, or reject to discard staged changes with no files modified
**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md — Add checkpoint presentation, approval/rejection handling, and commit steps to SKILL.md

### Phase 13: Theme Foundation
**Goal**: The site renders with the custom "Philatelic" DaisyUI theme — parchment backgrounds, postal blue primary, stamp red secondary, antique gold accents — with updated typography and an optimized Tailwind build
**Depends on**: Nothing (Tailwind v4 + DaisyUI v5 already installed)
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04, THEME-05, THEME-06, THEME-07
**Success Criteria** (what must be TRUE):
  1. Visiting any page shows warm parchment-colored backgrounds, postal blue links and primary actions, and antique gold accents — consistent with the Philatelic theme
  2. Body text renders in Lora (not Open Sans) with Palatino Linotype as fallback; no layout shift occurs on load (display=swap)
  3. Hero and display titles render in Playfair Display; postmark-style monospace elements render in Courier Prime
  4. Running `npm run build:tw` completes without error and produces an optimized CSS output file
  5. Paper texture and tactile shadow depth effects are visible on component surfaces (DaisyUI `--noise` and `--depth` tokens applied)
**Plans**: TBD
**UI hint**: yes

### Phase 14: Tier 1 Component Swaps
**Goal**: The highest-traffic UI elements — buttons, cards, navigation, modals, and the contact form — are replaced with DaisyUI equivalents carrying the Philatelic theme, including stamp perforation borders and peel-lift hover effects on cards
**Depends on**: Phase 13
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, ANIM-01, ANIM-02
**Success Criteria** (what must be TRUE):
  1. Every button across all 11 pages uses DaisyUI `btn` classes; visual hierarchy (primary, secondary, outline, sm, lg) is preserved
  2. Card components display a perforated stamp border effect (CSS radial gradient) and lift with a 3D peel shadow on hover
  3. The site header/navigation uses DaisyUI `navbar` and collapses correctly into a mobile menu on small screens
  4. Modal dialogs on the meetings and resources pages open, close, and trap focus using DaisyUI `modal`; existing JS logic remains intact
  5. The contact form uses DaisyUI input, textarea, and select components with the original validation behavior unchanged
**Plans**: TBD
**UI hint**: yes

### Phase 15: Tier 2 Component Swaps
**Goal**: Secondary UI patterns — resource accordion, newsletter timeline, list pagination, breadcrumbs, and search filter controls — are replaced with DaisyUI equivalents styled to the Philatelic theme
**Depends on**: Phase 14
**Requirements**: COMP-06, COMP-07, COMP-08, COMP-09, COMP-10
**Success Criteria** (what must be TRUE):
  1. Resource categories expand and collapse using DaisyUI `collapse`/`accordion`; existing filter logic continues to work
  2. The newsletter archive timeline renders as a DaisyUI `timeline` component with stamp-styled connectors and year markers
  3. List pagination controls (where applicable) use DaisyUI `pagination` component and navigate correctly
  4. Breadcrumb trails appear on all applicable pages using DaisyUI `breadcrumbs` markup
  5. Search filter selects and inputs use DaisyUI `select` and `input` components; search results update correctly
**Plans**: TBD
**UI hint**: yes

### Phase 16: Stock Images and Hero
**Goal**: Public domain philatelic images are sourced, optimized, and integrated into the site; the homepage hero section is redesigned with stamp-themed layout and postmark/envelope/globe animations
**Depends on**: Phase 13
**Requirements**: IMG-01, IMG-02, IMG-03, IMG-04, ANIM-03, ANIM-04, ANIM-05
**Success Criteria** (what must be TRUE):
  1. At least one public domain stamp image appears on each of: homepage, about, meetings, and membership pages — all sourced from PICRYL, National Postal Museum, or Library of Congress
  2. All stock images are in WebP format with responsive sizes generated via the existing Sharp pipeline; no original large rasters remain in production paths
  3. The homepage hero section displays a redesigned stamp-themed layout with at least one visible animation (postmark stamp, envelope open, or spinning globe)
  4. The postmark stamping animation triggers on page load or scroll for a decorative element visible without interaction
  5. The envelope opening animation reveals content on hover or click for a featured section; the spinning globe element is visible in the hero
**Plans**: TBD
**UI hint**: yes

### Phase 17: Animation Polish and QA
**Goal**: Remaining animations (stamp card flip, floating stamps) are implemented, all animations respect reduced motion preferences, old CSS is removed as replaced components are confirmed clean, and every page is verified at all breakpoints
**Depends on**: Phases 14, 15, 16
**Requirements**: ANIM-06, ANIM-07, ANIM-08, QA-01, QA-02, QA-03, QA-04
**Success Criteria** (what must be TRUE):
  1. Stamp cards flip to reveal details on hover using CSS 3D `preserve-3d` transform — visible and smooth on desktop
  2. Subtle floating/falling stamp shapes drift in the page background on at least the homepage
  3. All animations (perforation, peel, postmark, envelope, globe, card flip, floating stamps) are fully suppressed when `prefers-reduced-motion: reduce` is set — no movement at all
  4. Running `npm run analyze:bundle` shows no bundle size regression beyond 20% versus pre-v1.4 baseline
  5. All 11 pages render correctly (no layout breaks, no missing content, no broken interactions) at mobile (375px), tablet (768px), and desktop (1280px) viewport widths
  6. Existing site functionality — search, calendar widget, form submission, archive PDF downloads — works correctly after all component swaps
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Asset Loading | v1.0 | 2/2 | Complete | 2026-02-16 |
| 2. Build & Deployment | v1.0 | 2/2 | Complete | 2026-02-16 |
| 3. Display & UX Fixes | v1.0 | 3/3 | Complete | 2026-02-16 |
| 4. PDF Downloads | v1.1 | 2/2 | Complete | 2026-03-09 |
| 5. Reference Data | v1.1 | 1/1 | Complete | 2026-03-09 |
| 6. Archive Page | v1.1 | 1/1 | Complete | 2026-03-09 |
| 7. Newsletter and Data | v1.2 | 1/1 | Complete | 2026-03-23 |
| 8. Page Updates | v1.2 | 1/1 | Complete | 2026-03-23 |
| 9. Verification and Announcements | v1.2 | 1/1 | Complete | 2026-03-23 |
| 10. Skill Scaffold | v1.3 | 1/1 | Complete | 2026-03-24 |
| 11. Extraction and Update Workflow | v1.3 | 2/2 | Complete | 2026-03-24 |
| 12. Human Checkpoint Design | v1.3 | 1/1 | Complete | 2026-03-24 |
| 13. Theme Foundation | v1.4 | 0/? | Not started | - |
| 14. Tier 1 Component Swaps | v1.4 | 0/? | Not started | - |
| 15. Tier 2 Component Swaps | v1.4 | 0/? | Not started | - |
| 16. Stock Images and Hero | v1.4 | 0/? | Not started | - |
| 17. Animation Polish and QA | v1.4 | 0/? | Not started | - |
