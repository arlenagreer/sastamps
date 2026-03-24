# Requirements: SAPA Website — v1.3 Philatex Update Agent

**Defined:** 2026-03-24
**Core Value:** The website serves as the primary digital presence for SAPA, providing members and prospective members with meeting schedules, newsletters, membership information, and educational resources about philately.

## v1.3 Requirements

Requirements for the Philatex Update Agent skill and agent. Each maps to roadmap phases.

### Skill Infrastructure

- [x] **SKILL-01**: User can invoke `/philatex-update <pdf-path>` to start the update workflow
- [x] **SKILL-02**: Skill includes a reference checklist with JSON field names, HTML section IDs, and ICS file conventions
- [x] **SKILL-03**: Skill checks whether the newsletter edition already exists in the catalogue before processing

### Content Processing

- [ ] **CONT-01**: Agent reads the newsletter PDF and extracts structured content (meetings, announcements, officers, TSDA shows)
- [ ] **CONT-02**: Agent reviews/proofreads the newsletter and generates a feedback report (typos, layout, content issues)
- [ ] **CONT-03**: Agent validates all extracted data against existing JSON schemas before writing
- [ ] **CONT-04**: Agent marks ambiguous or low-confidence extractions as [UNVERIFIED] for human review

### Workflow & Safety

- [ ] **WORK-01**: Agent pauses for human review before committing any changes
- [ ] **WORK-02**: Agent runs `npm run build:js` after updating data files to rebuild ESBuild bundles
- [ ] **WORK-03**: Agent updates all affected files — meetings.json, newsletters.json, ICS calendar files, homepage, newsletter page, meetings page, and archive metadata

## Future Requirements

### Enhanced Automation

- **AUTO-01**: Agent automatically detects newsletter format changes and adapts extraction strategy
- **AUTO-02**: Agent generates a diff summary comparing old and new content for each updated file
- **AUTO-03**: Skimmable checkpoint format — key facts summary + red flags first, full diff secondary

### Safety Enhancements

- **SAFE-01**: Explicit permitted-file scope boundary (deny-by-default list of modifiable files)
- **SAFE-02**: Rollback capability if human rejects changes at checkpoint

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automated newsletter creation/editing | Agent reads and extracts from existing PDFs, does not create them |
| Email distribution of newsletters | Outside website scope — handled by club separately |
| Multi-format newsletter support | Only PDF newsletters are published |
| Global skill installation | Project-local only — only relevant to this repo |
| Automated deployment/push | Human controls git push after commit |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SKILL-01 | Phase 10 | Complete |
| SKILL-02 | Phase 10 | Complete |
| SKILL-03 | Phase 10 | Complete |
| CONT-01 | Phase 11 | Pending |
| CONT-02 | Phase 11 | Pending |
| CONT-03 | Phase 11 | Pending |
| CONT-04 | Phase 11 | Pending |
| WORK-02 | Phase 11 | Pending |
| WORK-03 | Phase 11 | Pending |
| WORK-01 | Phase 12 | Pending |

**Coverage:**
- v1.3 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after roadmap creation*
