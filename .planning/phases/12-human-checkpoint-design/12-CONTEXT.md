# Phase 12: Human Checkpoint Design - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Before any git commit, the agent surfaces a structured review summary — key facts first, full diff secondary — so the human can confidently approve or reject the staged changes. The checkpoint is a text-based presentation within the Claude Code conversation, using AskUserQuestion for the approve/reject decision.

</domain>

<decisions>
## Implementation Decisions

### Key-facts checklist (10 fixed categories, dynamic values)
- **D-01:** The checkpoint leads with a 10-item key-facts summary using fixed categories with dynamic values. The same 10 slots appear every quarter — the human builds muscle memory reviewing a consistent structure.
- **D-02:** Items are ordered red-flags-first (per PITFALLS.md Pitfall 5), content facts second, scope confirmation last:
  1. [UNVERIFIED] count — critical safety signal ("0 items" or "3 items — REVIEW REQUIRED")
  2. Schema validation status — second safety signal ("All passed" or "2 warnings: category enum")
  3. Newsletter ID + title — ("2026-Q2: The Philatex — Second Quarter 2026")
  4. Quarter date range — ("April–June 2026")
  5. Meetings added — count and date span ("13 meetings, Apr 3 – Jun 26")
  6. Officer changes — names and roles or "No changes"
  7. New members — count and names or "None"
  8. Announcements — count and brief list
  9. TSDA shows — count and date range or "None"
  10. Files modified — count with category breakdown ("17 files: data, HTML, ICS")
- **D-03:** Items 1-2 are must-read red flags. Items 3-9 are spot-check content facts. Item 10 is scope confirmation. The entire summary fits under 20 lines.

### Rejection behavior (binary approve/reject with clean revert)
- **D-04:** The checkpoint presents a binary choice via AskUserQuestion: **Approve** (commit all staged changes) or **Reject** (revert all changes to clean working tree).
- **D-05:** On rejection, the agent reverts all modified permitted-files via `git checkout -- <files>` and removes any newly created files (ICS calendars). Working tree returns to pre-run state. This directly satisfies the success criteria: "reject to discard staged changes with no files modified."
- **D-06:** Conversational correction is the implicit third path — if the human spots an issue, they can type feedback ("fix the meeting date on Apr 17") instead of selecting Approve/Reject. The agent makes the correction and re-presents the checkpoint. No special menu option needed; the conversation context handles it naturally.

### Diff presentation (category-grouped stat summaries)
- **D-07:** After the key-facts summary, the checkpoint shows a "Changes by Category" section grouping modified files by type: Data Files, HTML Pages, ICS Calendar, Build Output.
- **D-08:** Each file shows `+N -M` line counts with a brief semantic annotation in parentheses (e.g., "13 new meeting entries"). ICS files are collapsed to a single summary line ("13 individual + 1 quarterly .ics") since they are generated content.
- **D-09:** The diff section shows SCOPE (what files, how much changed), not content. The key-facts summary already covers semantic content. The human can run `git diff <file>` for line-by-line detail on any specific file.

### Approval model (all-or-nothing with conversational fix-and-retry)
- **D-10:** The checkpoint is all-or-nothing — no partial approval by category or file. This prevents the inconsistent-state failure mode described in PITFALLS.md Pitfall 3 (newsletter data is interdependent across meetings.json, HTML pages, ICS files, and metadata counters).
- **D-11:** The fix-and-retry loop provides surgical control without breaking atomicity: spot issue → tell agent to fix → agent corrects → re-presents checkpoint → approve corrected whole set.

