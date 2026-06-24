---
name: philatex-update
description: |
  Use when asked to update or process a new Philatex newsletter for the
  San Antonio Philatelic Association (SAPA / sastamps) website -- e.g.
  "update newsletter", "process Philatex", "update site with new Philatex",
  or when given a Philatex PDF path with "/philatex-update".
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
  - Agent
  - Workflow
  - ToolSearch
  - mcp__sequential-thinking__sequentialthinking
  - mcp__plugin_context7_context7__resolve-library-id
  - mcp__plugin_context7_context7__query-docs
---

# /philatex-update

Quarterly newsletter update workflow for the San Antonio Philatelic Association website. The skill validates a new Philatex PDF, identifies its edition, checks for duplicates, then runs a **multi-agent, adversarially-reviewed** pipeline -- research → plan → extract → review -- presents changes for human approval, and finally captures learnings so each run improves the next.

## Operating Mode

Run this skill at **extra-high (`xhigh`) reasoning effort** end to end.

This skill is an **orchestrator** built on three layers, matching the stack division *planning = GSD, discipline = superpowers, orchestration = native*:

- **Orchestration spine — native.** Expert-persona agent teams run via dynamic `Workflow` fan-outs. Research and review each end with an **adversarial skeptic** whose job is to refute, not confirm.
- **Planning brains — GSD.** The research and plan-gate phases borrow GSD's maintained planning agents (`gsd-phase-researcher`, `gsd-plan-checker`) as personas. They are borrowed, not required: if a GSD agent is unavailable or expects GSD `.planning/` artifacts it cannot find, fall back to the generic persona named alongside it.
- **Discipline — superpowers TDD.** The pipeline is RED → GREEN → REFACTOR. Phase 7 emits a frozen **acceptance contract** (the failing test). Phase 8 extraction turns it GREEN. Phase 9's adversarial panel is the test runner. **REQUIRED BACKGROUND:** `superpowers:test-driven-development`.

Reference material (read when you reach the phase that needs it):
- **Agent teams, personas, Workflow scripts, adversarial protocol:** `references/orchestration.md`
- **The acceptance contract (RED artifact) + worked example:** `references/acceptance-contract.md`
- **Data shapes, ICS/HTML/PDF conventions, build coupling:** `references/data-contract.md`
- **How the skill learns from each run:** `references/self-improvement.md` (+ append-only `references/learnings.md`)

Phases 1–5 are cheap gates and MUST complete before any agent team is spawned. The heavy machinery (Phases 6–9, 13) runs only once an edition is confirmed new.

## Phase 1: Input Parsing

Parse the invocation for the PDF path.

- **First argument:** path to the Philatex newsletter PDF (required).
- If no PDF path is given, ask the user to provide one before proceeding.

Example: `/philatex-update ~/Downloads/philatex-q3-2026.pdf`

## Phase 2: File Validation

1. Check the file exists: `[ -f "$PDF_PATH" ]`
2. Check it has a `.pdf` extension (case-insensitive).
3. If validation fails, report the error and **STOP**.

## Phase 3: Edition Identification

1. Use the **Read** tool on the PDF (no `pages` parameter -- newsletters are under 10 pages).
2. On page 1, read the masthead: "THE PHILATEX" with the quarter and year (e.g., "Second Quarter 2026").
3. Map quarter name → edition ID `YYYY-QN` (First=Q1, Second=Q2, Third=Q3, Fourth=Q4), e.g. `2026-Q3`.

**The newsletter identifies itself on page 1. Do NOT rely on the filename.**

## Phase 4: Duplicate Check (gate)

1. Read `data/newsletters/newsletters.json`.
2. Compare the constructed edition ID against the `id` of every entry in `newsletters[]`.

**If a match is found:**
> "Edition {ID} already exists in newsletters.json. This newsletter has already been processed. No changes made."

**STOP.** Do not modify any files and do not spawn any agents.

**If no match:** report "Edition {ID} is new. Proceeding." and continue to Phase 5.

## Phase 5: Load Accumulated Learnings

Read `references/learnings.md` (relative to this skill). Hold its contents to pass into the research and extraction phases. This is how prior editions' lessons reach the current run. If the file is missing, continue with empty learnings.

## Phase 6: Research (GSD researcher + Context7 + adversarial)

Run the **research workflow** from `references/orchestration.md`. It fans out two researchers in parallel and ends with an adversarial completeness critic:

- `gsd-phase-researcher` persona (fallback `Explore`) — maps the exact current data shapes, ICS naming, and HTML section anchors the new edition must match.
- Context7 researcher — confirms current constraints for esbuild, lunr, and vanilla-calendar-pro (and resolves any iCalendar ambiguity against the existing template `.ics` files).
- Completeness critic (`xhigh`) — enumerates what the researchers missed that could break extraction or the build.

Pass `args = { editionId, quarter, year, learnings }`. Keep the returned `{ patterns, specs, gaps }` for the planning and extraction phases.

