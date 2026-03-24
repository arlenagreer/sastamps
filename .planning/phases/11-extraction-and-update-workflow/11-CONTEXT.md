# Phase 11: Extraction and Update Workflow - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Encode the PDF-to-site-update workflow into SKILL.md instructions. After invocation (Phase 10), the agent reads the newsletter PDF, extracts all structured content, validates against JSON schemas, generates a proofreading report, and updates every affected site file -- including meetings.json, newsletters.json, ICS calendar files, and HTML pages. Concludes with an ESBuild rebuild. The human checkpoint (Phase 12) happens after this phase's work is staged.

</domain>

<decisions>
## Implementation Decisions

### [UNVERIFIED] marking strategy
- **D-01:** Place `[UNVERIFIED]` markers inline in free-text JSON fields (`description`, `specialNotes`, `highlights`) alongside the agent's best-guess value. Example: `"description": "[UNVERIFIED] Stamp Program by Joe Perez — newsletter prose says April but calendar shows May 29"`.
- **D-02:** For schema-constrained fields (enums like `type`, `category`; date fields), use the best-guess valid value and log the uncertainty in a nearby free-text field (e.g., `specialNotes: ["[UNVERIFIED] Meeting type inferred as 'auction' — newsletter text was ambiguous"]`).
- **D-03:** The Phase 12 checkpoint aggregates all `[UNVERIFIED]` occurrences into a count and itemized list so the reviewer sees them before the full diff.
- **D-04:** All `[UNVERIFIED]` markers must be resolved (confirmed, corrected, or removed) before final commit. The agent performs a cleanup pass after human confirmation.

### Proofreading report scope and destination
- **D-05:** The proofreading report (CONT-02) covers the newsletter PDF itself: typos, grammatical errors, layout/formatting issues, and factual inconsistencies within the document (e.g., prose contradicting the calendar table).
- **D-06:** When the agent spots discrepancies between PDF content sections that affect extraction (like the Q2 2026 "April vs May 29" date conflict), those are noted in the report as well.
- **D-07:** Report saved to `.planning/reviews/YYYY-QN-newsletter-review.md` (e.g., `.planning/reviews/2026-Q3-newsletter-review.md`). Tracked in git, available to share with the newsletter editor. NOT in the main website source tree.

### Schema evolution policy
- **D-08:** As part of Phase 11 implementation, extend the `featuredArticles.category` enum in `data/schemas/newsletter.schema.json` to add `"Calendar"` and `"Humor"`. Both are legitimate article categories already in production data.
- **D-09:** During routine updates, the agent does NOT auto-extend schemas. If an extracted category is not in the enum, the agent uses the closest valid category, marks it `[UNVERIFIED]` with the original value noted, and presents the mismatch to the human at checkpoint. Human decides: extend schema or accept mapping.

### ICS calendar file scope
- **D-10:** Generate both individual per-meeting `.ics` files AND a quarterly aggregate `.ics` file. Both serve distinct user needs already built into the site (per-meeting "Add to Calendar" buttons and "Download full quarter schedule" link).
- **D-11:** Individual files: one per meeting in `data/calendar/`, named `YYYY-MM-DD-meeting.ics` (or `-picnic.ics`, `-holiday.ics` as appropriate). Single `VCALENDAR` with one `VEVENT`.
- **D-12:** Quarterly aggregate: one file in `public/`, named `sapa-qN-YYYY-meetings.ics`. Single `VCALENDAR` with all quarter `VEVENT` blocks.
- **D-13:** Skill instructions must include ICS format templates with exact field conventions: `PRODID`, UID patterns, location escaping (`\,`), `STATUS:CANCELLED` for holidays, `STATUS:CONFIRMED` for active meetings. This resolves the research gap about ICS generation mechanism.

### Claude's Discretion
- Schema validation approach (how the agent checks extracted data against schemas -- e.g., field-by-field in prompt vs. programmatic tool)
- Extraction prompt structure (single-pass vs. multi-pass -- research recommends single-pass for 5-page newsletters)
- Operation ordering (data files before HTML is recommended by ARCHITECTURE.md but agent can optimize)
- Extraction output staging (held in conversation memory vs. temp file -- conversation memory is sufficient for 5-page newsletters)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data schemas (validation targets)
- `data/schemas/newsletter.schema.json` -- Newsletter entry validation; note D-08 requires adding "Calendar" and "Humor" to featuredArticles.category enum
- `data/schemas/meeting.schema.json` -- Meeting entry validation; includes enum for type field and required fields list
- `data/schemas/archived-newsletter.schema.json` -- Not directly modified but agent should be aware of archive structure