### Claude's Discretion
- Exact formatting of the key-facts summary (markdown table vs numbered list vs key-value pairs) — as long as it fits under 20 lines and is scannable
- The proposed commit message shown at checkpoint (conventional commit format, e.g., `content(Q2-2026): add quarterly newsletter update`)
- Whether to show a brief "proofreading report" link/reference alongside the checkpoint (from Phase 11's CONT-02 feedback report)
- Exact wording of the AskUserQuestion prompt for approve/reject

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Checkpoint design
- `.planning/research/PITFALLS.md` §Pitfall 5 — Checkpoint Fatigue prevention: skimmability design, under-20-line requirement, red-flags-first ordering
- `.planning/research/PITFALLS.md` §Pitfall 3 — Partial Update / Inconsistent State: atomic transaction rationale, "if human rejects any staged change, nothing is applied"
- `.planning/research/PITFALLS.md` §Pitfall 2 — PDF Hallucination: [UNVERIFIED] marker strategy that feeds into checkpoint item #1

### Architecture and workflow
- `.planning/research/ARCHITECTURE.md` §4 — 6-phase agent workflow; checkpoint sits between Phase 5 (stage all changes) and Phase 6 (commit)
- `.planning/research/SUMMARY.md` — Overall v1.3 architecture summary; two-phase workflow confirmation

### Requirements
- `.planning/REQUIREMENTS.md` — WORK-01 (agent pauses for human review before committing)
- `.planning/REQUIREMENTS.md` — AUTO-03 (skimmable checkpoint format)
- `.planning/REQUIREMENTS.md` — SAFE-02 (rollback capability if human rejects)

### Reference material
- `Q2-2026-update-plan.md` — The actual manual v1.2 update plan; source of truth for what categories the key-facts checklist covers
- `.planning/ROADMAP.md` §Phase 12 — Success criteria (10-item summary, pause before commit, approve/reject)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `data/schemas/meeting.schema.json` + `data/schemas/newsletter.schema.json` — Schema validation that feeds into checkpoint item #2 (schema validation status)
- Permitted-file list (defined in Phase 10's SKILL.md) — Drives the revert mechanism for rejection behavior

### Established Patterns
- AskUserQuestion tool — Confirmed available in skill context with `allowed-tools: AskUserQuestion` in SKILL.md frontmatter. Supports single-select options with label + description. The agent presents options and the human selects.
- `git checkout -- <file>` — Standard git mechanism for reverting individual files to HEAD state. Safe for the revert-on-rejection flow.
- Conventional commit format — Existing commits follow `type(scope): description` pattern (e.g., `fix(data): correct Q2 2026 newsletter pageCount`)

### Integration Points
- Phase 11 output: The checkpoint consumes the extracted content and [UNVERIFIED] markers produced by Phase 11's extraction workflow
- Phase 10 SKILL.md: The checkpoint instructions will be added to (or referenced from) the skill file. The permitted-file list from Phase 10 is used for the revert mechanism.
- `npm run build:js` — Build must complete before checkpoint is presented (build status is part of the scope shown in diffs)

</code_context>

<specifics>
## Specific Ideas

- The checkpoint should feel like a "flight checklist" — same items every time, pilot confirms each value, proceed or abort. Quarterly newsletter updates have consistent structure, so a fixed checklist works.
- Red flags at positions 1-2 exploit the primacy effect — the first items read get the most attention. [UNVERIFIED] count at position 1 ensures it is never skipped.
- The conversational fix-and-retry loop leverages Claude Code's natural conversational interface. No special UX is needed — the human just talks to the agent. This is more natural than a "Modify" button.
- ICS files are collapsed in the diff section because they are generated from meetings.json data. If meetings.json is correct, ICS files are correct by construction.

</specifics>

<deferred>
## Deferred Ideas

- **Interactive diff viewer** — A future enhancement could present diffs with expand/collapse per file. Not feasible in current CLI text output.
- **Checkpoint history/audit log** — Recording what was approved/rejected across quarters for trend analysis. Belongs in a future milestone.
- **Automated spot-check tests** — Running validation tests (e.g., "all meeting dates are Fridays") as part of the checkpoint rather than relying on human review. Could be a Phase 11 enhancement or separate phase.

</deferred>

---

*Phase: 12-human-checkpoint-design*
*Context gathered: 2026-03-24*
