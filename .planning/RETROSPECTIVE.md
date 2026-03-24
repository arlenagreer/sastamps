# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Restore Newsletter Archive

**Shipped:** 2026-03-09
**Phases:** 3 | **Plans:** 4

### What Was Built
- Node.js download script with retry logic, PDF validation, and concurrency limiting
- 98 archived newsletter PDFs (2008-2024) downloaded from Dropbox and Google Drive
- JSON catalogue (99 entries) with validation schema for all archived PDFs
- Dynamic year-grouped archive sections on archive.html with safe DOM rendering

### What Worked
- Phase 5 (Reference Data) completed quickly with lean schema approach — only programmatically-derivable fields
- Phase 6 (Archive Page) executed exactly as planned with zero deviations
- Safe DOM rendering pattern (createElement/textContent) provided XSS safety with minimal complexity
- Compact list layout for archived years contrasts well with rich cards for recent issues

### What Was Inefficient
- Phase 4 and 5 documentation gaps required retroactive fixing before milestone audit could pass
- SUMMARY files initially lacked YAML frontmatter, causing audit to flag partial requirements
- Phase 5 directory was initially missing from .planning/phases/ — deliverables existed but no planning trail

### Patterns Established
- Fetch JSON + safe DOM render pattern for dynamic content from local data files
- Archived data catalogue pattern with separate JSON schema validation
- Year-edition PDF naming convention for newsletter archive

### Key Lessons
1. Complete YAML frontmatter in SUMMARY files during execution, not retroactively — prevents audit gaps
2. Create phase directories even for quick work — the planning trail matters for milestone completion
3. Lean data schemas (only auto-derivable fields) reduce maintenance burden without losing utility

### Cost Observations
- Sessions: 2 (planning + execution)
- Notable: Entire milestone completed in a single day including audit and gap remediation

---

## Milestone: v1.2 — Philatex Q2 2026 Content Update

**Shipped:** 2026-03-23
**Phases:** 3 | **Plans:** N/A (single commit)

### What Was Built
- Q2 2026 newsletter PDF published with updated metadata catalogue
- 13 April-June 2026 meeting entries with ICS calendar files
- Homepage refresh: upcoming meetings, latest issue, highlights with quarter look-ahead
- Newsletter and meetings page updates with Q2 2026 content
- BOG roster update, TSDA shows, announcements (new members, picnic, program)

### What Worked
- Single-commit approach for cohesive content update — all changes interdependent, no need for phased execution
- Requirements were well-defined from the newsletter source document, making implementation straightforward
- Commit message thoroughly documented all changes for future reference

### What Was Inefficient
- No phase SUMMARY.md files created — work done outside GSD workflow means no planning trail
- Milestone completion required manual verification of requirements instead of automated audit
- STATE.md showed 0% progress despite work being complete

### Patterns Established
- Quarterly content update pattern: newsletter PDF + meetings JSON + ICS files + page updates
- Quarter look-ahead logic for homepage (show next quarter within 14 days)

### Key Lessons
1. For small, cohesive content updates, single-commit execution is more efficient than phased GSD workflow
2. Even when skipping phases, update STATE.md to reflect actual progress
3. Content updates from a single source document (newsletter) can map cleanly to requirements

### Cost Observations
- Sessions: 1
- Notable: Entire milestone defined and executed in a single session

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 3 | 7 | Initial GSD setup, established phase/plan patterns |
| v1.1 | 3 | 4 | Added milestone audit step, caught documentation gaps |
| v1.2 | 3 | N/A | Single-commit content update, skipped phased execution |

### Top Lessons (Verified Across Milestones)

1. Complete documentation during execution rather than retroactively — saves rework at milestone close
2. Safe DOM patterns (no innerHTML) should be the default for any dynamic rendering
3. Small, cohesive content updates from a single source document can skip phased execution without losing quality
