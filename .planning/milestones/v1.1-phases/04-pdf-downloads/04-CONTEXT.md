# Phase 4: PDF Downloads - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Download all archived newsletter PDFs (2008-2024) from Dropbox and Google Drive into `public/newsletter_archive/` with consistent year-edition filenames. This phase handles file acquisition and naming only -- cataloguing (Phase 5) and display (Phase 6) are separate.

</domain>

<decisions>
## Implementation Decisions

### Source URL Manifest
- The authoritative source for all download URLs is the deleted file `js/newsletter_archive/archived_newsletter_links.html` (recoverable via `git show HEAD:js/newsletter_archive/archived_newsletter_links.html`)
- Dropbox links (2008 through 2019 Sep/Oct): Use `?dl=1` suffix instead of `?dl=0` for direct download
- Google Drive links (2019 Nov/Dec through 2025 Q2): Convert sharing URLs to direct download format (`https://drive.google.com/uc?export=download&id={FILE_ID}`)
- Total estimated PDFs: ~90 files across 17 years

### File Naming Convention
- **Bimonthly editions (2008-2023):** `{year}-{nn}-{mon1}-{mon2}.pdf`
  - `nn` = two-digit sequential edition number within the year (01-06)
  - `mon1`/`mon2` = three-letter lowercase month abbreviations
  - Examples: `2008-01-jan-feb.pdf`, `2008-02-mar-apr.pdf`, `2015-06-nov-dec.pdf`
- **Quarterly editions (2024):** `{year}-q{n}-{mon1}-{mon2}-{mon3}.pdf`
  - `n` = quarter number (2, 3, 4 for 2024 since Q1 does not exist in archive)
  - Examples: `2024-q2-apr-may-jun.pdf`, `2024-q3-jul-aug-sep.pdf`, `2024-q4-oct-nov-dec.pdf`
- **Special editions:** `{year}-special-{descriptor}.pdf`
  - Example: `2020-special-covid.pdf` (the 2020 Covid-19 special edition)
- All filenames lowercase, hyphens as separators, no spaces

### Known Gaps and Skips
- **2012 Jul/Aug (DL-04):** Confirmed missing in source HTML (marked "not available"). Skip gracefully -- no placeholder file.
- **2024 Q1:** Not present in source archive. Download only what exists (Q2, Q3, Q4).
- **2025 Q1 and Q2 (DL-05):** Present in source HTML but already on site in `public/`. Do NOT download into newsletter_archive.
- **2008:** Archive starts at edition 02 (Mar/Apr). No Jan/Feb issue exists for 2008.

### Download Approach
- Use a Node.js download script for reproducibility
- Script should be kept in `scripts/` directory for potential re-use
- Handle Dropbox URL conversion (`?dl=0` to `?dl=1`) and Google Drive URL extraction (file ID from sharing URL to direct download URL)
- Implement retry logic for failed downloads (network issues)
- Validate each downloaded file is a valid PDF (check magic bytes `%PDF`)
- Log results: successful downloads, skipped files, and failures

### Claude's Discretion
- Exact download script implementation (native Node.js fetch vs third-party library)
- Retry count and timeout values
- Whether to download sequentially or with limited concurrency
- Progress reporting format (console log, progress bar, etc.)
- Temporary file handling during downloads

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `js/newsletter_archive/archived_newsletter_links.html` (deleted but in git): Contains all source URLs organized by year with edition labels. This is the download manifest.
- `data/newsletters/newsletters.json`: Shows the JSON structure for newsletter metadata (id, title, quarter, year, publishDate, filePath, description, etc.). Phase 5 will follow this pattern.
- Existing `public/` PDFs (2025 Q2-Q4, 2026 Q1): Show current file storage pattern -- PDFs stored directly in `public/` with descriptive names.

### Established Patterns
- **npm scripts**: All tooling runs via `npm run` commands (build, test, optimize). Download script should follow this pattern with an `npm run download:newsletters` or similar script.
- **ESBuild + Node.js**: Project already uses Node.js scripts for build tooling (`esbuild.config.js`, image optimization). Download script fits naturally.
- **Data file conventions**: JSON data files live in `data/` subdirectories with corresponding schemas in `data/schemas/`.

### Integration Points
- `public/newsletter_archive/` directory: New directory to create. Will be referenced by Phase 5 JSON catalogue and Phase 6 archive page.
- `package.json`: Add download script command.
- `.gitignore`: May need to ensure PDFs are tracked (they are binary assets that should be committed for GitHub Pages deployment).

</code_context>

<specifics>
## Specific Ideas

- The source HTML file contains volume notation (e.g., `v113`, `v114`) in original Dropbox filenames. This volume info could be useful for Phase 5 metadata but is NOT needed in the filename for Phase 4.
- 2020 has 7 issues (6 regular bimonthly + 1 special Covid edition). The special edition should be numbered between Mar/Apr (02) and May/Jun (03), so the sequence is: 01, 02, special-covid, 03, 04, 05, 06.
- Google Drive links use two URL formats: `drive.google.com/open?id=` and `drive.google.com/file/d/{id}/view`. Both need the file ID extracted for direct download conversion.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 04-pdf-downloads*
*Context gathered: 2026-03-09*