## Phase 7: Plan + Acceptance Contract — RED (sequential thinking + GSD plan-check)

This phase produces the **failing test** the rest of the run must pass. Nothing is extracted yet.

1. Use `mcp__sequential-thinking__sequentialthinking` to build the edition-specific plan from the research output. Decompose at least: DST regime (CDT/CST) for this quarter, expected meeting count and span, non-standard meetings (picnic time, holidays, BOG), officer/address changes, and likely `[UNVERIFIED]` risks.
2. From the plan + the page-1 calendar + the schemas + learnings, author the **acceptance contract**: a list of checkable assertions (counts, per-meeting facts, schema, continuity, ICS, provenance, negative assertions, automated green bar), every one `status: RED`. Format and a full worked example: `references/acceptance-contract.md`. Write it to `.planning/reviews/{EDITION_ID}-acceptance-contract.md`.
3. Gate both with `gsd-plan-checker` (fallback `quality-engineer`, `xhigh`) doing goal-backward analysis: "if extraction satisfies this contract, will the data be correct AND complete? What assertion is missing, wrong, or back-filled from habit rather than the source?" Pay special attention to **negative assertions** (e.g., no picnic outside Q2) — that is where over-fit hides.
4. Revise with whatever the checker surfaces, then **freeze** the contract. Authoring the contract from the source — never from extractor output — is mandatory.

## Phase 8: Extraction — GREEN

Spawn the `philatex-newsletter-agent` with full context:

- `PDF_PATH`, `EDITION_YEAR`, `QUARTER_NAME`, `EDITION_ID`
- **Research findings** (`patterns`, `specs`, `gaps`), the **frozen plan**, and the **frozen acceptance contract** from Phases 6–7
- The **learnings** loaded in Phase 5

Files the agent must read before starting: its own instructions (`.claude/agents/philatex-newsletter-agent.md`), `data/schemas/newsletter.schema.json`, `data/schemas/meeting.schema.json`, `data/newsletters/newsletters.json`, `data/meetings/meetings.json`.

The agent's definition of done is **every contract assertion GREEN**. It handles extraction, validation, data-file updates, ICS generation, HTML updates, then runs the green bar — `build:js`, `build:search` + `build:search:embed`, `validate:data` (scoped to the new ids via `VALIDATE_NEW_IDS`), and `test:quick` — and reports each contract assertion as GREEN or still-RED. It does NOT commit. It returns a structured Step 9 summary.

## Phase 9: Adversarial Review Panel — REFACTOR / test runner (agent team)

Run the **flagship review workflow** from `references/orchestration.md`. Build `args.extractedFacts` from the agent's Step 9 summary (one entry per meeting + officer roster + new-member names + publish date) and pass the frozen contract. The panel is the **test runner**:

- For each contract assertion the agent claims GREEN, an independent verifier re-checks it against the source and tries to prove it is still RED. An assertion is GREEN only if it survives.
- Reviews by dimension (content fidelity, data integrity, ICS time-math, diff safety) with expert personas (optionally `gsd-verifier` / `gsd-code-reviewer`); each finding is refuted by an independent skeptic before it is reported.
- Refutes each high-risk per-meeting and negative assertion with ≥3 independent skeptics; majority-refute → **contested**.
- Synthesizes one ranked report (`blocker`/`major`/`minor`, overall verdict) plus the final contract scoreboard (GREEN/RED per assertion).

Keep the report — it is surfaced verbatim in the Phase 11 checkpoint. **Any RED assertion, or a `block` verdict, is treated like a failed build:** do not advance to the checkpoint until it is resolved (loop back to extraction/fix).

## Phase 10: Verification Gate

Before the checkpoint, confirm:

1. **Every acceptance-contract assertion is GREEN** (including the automated green bar `[G1]`-`[G4]`: `build:js`, search rebuild + embed, scoped `validate:data`, `test:quick`).
2. All expected files were modified: `data/newsletters/newsletters.json` (new edition ID), `data/meetings/meetings.json` (new quarter dates), ≥1 ICS in `data/calendar/`, the quarterly aggregate ICS in `public/`, the source PDF copied to `public/SAPA-PHILATEX-…pdf` (filePath must resolve — `[S4]`), and `index.html` / `newsletter.html` / `meetings.html`.
3. The review verdict is not `block`.

If any check fails, report it and STOP (or loop back to fix). Otherwise continue to Phase 11.

## Phase 11: Human Checkpoint

The ONLY place the skill pauses for human input. Present, in order:

**11a. Adversarial Review Report** — the Phase 9 synthesized report, verbatim, at the top so the human sees what the panel caught before anything else.

**11b. Key-Facts Summary** — 10 FIXED categories, red-flags-first, as a numbered list under 20 lines:
1. `[UNVERIFIED] count` — "0 items" or "N items -- REVIEW REQUIRED"
2. `Schema validation status` — "All passed" or "N warnings: {details}"
3. `Newsletter ID + title`
4. `Quarter date range`
5. `Meetings added` — count and date span
6. `Officer changes` — names/roles or "No changes"
7. `New members` — count and names or "None"
8. `Announcements` — count and brief list
9. `TSDA shows` — count and date range or "None"
10. `Files modified` — count with category breakdown

