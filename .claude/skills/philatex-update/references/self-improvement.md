# Philatex Update — Self-Improvement Reference

How the skill learns from each run so the next run is better. This runs as the final phase (SKILL.md Phase 13), after the human approves or rejects.

**Core idea:** every run produces evidence (what the adversarial panel caught, what the human corrected in the fix-loop, what drifted in the PDF format). That evidence is *always* logged. It is *promoted* into the skill's own instructions only when it is recurring or human-confirmed — never on the strength of a single edition, and never without passing an over-fit critic. This mirrors the writing-skills Iron Law: no skill edit without a demonstrated, repeated failure.

## What counts as a learning

Capture a learning when any of these occurred during the run:

- The adversarial review panel confirmed a real finding (a `blocker`/`major` the extractor produced).
- The human corrected something in the fix-and-retry loop (their correction is ground truth).
- A high-risk fact was **contested** (majority-refuted) by the skeptic panel.
- The PDF structure survey found a **format drift** from prior editions (new section, moved calendar, changed masthead).
- A schema gap or enum-miss surfaced (a value the data needs but the schema rejects, or vice versa).
- A persona repeatedly flagged the same class of issue.

## The log: `references/learnings.md`

Append-only. The research and planning phases (SKILL.md Phases 6–7) **read this file every run** and pass it to the research workflow and the extraction agent as context — that is what makes the skill self-improving rather than merely self-logging.

Each entry uses this shape:

```markdown
### {YYYY-QN} — {short title}
- **Observed:** what happened (the finding/correction/drift)
- **Source:** review-panel | human-correction | refutation | format-drift | schema-gap
- **Generalizable rule:** the durable lesson, phrased as guidance for a future run (or "one-off — log only")
- **Seen in:** {editions where this pattern appeared}
- **Status:** logged | promoted → {file:section} | proposed (awaiting human)
```

## Promotion protocol (log → skill)

A logged learning is promoted into the skill's *instructions* (SKILL.md, `references/data-contract.md`, the persona roster, or `philatex-newsletter-agent.md`) only when **both** hold:

1. **Recurrence or authority.** It appeared in **≥2 editions**, OR the human explicitly confirmed it this run.
2. **It survives the over-fit critic.** Spawn one adversarial agent (`xhigh`) with this charge:
   > "Here is a proposed edit to a reusable skill, justified by N editions of evidence. Argue whether it is a generalizable rule or an over-fit to specific editions. Check it does not contradict an existing rule in the skill. Recommend: promote / keep-logging / reject."

Only a `promote` verdict authorizes an edit.

## Routing matrix

| Situation | Action |
|-----------|--------|
| One-off quirk, this edition only | Append to `learnings.md`, status `logged`. No skill edit. |
| Recurring (≥2 editions), survives critic | Edit the target file. Update the entry's status to `promoted → {file:section}`. Surface the edit in the Phase 13 report. |
| Human explicitly confirmed a new rule this run | Propose the concrete edit at the checkpoint; apply on human approval; status `promoted`. |
| Recurring but critic says over-fit, or it touches a guardrail (permitted-file scope, duplicate check, human checkpoint, atomic commit/revert) | Do **not** auto-edit. Status `proposed`; surface for explicit human decision. |

**Guardrails are never self-edited.** The duplicate-check gate, permitted-file scope, mandatory human checkpoint, and atomic commit/revert rules in SKILL.md change only by direct human instruction, regardless of evidence.

## What the orchestrator does in Phase 13

1. Gather evidence: the synthesized review report, the human's fix-loop corrections, contested facts, and the PDF structure-survey drift notes.
2. Use `mcp__sequential-thinking__sequentialthinking` to separate durable rules from one-off quirks.
3. Append every item to `references/learnings.md` (always).
4. For items meeting the promotion bar, run the over-fit critic; apply `promote` verdicts to the target file. **Prefer encoding a promoted rule as a standing acceptance-contract assertion** (in `acceptance-contract.md`, reused every quarter) whenever it is checkable — a learning expressed as a recurring RED→GREEN test is enforced automatically next run, not just documented. Non-checkable lessons go to the prose targets (data-contract, agent, roster).
5. Report what was logged and what was promoted/proposed as the final line of the run. Self-improvement edits to the skill are themselves part of the change set — if the run was committed, mention them so the human can review.
