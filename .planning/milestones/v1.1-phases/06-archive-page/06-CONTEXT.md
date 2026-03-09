# Phase 6: Archive Page - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Update archive.html to display year-grouped sections for all archived newsletters (2008-2024) with working download links. Keep the existing 2025-2026 rich card sections unchanged. Mark the missing 2012 Jul/Aug issue as "Not Available." Maintain consistent site design throughout.

</domain>

<decisions>
## Implementation Decisions

### Archived year layout style
- Use a compact list format for 2008-2024 sections, not rich cards — archived issues lack the metadata (descriptions, tags, page counts, file sizes) that the 2025-2026 cards display
- Each year gets an `.archive-year-section` with an `.archive-year-header` (reusing existing CSS pattern)
- Within each year, list issues as simple rows: edition label (e.g., "Jan/Feb 2008") with a PDF download link icon
- Visual distinction between "current" rich cards (2025-2026) and "archived" compact list (2008-2024) is intentional and expected — archives should feel dense and scannable

### Year ordering direction
- Newest first: 2024 at top of archived section, descending to 2008 at bottom
- Continues naturally from the existing 2026 > 2025 ordering already on the page
- Users looking for recent back issues find them faster; deep history is still accessible by scrolling

### "Not Available" treatment for 2012 Jul/Aug
- Show the 2012 Jul/Aug slot inline in its expected position within the 2012 year section
- Display with grayed-out/muted text styling and a "Not Available" label
- No download link — just the edition label and the unavailability note
- No tooltip or explanation needed — the label is self-evident
- Use a CSS class like `.archive-item-unavailable` with reduced opacity or muted color

### Claude's Discretion
- Whether to render archived sections as static HTML or dynamically from the JSON data created in Phase 5 — both approaches are viable; static HTML is simpler but verbose (~100+ entries), dynamic rendering from `archived-newsletters.json` is cleaner and more maintainable
- Exact spacing, typography, and icon choices for the compact list items
- Whether to add subtle visual separators between issues within a year
- Mobile responsive behavior for the compact list (likely single-column, which is natural for a list)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.archive-year-section` and `.archive-year-header` CSS classes: Already defined in archive.html inline styles with border-bottom styling and spacing — reuse directly for 2008-2024 year headers
- `.archive-grid` CSS class: Exists but designed for rich cards; archived years may use a simpler list container instead
- `archive.js` page bundle: Minimal currently (breadcrumb, mobile menu, service worker) — can be extended to render archived sections from JSON if dynamic approach is chosen
- Font Awesome icons: Already loaded on the page — use `fa-file-pdf` for download links (already used in 2025-2026 cards)
- `.btn .btn-primary` pattern: Exists for download buttons, but compact list may use simpler link styling

### Established Patterns
- Year sections use `<h2 class="archive-year-header">` followed by content — maintain this heading hierarchy
- Download links use `target="_blank"` and include PDF icon — continue this pattern for archived links
- CSS variables for colors (--primary, --medium, --light) and spacing (--space-*) — use these for consistent styling
- Card hover effects (translateY, shadow) — NOT needed for compact archive list items

### Integration Points
- `data/newsletters/archived-newsletters.json` (created by Phase 5): Primary data source for archived newsletter entries — each entry will have local path, year, and edition
- `archive.html` main content section: New year sections insert between the existing 2025 section and the "Looking for Older Issues?" section
- `archive.html` inline `<style>` block: Add new CSS for compact archive list items (`.archive-list`, `.archive-list-item`, `.archive-item-unavailable`)
- ESBuild config: If archive.js is extended, no config changes needed — it already has an entry point

</code_context>

<specifics>
## Specific Ideas

- The "Looking for Older Issues?" section at the bottom of the page should be updated or removed since the archive will now go back to 2008 — the messaging about "digitizing our complete archive dating back to 1954" may still be relevant for pre-2008 issues
- The "About Our Archive" info card at the top says newsletters are "published quarterly" — this is accurate for recent years but older issues were bimonthly (Jan/Feb, Mar/Apr, etc.) — consider updating the description to reflect this history
- Keep the hero section and page description unchanged — they already describe the archive accurately

</specifics>

<deferred>
## Deferred Ideas

- Search/filter functionality for archived newsletters (ARCH-01 in REQUIREMENTS.md — future enhancement)
- Rich metadata for archived issues like page counts and file sizes (ARCH-02 — would require manual PDF review)
- Thumbnail previews for archived PDFs (ARCH-03 — separate feature)
- Collapsible/expandable year sections using disclosure pattern (WAI-ARIA APG) — could improve UX for 17 years of content but adds complexity; consider for future enhancement

</deferred>

---

*Phase: 06-archive-page*
*Context gathered: 2026-03-09*
