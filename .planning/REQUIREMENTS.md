# Requirements: SAPA Website

**Defined:** 2026-03-09
**Core Value:** Primary digital presence for SAPA — meeting schedules, newsletters, membership info, educational resources

## v1.1 Requirements

Requirements for milestone v1.1: Restore Newsletter Archive. Each maps to roadmap phases.

### PDF Downloads

- [ ] **DL-01**: Download all available Dropbox-hosted PDFs (2008-2019) to `public/newsletter_archive/`
- [ ] **DL-02**: Download all available Google Drive-hosted PDFs (2019-2025 Q2) to `public/newsletter_archive/`
- [ ] **DL-03**: Use year-edition naming format (e.g., `2008-02-mar-apr.pdf`, `2020-special-covid.pdf`)
- [ ] **DL-04**: Skip unavailable 2012 Jul/Aug issue gracefully
- [ ] **DL-05**: Skip 2025 Q1/Q2 newsletters already present on the site in `public/`

### Reference Data

- [ ] **REF-01**: Create `data/newsletters/archived-newsletters.json` mapping each PDF to its local path, year, and edition
- [ ] **REF-02**: Follow conventions from existing `data/newsletters/newsletters.json`

### Archive Page

- [ ] **PAGE-01**: Add year-grouped sections (2008-2024) to `archive.html` with simple download links
- [ ] **PAGE-02**: Keep existing 2025-2026 rich card sections unchanged
- [ ] **PAGE-03**: Mark 2012 Jul/Aug as "Not Available" in the archive listing
- [ ] **PAGE-04**: Maintain consistent site design (fonts, colors, layout patterns)

## Future Requirements

### Archive Enhancements

- **ARCH-01**: Add search/filter functionality to archived newsletters
- **ARCH-02**: Add rich metadata (page counts, file sizes, descriptions) to archived issues
- **ARCH-03**: Generate thumbnail previews for archived PDFs

## Out of Scope

| Feature | Reason |
|---------|--------|
| Re-hosting 2025 Q3+ newsletters | Already stored locally in `public/` |
| Full metadata for archived issues | Would require manual review of each PDF; defer to future |
| Newsletter content indexing | Search integration for PDF content is a separate feature |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DL-01 | — | Pending |
| DL-02 | — | Pending |
| DL-03 | — | Pending |
| DL-04 | — | Pending |
| DL-05 | — | Pending |
| REF-01 | — | Pending |
| REF-02 | — | Pending |
| PAGE-01 | — | Pending |
| PAGE-02 | — | Pending |
| PAGE-03 | — | Pending |
| PAGE-04 | — | Pending |

**Coverage:**
- v1.1 requirements: 11 total
- Mapped to phases: 0
- Unmapped: 11 ⚠️

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after initial definition*
