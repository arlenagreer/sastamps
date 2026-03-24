# Phase 10: Skill Scaffold - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the `/philatex-update` skill entry point at `.claude/skills/philatex-update/SKILL.md`. The skill accepts a PDF path, validates the file, reads the PDF to identify the newsletter edition, checks for duplicates against `newsletters.json`, and defines the explicit permitted-file scope boundary. If the edition is new, the skill hands off to the Phase 11 agent for extraction and updates. No content extraction, no file updates, and no schema validation happen in this phase — only the scaffold, the duplicate gate, and the reference checklist.

</domain>

<decisions>
## Implementation Decisions

### Permitted-file list scope
- **D-01:** Use a comprehensive permitted-file list matching the full v1.2 update scope. The agent needs to handle the complete quarterly update without manual intervention for routine files.
- **D-02:** The permitted list includes:
  - `data/newsletters/newsletters.json` — newsletter catalogue
  - `data/meetings/meetings.json` — meeting schedule
  - `data/calendar/*.ics` — individual meeting ICS files (new files only)
  - `public/*.ics` — quarterly schedule ICS download file (new files only)
  - `public/*.pdf` — new newsletter PDF (additions only, no deletions)
  - `index.html` — homepage (upcoming meetings, latest issue highlights)
  - `newsletter.html` — newsletter page (current issue, archive section)
  - `meetings.html` — meetings page (schedule display, calendar download link)
  - `about.html` — about page (Board of Governors roster)
  - `contact.html` — contact page (mailing address)
- **D-03:** Any file NOT on this list requires human confirmation before modification. The agent must report out-of-scope changes it thinks are needed in the checkpoint summary rather than making them.

### Duplicate detection mechanism
- **D-04:** The skill reads the PDF to identify the edition (year + quarter) before checking for duplicates. It does NOT rely on the filename or ask the user for the edition — the newsletter always identifies itself on page 1 ("THE PHILATEX — Second Quarter 2026").
- **D-05:** After extracting the edition identity, the skill constructs the expected ID (e.g., "2026-Q2") and checks the `id` field of every entry in `data/newsletters/newsletters.json`. If a match exists, the skill reports the duplicate and stops without modifying any files.
- **D-06:** Reading a 5-page newsletter PDF is trivial for Claude (under 2 seconds). No optimization needed for the pre-check read.

### Reference checklist format
- **D-07:** The reference checklist is inline in SKILL.md — a concise quick-reference card, not an exhaustive runbook. It lists key JSON fields, HTML section IDs, and naming conventions.
- **D-08:** For full JSON field validation, the checklist delegates to the existing schemas: `data/schemas/newsletter.schema.json` and `data/schemas/meeting.schema.json`. The checklist does NOT duplicate schema field definitions.
- **D-09:** The checklist must cover four categories:
  1. **JSON files** — key fields per file + pointer to validation schema
  2. **HTML pages** — specific section IDs that receive quarterly updates (e.g., `#meeting-schedule` on index.html, `#main-content` sections on newsletter.html and meetings.html)
  3. **ICS naming convention** — individual meetings: `YYYY-MM-DD-type.ics` in `data/calendar/`; quarterly bundle: `sapa-qN-YYYY-meetings.ics` in `public/`
  4. **PDF naming convention** — `SAPA-PHILATEX-Quarter-Year.pdf` in `public/`

### Skill-vs-agent boundary
- **D-10:** The skill is thin. Its responsibilities are strictly limited to:
  1. Parse PDF path from user arguments
  2. Validate the file exists and is a PDF
  3. Read the PDF to identify the edition (year + quarter)
  4. Check `newsletters.json` for duplicate edition ID
  5. If duplicate: report and stop
  6. If clear: hand off to the Phase 11 agent with PDF path and identified edition context
- **D-11:** No content extraction, no file updates, no schema validation, and no build commands happen in the skill. Those are all Phase 11 agent responsibilities.
- **D-12:** The skill resumes after the agent completes to handle the human checkpoint (Phase 12). The commit happens in the skill after checkpoint approval, not in the agent.

### SKILL.md format
- **D-13:** Use YAML frontmatter with `name`, `description` (including trigger phrases), and `allowed-tools`. Follow the standard Claude Code skill format confirmed by official documentation.
- **D-14:** The skill body uses the simple standalone pattern (not GSD XML): numbered steps in plain Markdown. The complexity lives in the Phase 11 agent, not in this entry point.
- **D-15:** The `allowed-tools` field should include: Read, Write, Edit, Bash, Grep, Glob (the agent needs full file system access for the update workflow).