### Data files (update targets)
- `data/newsletters/newsletters.json` -- Prepend new entry, update metadata block
- `data/meetings/meetings.json` -- Append new quarter entries after last existing date

### ICS format reference (existing files as templates)
- `data/calendar/2026-04-03-meeting.ics` -- Individual cancelled/holiday ICS template (STATUS:CANCELLED, 1-min duration)
- `data/calendar/2026-06-19-picnic.ics` -- Individual special event ICS template (non-standard time)
- `data/calendar/2026-04-10-meeting.ics` -- Individual regular meeting ICS template
- `public/sapa-q2-2026-meetings.ics` -- Quarterly aggregate ICS template (multiple VEVENTs)

### Research documents
- `.planning/research/ARCHITECTURE.md` -- PDF reading strategy, extraction prompt design, data mapping to schemas, agent workflow phases
- `.planning/research/PITFALLS.md` -- 13 failure modes with prevention strategies
- `.planning/research/SUMMARY.md` -- Research summary with confidence assessments and gaps

### v1.2 workflow reference
- `Q2-2026-update-plan.md` -- The manual update plan that this skill codifies; covers all 10 update areas
- `.planning/debug/meetings-stale-content.md` -- ESBuild bundle rebuild requirement (why `npm run build:js` is mandatory)

### Existing review precedent
- `.planning/quick/2-review-sapa-philatex-q2-2026-newsletter-/` -- Quick task #2 newsletter review; establishes the format and scope for proofreading reports

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `data/calendar/*.ics` (50 files): Complete ICS template library covering regular meetings, holidays, picnics, and quarterly aggregates. The agent can use these as exact format references.
- `Q2-2026-update-plan.md`: The v1.2 manual update plan serves as a checklist template for the skill's extraction targets.
- Existing meeting entries in `meetings.json`: Provide the exact JSON structure (including non-schema fields like `bogStart`) that new entries must match.

### Established Patterns
- **Meeting data**: `bogStart` field used in practice but not in schema; agent should include it for BOG meetings to match existing pattern.
- **Newsletter ordering**: Most recent entry first in the `newsletters` array; `metadata.totalIssues` and `metadata.latestIssue` must be updated.
- **Meeting ordering**: Chronological (oldest first) in the `meetings` array; new quarter appended after last existing date.
- **ICS UID inconsistency**: Individual files use UTC timestamps in UID (`20260403T193000Z-sapa@`), quarterly files use date-only (`sapa-2026-04-03@`). Agent should follow existing convention for each type.
- **Time format inconsistency**: Individual ICS files use UTC (`DTSTART:20260403T183000Z`), quarterly files use local time without TZID (`DTSTART:20260410T183000`). Agent should match existing convention per file type.

### Integration Points
- `npm run build:js` -- Must run after meetings.json updates to rebuild ESBuild bundles (documented bug in .planning/debug/)
- HTML pages updated: `index.html` (upcoming meeting, newsletter link), `newsletter.html` (current issue, archive list), `meetings.html` (schedule table), `about.html` (officer roster if changed)
- `.planning/reviews/` -- New directory for proofreading reports (created by this phase)

</code_context>

<specifics>
## Specific Ideas

- The Q2 2026 newsletter had a factual discrepancy: prose said Joe Perez's program was "in April" but the calendar showed May 29. The skill instructions should tell the agent to source meeting dates from the calendar table (not prose), and flag prose/calendar conflicts in the proofreading report.
- The meeting calendar is a 3-column table (one column per month). The skill should explicitly tell the agent about this layout so it doesn't misparse columns.
- The picnic meeting has a non-standard start time (6:00 PM instead of 6:30 PM). The skill should warn against blindly applying default times.
- The `bogStart` field in meetings.json is not in the official schema but is used in existing data. The agent should include it for BOG meetings and omit it for others.
- File size should be obtained via `stat` command, not extracted from the PDF content.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 11-extraction-and-update-workflow*
*Context gathered: 2026-03-24*
