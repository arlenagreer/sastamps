# Phase 12: Human Checkpoint Design - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 12-human-checkpoint-design
**Areas discussed:** Key-facts checklist items, Rejection behavior, Diff presentation, Partial approval

---

## Key-Facts Checklist Items

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 10-item template | Always the same 10 items; unused ones show "N/A" | |
| Dynamic top-10 | Agent picks 10 most relevant from ~15 categories based on what changed | |
| Fixed categories, dynamic values | 10 fixed categories always present, agent fills in specific values per quarter | ✓ |

**User's choice:** Fixed categories with dynamic values
**Notes:** Autonomous agent decision. Categories derived from the v1.2 manual update plan (Q2-2026-update-plan.md). Red flags (UNVERIFIED count, schema validation) ordered first per PITFALLS.md Pitfall 5 primacy effect. Content facts (newsletter, meetings, officers, members, announcements, TSDA) follow. Files-modified count closes as scope confirmation. All 10 items fit under 20 lines.

---

## Rejection Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Clean revert | git checkout all modified files, rm new files — pristine working tree | ✓ |
| Leave dirty | Don't commit but leave modified files for manual inspection | |
| Three-way choice | Approve / Reject & Revert / Reject & Keep as separate options | |

**User's choice:** Binary Approve/Reject with clean revert
**Notes:** Autonomous agent decision. Success criteria explicitly state "reject to discard staged changes with no files modified" — clean revert is the only option that satisfies this. Conversational correction (human says "fix X" instead of selecting Approve/Reject) serves as the implicit third path without adding menu complexity. The permitted-file list from Phase 10 drives the revert: `git checkout -- <files>` + `rm` new ICS files.

---

## Diff Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Raw git diff | Dump full `git diff` and `git diff --stat` output | |
| Semantic summaries | Prose descriptions per category, no line counts | |
| Category-grouped stat | Files grouped by type with +/-N line counts and brief annotations | ✓ |
| Hybrid summary + full diff | Semantic summary followed by full diff appended | |

**User's choice:** Category-grouped stat summaries with semantic annotations
**Notes:** Autonomous agent decision. Key-facts summary already handles "what changed semantically." Diff section handles "what files were touched and by how much" — scope confirmation. ICS files collapsed to single line (generated content). Category grouping (Data, HTML, ICS, Build) matches mental model. Human can run `git diff <file>` for detail. Avoids checkpoint fatigue from raw diffs (~200+ lines for 17 files).

---

## Partial Approval

| Option | Description | Selected |
|--------|-------------|----------|
| All-or-nothing | Single approve/reject for entire update | |
| Per-category | Approve/reject by category (data, HTML, ICS) | |
| Per-file | Approve/reject each of ~17 files individually | |
| All-or-nothing + fix-and-retry | Atomic approve/reject with conversational correction loop | ✓ |

**User's choice:** All-or-nothing with conversational fix-and-retry
**Notes:** Autonomous agent decision. PITFALLS.md Pitfall 3 explicitly warns against partial updates: newsletter data is interdependent (meetings.json ↔ meetings.html ↔ homepage ↔ ICS files ↔ metadata counters). Partial approval creates inconsistent state — the exact failure the skill prevents. Fix-and-retry via conversation gives surgical control: spot issue → tell agent → agent fixes → re-presents checkpoint → approve corrected whole.

---

## Claude's Discretion

- Exact formatting of key-facts summary (table vs list vs key-value)
- Proposed commit message wording
- Whether to reference Phase 11's proofreading report at checkpoint
- Exact AskUserQuestion prompt wording for approve/reject

## Deferred Ideas

- Interactive diff viewer with expand/collapse (not feasible in CLI text)
- Checkpoint history/audit log across quarters
- Automated spot-check tests (meeting dates are Fridays, etc.) as checkpoint enhancement