If item 1 or 2 is non-zero/non-pass, or the review verdict is `fix-required`, add a visible warning line above the summary:
```
--- RED FLAGS DETECTED -- Review items above carefully ---
```

**11c. Changes by Category** — group modified files (Data / HTML / ICS / Build) with `git diff --stat` line counts and a one-line semantic annotation each. Collapse ICS to a single summary line.

**11d. Proposed Commit Message** — a conventional commit, e.g. `content(Q3-2026): add Third Quarter 2026 newsletter update`.

**11e. Approve/Reject Prompt** — present **Approve** (commit) or **Reject** (revert). Any free-form text instead is a correction: make the change, then re-present the full checkpoint from 11a. This loop has no limit.

## Phase 12: Resolve

**On Reject — clean revert (atomic):**
1. From the agent's Step 9 lists, `git checkout -- <file>` each pre-existing modified file and `rm <file>` each newly created file (new ICS, new PDF).
2. `npm run build:js` to restore build output.
3. `git status` to confirm a clean tree in permitted-file scope.
4. Report: "All changes reverted. Working tree restored to pre-run state. No files were committed."

Never partially revert. The update is one transaction.

**On Approve — atomic commit:**
1. `git add <file>` for each file in the agent's Files Created + Files Modified lists (NEVER `git add .` / `-A`).
2. Also stage regenerated `dist/` build output.
3. `git commit -m "<message>"` using the Phase 11d message.
4. Report: "Changes committed: <hash>. Run `git push` when ready to deploy."

Do NOT push. The human controls deployment.

## Phase 13: Retrospective & Self-Improvement

After Phase 12 resolves (either way), run the self-improvement protocol in `references/self-improvement.md`:

1. Gather evidence: the synthesized review report, the human's fix-loop corrections, contested facts, and any PDF format-drift notes.
2. Use `mcp__sequential-thinking__sequentialthinking` to separate durable rules from one-off quirks.
3. **Always** append every item to `references/learnings.md`.
4. For items meeting the promotion bar (recurring ≥2 editions OR human-confirmed) run the **over-fit critic** (`xhigh`); apply only `promote` verdicts to the target file (SKILL.md, `references/data-contract.md`, the persona roster, or the agent).
5. Report what was logged and what was promoted/proposed as the final line of the run.

**Guardrails are never self-edited** (see Important Rules 4–9). They change only by direct human instruction.

---

## Permitted-File Scope Boundary

```
PERMITTED FILES (agent may modify freely):
  data/newsletters/newsletters.json
  data/meetings/meetings.json
  data/calendar/*.ics              (new files only)
  public/*.ics                     (new files only)
  public/*.pdf                     (additions only, no deletions)
  index.html
  newsletter.html
  meetings.html
  about.html
  contact.html

SELF-IMPROVEMENT SCOPE (Phase 13 only, gated by the over-fit critic):
  .claude/skills/philatex-update/**     (this skill + its references)
  .claude/agents/philatex-newsletter-agent.md

SCOPE RULE: Any file NOT on these lists requires explicit human
confirmation before modification. If an agent identifies out-of-scope
changes it believes are needed, it must report them in the checkpoint
summary rather than making them.
```

## Important Rules

1. **Run at `xhigh` effort and orchestrate (native spine, GSD planning, TDD discipline).** Research and review are dynamic `Workflow` fan-outs; planning uses sequential thinking and the GSD plan-check; both end adversarially. Do not collapse the pipeline into a single solo pass.
1a. **Contract-first (RED before GREEN).** No extraction begins until a frozen acceptance contract exists, authored from the source PDF/schemas — never back-filled from extractor output. A contract written after extraction is a violation; delete it and re-derive from the source. Any RED assertion at Phase 10 blocks the checkpoint.
2. **This skill does NOT extract content itself** — Phase 8's agent does. **It does NOT commit** until Phase 12 approval.
3. **It does NOT ask the user what edition the PDF is** — it reads page 1.
4. **The duplicate check (Phase 4) is mandatory and gates all fan-out.** Never skip it, even if the user says "just update it."
5. **The permitted-file list is the source of truth for scope.** Out-of-scope changes are flagged, not performed.
6. **Verify before the checkpoint (Phase 10).** If the build failed, required files were not updated, or the review verdict is `block`, do not proceed.
7. **The human checkpoint (Phase 11) is MANDATORY.** Never skip it, even with zero `[UNVERIFIED]` markers and a clean review.
8. **On rejection, revert ALL changes; on approval, commit ALL changes atomically** with explicit `git add` paths.
9. **The fix-and-retry loop has no limit.**
10. **Self-improvement (Phase 13) always logs, rarely promotes.** Promotion requires recurrence-or-authority AND an over-fit critic's `promote` verdict. Guardrails (rules 4–9) are never self-edited.
