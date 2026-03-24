# Roadmap: SAPA Website

## Milestones

- ✅ **v1.0 Fix Site Issues** — Phases 1-3 (shipped 2026-02-16)
- ✅ **v1.1 Restore Newsletter Archive** — Phases 4-6 (shipped 2026-03-09)
- ✅ **v1.2 Philatex Q2 2026 Content Update** — Phases 7-9 (shipped 2026-03-23)
- ✅ **v1.3 Philatex Update Agent** — Phases 10-12 (shipped 2026-03-24)

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

### ✅ v1.3 Philatex Update Agent (Shipped 2026-03-24)

**Milestone Goal:** Codify the v1.2 quarterly update workflow into a reusable `/philatex-update` skill that Claude can invoke to read a newsletter PDF, extract content, update all affected site files, and pause for human review before committing.

- [x] **Phase 10: Skill Scaffold** - Create the `/philatex-update` entry point with permitted-file scope and idempotency check (completed 2026-03-24)
- [x] **Phase 11: Extraction and Update Workflow** - Encode PDF reading, content extraction, schema validation, and all site file updates (completed 2026-03-24)
- [x] **Phase 12: Human Checkpoint Design** - Structure the review pause so it leads with key facts and surfaces [UNVERIFIED] items before committing (completed 2026-03-24)

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
| 10. Skill Scaffold | v1.3 | 1/1 | Complete   | 2026-03-24 |
| 11. Extraction and Update Workflow | v1.3 | 2/2 | Complete | 2026-03-24 |
| 12. Human Checkpoint Design | v1.3 | 1/1 | Complete | 2026-03-24 |