### Claude's Discretion
- Exact wording of the duplicate detection message
- Whether to include a brief "what this skill does" banner when invoked
- Formatting and ordering within the reference checklist tables
- Whether to validate that the PDF is actually a Philatex newsletter (vs any random PDF) or just trust the user

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Skill authoring patterns
- `.planning/research/FEATURES.md` — Skill metadata format, prompt body structure, skill-to-agent orchestration, checkpoint patterns, argument passing (Patterns 1-7)
- `.planning/research/ARCHITECTURE.md` — PDF reading tools, Read tool parameters and limits, extraction approach

### Safety and scope
- `.planning/research/PITFALLS.md` — Prompt scope creep prevention, PDF extraction hallucination risks, permitted-file list rationale
- `.planning/REQUIREMENTS.md` — SKILL-01, SKILL-02, SKILL-03 requirement definitions

### Data file schemas (for reference checklist)
- `data/schemas/newsletter.schema.json` — Newsletter entry field definitions and validation rules
- `data/schemas/meeting.schema.json` — Meeting entry field definitions and validation rules
- `data/schemas/archived-newsletter.schema.json` — Archived newsletter schema (not directly used but establishes conventions)

### Existing data files (for duplicate check and field reference)
- `data/newsletters/newsletters.json` — Current newsletter catalogue (duplicate check target)
- `data/meetings/meetings.json` — Current meeting schedule

### v1.2 update as reference implementation
- `Q2-2026-update-plan.md` — The manual update plan that this skill codifies. Lists every file touched, every field updated, and every naming convention used in the Q2 2026 update.

### ICS file conventions
- `data/calendar/2026-04-03-meeting.ics` — Example individual meeting ICS file (naming: `YYYY-MM-DD-type.ics`)
- `public/sapa-q2-2026-meetings.ics` — Example quarterly schedule ICS file (naming: `sapa-qN-YYYY-meetings.ics`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.claude/` directory exists with `agents/`, `commands/`, and `settings.json` — but no `skills/` directory yet. Phase 10 creates `.claude/skills/philatex-update/SKILL.md` as the first skill.
- `data/schemas/newsletter.schema.json` and `data/schemas/meeting.schema.json` — existing validation schemas that the reference checklist delegates to rather than duplicating.
- `Q2-2026-update-plan.md` — the complete manual checklist from v1.2 that serves as the source of truth for what the skill automates.

### Established Patterns
- Newsletter IDs follow `YYYY-QN` format (e.g., "2026-Q2") in `newsletters.json`
- ICS individual files: `YYYY-MM-DD-type.ics` where type is `meeting` or `picnic` in `data/calendar/`
- ICS quarterly bundles: `sapa-qN-YYYY-meetings.ics` in `public/`
- PDF naming: `SAPA-PHILATEX-Quarter-Year.pdf` in `public/` (e.g., `SAPA-PHILATEX-Second-Quarter-2026.pdf`)
- JSON data wrapper pattern: top-level object with named array key + `metadata` block (see `newsletters.json`, `archived-newsletters.json`)

### Integration Points
- `.claude/skills/philatex-update/SKILL.md` — new file, first skill in the project
- Phase 11 will add an agent definition (likely `.claude/agents/philatex-agent.md` or similar)
- Phase 12 will add checkpoint logic that resumes in the skill after agent completion
- The skill's permitted-file list and reference checklist directly inform the Phase 11 agent's instructions

</code_context>

<specifics>
## Specific Ideas

- The v1.2 update touched 31 files with +1769/-481 lines across a single commit. The skill needs to handle a similar scope each quarter.
- Newsletter page 1 always contains the masthead "THE PHILATEX" with the quarter and year — this is the reliable source for edition identification.
- The `featuredArticles.category` field has a schema enum gap — Q2 2026 used "Calendar" and "Humor" which are not in the schema. The skill's reference checklist should note this as a known issue for Phase 11 to handle.
- ICS files use `UID` format `YYYYMMDDTHHMMSSZ-sapa@sastamps.org` and `PRODID:-//San Antonio Philatelic Association//SAPA Meetings//EN`.
- The `.claude/settings.json` file already exists — no risk of overwriting project settings when creating the skills directory.

</specifics>

<deferred>
## Deferred Ideas

- Auto-detection of newsletter format changes (REQUIREMENTS.md AUTO-01) — future enhancement, not Phase 10
- Diff summary generation comparing old and new content (REQUIREMENTS.md AUTO-02) — Phase 12 checkpoint scope
- Rollback capability if human rejects changes (REQUIREMENTS.md SAFE-02) — Phase 12 scope

### Reviewed Todos (not folded)
- "Fix accessibility gaps" — matched on generic keywords (json, html), not relevant to skill scaffold
- "Audit XSS surface area" — matched on newsletter/html keywords, not relevant to skill scaffold
- "Update SEO and structured data" — matched on update/html/json keywords, not relevant to skill scaffold

</deferred>

---

*Phase: 10-skill-scaffold*
*Context gathered: 2026-03-24*
