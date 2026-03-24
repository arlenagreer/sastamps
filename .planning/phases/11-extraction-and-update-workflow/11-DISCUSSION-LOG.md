# Phase 11: Extraction and Update Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 11-extraction-and-update-workflow
**Areas discussed:** [UNVERIFIED] marking placement, Proofreading report scope and destination, Schema evolution policy, ICS calendar file scope
**Decision mode:** Autonomous (agent selected all options based on codebase analysis, industry standards, and best judgment)

---

## [UNVERIFIED] Marking Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in data fields | Place [UNVERIFIED] in free-text JSON fields (description, specialNotes); use best-guess for enum fields with uncertainty noted in free-text | Yes |
| Separate report file | Keep JSON data clean; list all uncertainties in a standalone file the human cross-references | |
| Both inline and report | Markers in data AND in a separate report for double visibility | |

**Selected:** Inline in free-text data fields with checkpoint aggregation
**Rationale:** Markers in the actual data show up in `git diff` during review, making them impossible to miss. Free-text fields accept arbitrary strings without breaking schema validation. Enum fields stay schema-valid with best-guess values while uncertainty is captured in adjacent free-text fields. Avoids a separate report file that the reviewer would have to cross-reference. Phase 12 checkpoint aggregates all markers into a summary.

---

## Proofreading Report Scope and Destination

| Option | Description | Selected |
|--------|-------------|----------|
| PDF quality only | Typos, layout, formatting issues in the newsletter PDF | |
| PDF quality + extraction discrepancies | PDF quality plus notes on content discrepancies that affect extraction accuracy | Yes |
| Extraction accuracy only | Only confidence notes about the agent's extraction | |
| Conversation output only | Transient, not persisted | |
| File in .planning/ | Persisted in operational directory, tracked in git | Yes |
| File in main repo source | Committed alongside website source files | |

**Selected:** PDF quality focused with extraction discrepancies noted; saved to `.planning/reviews/YYYY-QN-newsletter-review.md`
**Rationale:** Mirrors the v1.2 precedent (quick task #2 produced NEWSLETTER-REVIEW.md). Conversation-only output is too transient for sharing with the newsletter editor. The `.planning/reviews/` location keeps it separate from website source while making it accessible. Extraction accuracy is primarily handled by [UNVERIFIED] markers, so the proofreading report focuses on PDF quality feedback for the editor.

---

## Schema Evolution Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Agent auto-extends schema | Add new categories to enum whenever they appear | |
| Map to closest valid category | Fixed schema; lossy mapping every time | |
| Flag for human decision | Agent detects mismatch, presents options at checkpoint | |
| One-time fix now + flag future unknowns | Extend enum with known categories; flag genuinely new ones for human | Yes |

**Selected:** One-time schema fix (add "Calendar" and "Humor") plus flag-for-human on future unknowns
**Rationale:** The schema should reflect reality. "Calendar" and "Humor" are real, recurring article types already in production data. Pretending they don't exist forces lossy mappings every quarter. But allowing the agent to freely extend enums risks drift. The one-time fix addresses known gaps; the flag-for-human policy keeps future evolution controlled. Research SUMMARY.md acknowledged "one-time schema cleanup is needed."

---

## ICS Calendar File Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Both individual and quarterly | Per-meeting .ics in data/calendar/ AND quarterly aggregate in public/ | Yes |
| Quarterly aggregate only | Single file per quarter, simpler | |
| Individual only | Per-meeting files, no aggregate download | |

**Selected:** Generate both individual per-meeting files and quarterly aggregate
**Rationale:** Both file types serve distinct user needs already built into the site -- per-meeting "Add to Calendar" buttons and the "Download full quarter schedule" link. Dropping either would require HTML changes outside the skill's scope. The ICS format is now fully documented from v1.2 files, resolving the research gap. Skill instructions will include format templates with exact conventions.

---

## Claude's Discretion

- Schema validation approach (field-by-field in prompt vs. programmatic)
- Extraction prompt structure (single-pass recommended)
- Operation ordering (data before HTML recommended)
- Extraction output staging (conversation memory sufficient)

## Deferred Ideas

None -- discussion stayed within phase scope.
