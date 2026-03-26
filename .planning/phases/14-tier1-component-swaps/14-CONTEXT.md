# Phase 14: Tier 1 Component Swaps -- Context

**Started:** 2026-03-25
**Plan:** docs/design/phase-14-tier1-component-swaps.md

## Task Progress

| Task | Description | Status |
|------|-------------|--------|
| 14.1 | Stamp animation utilities in tailwind.css | Pending |
| 14.2 | Navbar swap (DaisyUI navbar) | Pending |
| 14.3 | Button swap (DaisyUI btn) | Pending |
| 14.4 | Card swap with stamp treatment | Pending |
| 14.5 | Modal swap (DaisyUI dialog) | Pending |
| 14.6 | Contact form swap | Pending |
| 14.7 | Legacy CSS cleanup + build verification | Pending |

## Pages Inventory

All pages with `<header>`: index.html, about.html, contact.html, membership.html,
newsletter.html, archive.html, meetings.html, resources.html, search.html,
glossary.html, 404.html, offline.html, q4_update.html

## Key Decisions

- DaisyUI v5 navbar with CSS-only dropdown (no JS needed for mobile menu)
- Native `<dialog>` element for modals with `showModal()`/`close()`
- Stamp perforation via radial-gradient in `@layer components`
- Keep all element IDs unchanged for JS compatibility
