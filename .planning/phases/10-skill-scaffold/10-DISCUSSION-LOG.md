# Phase 10: Skill Scaffold - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 10-skill-scaffold
**Areas discussed:** Permitted-file list scope, Duplicate detection mechanism, Reference checklist format, Skill-vs-agent boundary
**Mode:** Autonomous agent decision-making (user delegated all selections)

---

## Permitted-File List Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Narrow list (core files only) | Just 6 files from PITFALLS.md research. Agent flags anything outside for human action. | |
| Comprehensive list (v1.2 scope) | Include all files v1.2 touched: data files, HTML pages, ICS files, PDFs | ✓ |
| Tiered list (core auto, secondary confirmed) | Core files auto-approved, secondary files require per-run confirmation | |

**Agent's choice:** Comprehensive list matching full v1.2 update scope
**Rationale:** The skill codifies v1.2's complete workflow. Excluding ICS files or about.html/contact.html would leave the agent unable to finish without manual steps, defeating the purpose. The human checkpoint (Phase 12) is the real safety gate. The permitted list defines what the agent CAN touch, not what it MUST touch — if nothing changed in a file, the agent simply doesn't modify it.

---

## Duplicate Detection Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Parse from filename | Extract quarter/year from PDF filename, check newsletters.json | |
| Ask the user | Prompt for edition identity before checking | |
| Read PDF first, then check | Read page 1 to extract edition, then check newsletters.json | ✓ |
| Filename first, fallback to PDF | Try filename parsing, fall back to PDF read if ambiguous | |

**Agent's choice:** Read PDF first, then check newsletters.json
**Rationale:** The newsletter always identifies its edition on page 1. Reading a 5-page/577KB PDF is trivial for Claude. This approach is the most robust because it does not depend on the user naming the file in any particular way. The heavier extraction work (Phase 11) only begins after this gate clears.

---

## Reference Checklist Format

| Option | Description | Selected |
|--------|-------------|----------|
| Inline high-level reference table | Concise table listing file to key fields/sections | |
| Inline exhaustive runbook | Every JSON path, HTML section ID, ICS field with examples | |
| Separate reference document | SKILL.md points to a REFERENCE.md file | |
| Inline concise + schema delegation | Key fields and section IDs inline, delegate full validation to existing JSON schemas | ✓ |

**Agent's choice:** Inline concise checklist with schema delegation
**Rationale:** The existing JSON schemas in `data/schemas/` already define field requirements. Duplicating them in the checklist is wasteful. The checklist provides a quick-reference card (JSON key fields, HTML section IDs, ICS naming, PDF naming) while pointing to schemas for full validation. This keeps SKILL.md maintainable.

---

## Skill-vs-Agent Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Thin skill | Parse args, validate file, read PDF for edition ID, check duplicates, hand off to agent | ✓ |
| Thick skill | Also do PDF content validation, next-quarter prediction, pre-extraction | |
| Medium skill | Thin skill + user confirmation of detected edition before proceeding | |

**Agent's choice:** Thin skill
**Rationale:** Following research recommendation (FEATURES.md Pattern 4) and GSD patterns: "Skill = entry point, agent = executor." The skill handles: parse path, validate exists, read PDF for edition, check duplicate, hand off. No extraction, no updates, no schema validation. The agent (Phase 11) handles all content processing. The skill resumes after agent completion for the checkpoint (Phase 12).

---

## Claude's Discretion

- Exact wording of duplicate detection message
- Whether to include invocation banner
- Reference checklist table formatting
- Whether to validate PDF is actually a Philatex newsletter

## Deferred Ideas

- None — discussion stayed within phase scope
