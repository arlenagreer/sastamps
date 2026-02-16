# Phase 3: Display & UX Fixes - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix four visual/UX issues across the SAPA website: membership button visibility on dark background, 404 page with wrong content, search scores exceeding 100%, and inconsistent footer layout across pages. This phase delivers display corrections only -- no new features or capabilities.

</domain>

<decisions>
## Implementation Decisions

### Button visibility fix
- Use a white or light-colored button to ensure high contrast against the dark blue background on the membership page
- Hover effect: subtle shade change (slight darkening or opacity shift), not a dramatic color inversion
- Scope: only fix the membership page button -- do not audit other buttons site-wide
- Button styling should match existing button patterns used elsewhere on the site (consistent design language)

### 404 page rebuild
- Match the current site design: same header, footer, and navigation as all other pages
- Tone: straightforward and helpful ("Page not found. Here are some helpful links.") -- not playful or themed
- Include full site navigation (same nav bar as other pages)
- Link to relevant pages (contact page, meetings page) rather than displaying club contact info and meeting details inline on the 404 page
- Must include correct club information per success criteria: founded 1896, loz33@hotmail.com, "Most Friday nights" schedule -- but via links to the pages that contain this info

### Search score normalization
- Normalize scores to percentages capped at 100%
- Normalization method: highest score in the result set becomes 100%, all others proportional to it (relative normalization)
- No minimum score threshold -- show all results the search engine returns
- Display as simple text percentage next to each result (e.g., "85% match") -- no progress bars or visual indicators

### Footer standardization
- Use the homepage footer as the canonical template -- all other pages must match it
- Keep existing responsive behavior (do not redesign breakpoints or grid/flex layout)
- Remove extra links from pages that have links not present in the homepage footer (strict consistency)
- Exclude sitemap link from the standardized footer -- Phase 2 handles the sitemap issue separately

### Claude's Discretion
- Exact color values for the membership button (as long as contrast ratio meets accessibility standards)
- Specific wording of the 404 error message (as long as tone is straightforward and helpful)
- Internal implementation approach for score normalization (as long as top result = 100% and others are proportional)
- How to identify and reconcile footer differences across pages

</decisions>

<specifics>
## Specific Ideas

- The 404 page success criteria specifies exact information: founded 1896, loz33@hotmail.com, "Most Friday nights" schedule -- these must be accurate but can be delivered via links to the contact and meetings pages
- Search normalization should use relative scoring (best result = 100%) rather than absolute scoring, to always give meaningful percentages
- Footer consistency means the homepage footer is the single source of truth -- any page with deviations gets corrected to match

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 03-display-ux-fixes*
*Context gathered: 2026-02-16*
