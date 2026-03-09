# Phase 5: Reference Data - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Create `data/newsletters/archived-newsletters.json` — a JSON catalogue mapping every archived PDF (2008-2024) to its local path, year, and edition. Follow conventions from existing `newsletters.json` while keeping entries lean (full metadata is out of scope per requirements). Create a corresponding JSON schema for validation.

</domain>

<decisions>
## Implementation Decisions

### Entry structure
- Use a lean schema with fields that can be populated programmatically: `id`, `title`, `year`, `edition`, `editionLabel`, `filePath`, `status`
- `title` auto-generated from year and edition (e.g., "SAPA PHILATEX March/April 2008")
- Do NOT include `description`, `featuredArticles`, `highlights`, `tags`, `pageCount`, or `fileSize` — these require manual PDF review and are explicitly out of scope (REQUIREMENTS.md: "Full metadata for archived issues — defer to future")
- Follow the existing `newsletters.json` wrapper pattern: top-level object with `"archivedNewsletters"` array and `"metadata"` object

### Edition identification
- 2008-2023 editions are bimonthly (6 per year): use numeric edition codes with month labels
  - `"edition": "01"`, `"editionLabel": "January/February"`
  - `"edition": "02"`, `"editionLabel": "March/April"`
  - `"edition": "03"`, `"editionLabel": "May/June"`
  - `"edition": "04"`, `"editionLabel": "July/August"`
  - `"edition": "05"`, `"editionLabel": "September/October"`
  - `"edition": "06"`, `"editionLabel": "November/December"`
- 2020 special edition: `"edition": "special-covid"`, `"editionLabel": "Special Covid-19 Edition"`
- 2024 switched to quarterly: `"edition": "Q2"`, `"editionLabel": "Second Quarter: April, May, June"` (matching labels from the source HTML)
- The `id` field combines year and edition: `"2008-02"`, `"2020-special-covid"`, `"2024-Q3"`
- This aligns with the DL-03 filename format (e.g., `2008-02-mar-apr.pdf`)

### Unavailable issue handling
- 2012 Jul/Aug: Include entry in JSON with `"status": "unavailable"` and `"filePath": null`
- All other entries: `"status": "available"` with valid `filePath`
- This satisfies success criteria: "The 2012 Jul/Aug entry is present in the JSON and marked as unavailable"

### Schema validation
- Create `data/schemas/archived-newsletter.schema.json` — separate from existing `newsletter.schema.json`
- The archived schema is leaner (fewer required fields, different edition format vs quarterly)
- Follows the project's established pattern: every data JSON file has a corresponding schema
- Schema should validate: id pattern, year range (2008-2024), edition values, filePath pattern (`^public/newsletter_archive/.*\.pdf$` or null for unavailable), status enum

### Top-level file structure
- Wrapper object follows `newsletters.json` convention:
  ```json
  {
    "archivedNewsletters": [...],
    "metadata": {
      "lastUpdated": "ISO date",
      "totalIssues": <count>,
      "availableIssues": <count excluding unavailable>,
      "yearRange": { "start": 2008, "end": 2024 },
      "version": "1.0"
    }
  }
  ```
- Array sorted chronologically (oldest first) to match the archive page display order (year-grouped, ascending)

### Claude's Discretion
- Exact JSON formatting and whitespace conventions
- Whether to include `publishDate` (could estimate from year/edition but may be imprecise — optional)
- Metadata field naming beyond what's specified above

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `data/newsletters/newsletters.json`: Template for wrapper structure (top-level array key + metadata block)
- `data/schemas/newsletter.schema.json`: Template for schema structure (Draft-07, property definitions, required array, additionalProperties: false)
- `js/modules/newsletter-loader.js`: Existing `NewsletterLoader` class with `getNewslettersByYear()` — archived data should be loadable by a similar or extended loader
- `js/newsletter_archive/archived_newsletter_links.html` (deleted but in git): Complete source of truth for all editions, years, and external URLs — use this to generate the JSON entries

### Established Patterns
- JSON data files live in `data/` subdirectories with corresponding schemas in `data/schemas/`
- Newsletter IDs use `YYYY-QN` format in current system; archived IDs will use `YYYY-NN` or `YYYY-special-*` format
- File paths in JSON are relative (e.g., `"public/SAPA-PHILATEX-..."`)
- Metadata blocks track `lastUpdated`, `totalIssues`, `version`

### Integration Points
- `data/newsletters/archived-newsletters.json` — new file consumed by Phase 6 (archive.html rendering)
- `data/schemas/archived-newsletter.schema.json` — new schema for test validation
- Phase 6 will read this JSON to render year-grouped download links on archive.html
- The `newsletter-loader.js` module may need extension to load archived data (Phase 6 decision)

</code_context>

<specifics>
## Specific Ideas

- The deleted `archived_newsletter_links.html` file in git history contains the complete list of all editions with their external URLs — this is the definitive source for generating entries
- 2024 changed from bimonthly to quarterly format — the JSON must handle both edition schemes cleanly
- 2020 has 7 entries (6 regular bimonthly + 1 special Covid-19 edition) — the special edition sits between Mar/Apr and May/Jun chronologically
- 2024 has no Q1 issue — only Q2, Q3, Q4 are listed in the source HTML
- 2025 Q1 and Q2 are in the source HTML but should NOT be in archived-newsletters.json (DL-05: already on site in `public/`)

</specifics>

<deferred>
## Deferred Ideas

- Rich metadata for archived issues (descriptions, featured articles, page counts, file sizes) — noted in REQUIREMENTS.md as future enhancement ARCH-02
- Search/filter functionality for archived newsletters — future enhancement ARCH-01
- Thumbnail preview generation — future enhancement ARCH-03

</deferred>

---

*Phase: 05-reference-data*
*Context gathered: 2026-03-09*
