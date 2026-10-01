---
created: 2026-10-01T02:25:00.000Z
title: Confirm the bourse no-dealer-table-fee policy after the next club meeting
area: content
severity: minor
files:
  - data/meetings/meetings.json (bourse/social specialNotes)
  - .claude/skills/philatex-update/references/acceptance-contract.md (standing "no bourse price" assertion)
  - .claude/skills/philatex-update/references/learnings.md (2026-Q4 auction/bourse template notes entry)
---

## Problem

On 2026-09-30 the newsletter editor (club officer) confirmed by email that SAPA does not charge for bourse dealer tables and asked that any mention of a fee be removed; he said he would verify this at the next club meeting (Oct 2, 2026). The fee was removed from every meeting and a standing "no bourse price" assertion was added to the philatex-update skill, both recorded as provisional.

## Solution

After Oct 2, 2026, ask the officer whether the meeting confirmed no table fee.

- Confirmed: drop "provisional" from the learnings entry; nothing else changes.
- Reversed: restore the stated fee on upcoming bourses (source it from his answer), and retire the standing assertion by operator ruling, as its own text requires.

## Also open: a skill rule so /philatex-update never re-adds the fee (operator design decision)

The fee spread to 16 meetings because the extraction agent builds new bourse entries from earlier ones. A rule was drafted, approved in principle by the operator, and then withdrawn from the data PR (fix/bourse-table-fee). Four review cycles each found new defects in it:

- **Agent instruction** ("never copy a fee or price note forward"): too broad. It would make the next run drop the confirmed auction terms ("10% commission", "Cash or check accepted") and the holiday gift-exchange limit.
- **Grep-based contract check:** it could pass without checking anything (relative path, jq errors swallowed, an empty selection reads as a pass). It also raised false blockers on legitimate amounts, such as the Blue-Chip "$20 minimum catalog value".
- **Read-and-verify negative assertion:** negative assertions go to the PDF-only skeptic panel (orchestration.md). The PDF is silent on fees, so it could be marked refuted, a false blocker on correct data. `source: operator-ruling` is reserved for post-freeze amendments, and the contract argument shape drops `source` anyway.
- **Unresolved conflicts:** no rule for a PDF that reprints a fee the officer says is not charged, and no reversal path if the officer reverses the policy.
- **Interim learnings guard:** it has nothing checking it, and binding force inside a `proposed` entry is ambiguous.

Likely right layer: a narrow agent rule scoped to bourse table fees only, plus a positive check verified against the worktree data (not routed to the PDF skeptics), designed together with the skill's review workflow. Then update the learnings entry (lines 125-130) with the officer's confirmation.
