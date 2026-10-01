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
  - Skill
  - mcp__sequential-thinking__sequentialthinking
  - mcp__plugin_context7_context7__resolve-library-id
  - mcp__plugin_context7_context7__query-docs
---

# /philatex-update

Newsletter update workflow (quarterly or bimonthly editions) for the San Antonio Philatelic Association website. The skill validates a new Philatex PDF, identifies its edition, checks for duplicates, then runs a **multi-agent, adversarially-reviewed** pipeline -- research → plan → extract → a bounded **QC loop** (review → fix → re-verify) -- presents changes for human approval, and finally captures learnings so each run improves the next.

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
- **QC loop — severity classes, fix-round cap, stop conditions, disputes, escalation:** `references/qc-loop.md`
- **Bundled checks:** `scripts/check-ics.mjs` (green-bar gate G5: recomputes every `.ics` time from the time-zone database) and `scripts/scope-guard.mjs` (the agent's permitted-file hook)
- **How the skill learns from each run:** `references/self-improvement.md` (+ append-only `references/learnings.md`)

Phases 1–5 are cheap gates and MUST complete before any agent team is spawned. The heavy machinery (Phases 6–9, 13) runs only once an edition is confirmed new, and only inside the run's own worktree (Phase 4b).

**Two entry points.** A normal run executes Phases 1–13. `--verify-live {EDITION_ID}` executes **only** Phase 14. It is used after the operator has pushed and the site has deployed.

## Phase 1: Input Parsing

Parse the invocation:

- **First argument:** path to the Philatex newsletter PDF.
- **`--max-cycles N`** (optional): the QC-loop cap on **fix rounds** (`MAX_CYCLES`, default **3**). It must be a positive integer.
- **`--notify`** (optional): the operator is running this unattended. Text them once each time a checkpoint (Phase 11) is presented. See Phase 11.
- **`--verify-live {EDITION_ID}`**: skip to Phase 14.
- **No PDF path given:** offer to fetch the newest Philatex from email (Phase 1b). If the operator declines, ask for a path before proceeding.

Example: `/philatex-update ~/Downloads/philatex-q3-2026.pdf --max-cycles 4`

## Phase 1b: PDF from Email (only when no path was given)

**REQUIRED SUB-SKILL:** `google-workspace`, the only permitted email route.
1. Search Gmail for the most recent message with a PDF attachment matching "Philatex". Show the operator the sender, date and filename, and confirm it is the right one before downloading.
2. Download it to the scratchpad. **Large attachments are silently truncated by `gws` at about 111 KB.** For anything larger, download through the Gmail API directly (curl the attachment endpoint, then base64url-decode it). Check the saved size against the attachment's size in the message.
3. Continue with that path. Phase 3 still identifies the edition from page 1, never from the email.

## Phase 2: File Validation

1. Check the file exists: `[ -f "$PDF_PATH" ]`
2. Check it has a `.pdf` extension (case-insensitive).
3. If validation fails, report the error and **STOP**.

## Phase 3: Edition Identification

1. Use the **Read** tool on the PDF (no `pages` parameter -- newsletters are under 10 pages).
2. On page 1, read the masthead: "THE PHILATEX" with its **date range** and year (e.g., "October – December 2026"). Older issues name the quarter instead (e.g., "Second Quarter 2026"); since 2026-Q4 the masthead may show only the months.
3. Derive the edition ID from the span of months the masthead covers:
   - **3-month span → quarterly, `YYYY-QN`** (Jan–Mar=Q1, Apr–Jun=Q2, Jul–Sep=Q3, Oct–Dec=Q4; or First=Q1 … Fourth=Q4 when the quarter is named), e.g. `2026-Q3`.
   - **2-month span → bimonthly, `YYYY-MM`**, where `MM` is the **first** month of the issue: January/February 2027 → `2027-01`, March/April 2027 → `2027-03`.
   - Any other span, or a masthead that disagrees with the page-1 calendar's months: **stop and ask** the operator. Do not guess a cadence.
4. Record the cadence (`quarterly` | `bimonthly`), the quarter name (quarterly) or the two month names (bimonthly), and the year. Naming for each cadence (PDF, aggregate ICS, `newsletters.json` fields) is in `references/data-contract.md`.

**The newsletter identifies itself on page 1. Do NOT rely on the filename.**

## Phase 4: Duplicate Check (gate)

1. Read `data/newsletters/newsletters.json`.
2. Compare the constructed edition ID against the `id` of every entry in `newsletters[]`.

**If a match is found:**
> "Edition {ID} already exists in newsletters.json. This newsletter has already been processed. No changes made."

**STOP.** Do not modify any files and do not spawn any agents.

**If no match:** report "Edition {ID} is new. Proceeding." and continue to Phase 4b.

Run the comparison against the freshly fetched default branch (`git fetch origin` then `git show origin/main:data/newsletters/newsletters.json`), as well as the local file. A stale checkout must not let an edition be processed twice.

## Phase 4b: Worktree (gate for all writes)

Every later phase writes site files only in the run's own worktree, never in the main checkout. The naming below works for both cadences: `2026-Q3` → `.claude/worktrees/philatex-2026-q3` on `content/2026-Q3`; `2027-01` → `.claude/worktrees/philatex-2027-01` on `content/2027-01`.
1. `git worktree add .claude/worktrees/philatex-{edition-id-lowercase} -b content/{EDITION_ID} origin/main`. If that path or branch already exists, stop and ask; it may hold an earlier run's work.
2. `npm ci` inside it. The green bar needs `node_modules`.
3. Set two absolute paths and pass **both** to every agent and workflow:
   - **`WORKTREE`**: the new worktree.
   - **`REVIEWS`**: the **main checkout's** `.planning/reviews/`. All run bookkeeping lives here: the contract, the proofreading report, the QC ledger and the snapshots.
4. Keep the source PDF outside the repo (the scratchpad is fine).

Two reasons bookkeeping sits outside the worktree: it survives the worktree being deleted, and `bin/ci` lints every `*.md` in the tree it runs in, so it must never lint the run's own notes.

**Shell commands do not inherit a directory.** Every shell call resets to the session's directory, which is usually the main checkout. So every command that touches the site starts with `cd "$WORKTREE" &&`, and `check-ics.mjs` always gets `--root "$WORKTREE"`. The same applies to every agent.

The worktree is disposable. Reject deletes it (Phase 12).

## Phase 5: Load Accumulated Learnings

Read `references/learnings.md` (relative to this skill). Hold its contents to pass into the research and extraction phases. This is how prior editions' lessons reach the current run. If the file is missing, continue with empty learnings.

## Phase 6: Research (GSD researcher + Context7 + adversarial)

Run the **research workflow** from `references/orchestration.md`. It fans out two researchers in parallel and ends with an adversarial completeness critic:

- `gsd-phase-researcher` persona (fallback `Explore`) — maps the exact current data shapes, ICS naming, and HTML section anchors the new edition must match.
- Context7 researcher — confirms current constraints for esbuild, lunr, and vanilla-calendar-pro (and resolves any iCalendar ambiguity against the existing template `.ics` files).
- Completeness critic (`xhigh`) — enumerates what the researchers missed that could break extraction or the build.

Pass `args = { editionId, cadence, quarter, months, year, learnings }` (`quarter` for a quarterly edition, `months` for a bimonthly one). Keep the returned `{ patterns, specs, gaps }` for the planning and extraction phases.

## Phase 7: Plan + Acceptance Contract — RED (sequential thinking + GSD plan-check)

This phase produces the **failing test** the rest of the run must pass. Nothing is extracted yet.

1. Use `mcp__sequential-thinking__sequentialthinking` to build the edition-specific plan from the research output. Decompose at least: DST regime (CDT/CST) for this edition's months, expected meeting count and span, non-standard meetings (picnic time, holidays, BOG), officer/address changes, and likely `[UNVERIFIED]` risks.
2. From the plan + the page-1 calendar + the schemas + learnings, author the **acceptance contract**: a list of checkable assertions (counts, per-meeting facts, schema, continuity, ICS, provenance, negative assertions, automated green bar), every one `status: RED`. Format and a full worked example: `references/acceptance-contract.md`. Write it to `$REVIEWS/{EDITION_ID}-acceptance-contract.md`.
3. Gate both with `gsd-plan-checker` (fallback `quality-engineer`, `xhigh`) doing goal-backward analysis: "if extraction satisfies this contract, will the data be correct AND complete? What assertion is missing, wrong, or back-filled from habit rather than the source?" Pay special attention to **negative assertions** (e.g., no picnic outside Q2) — that is where over-fit hides.
4. Revise with whatever the checker surfaces, then **freeze** the contract. Authoring the contract from the source — never from extractor output — is mandatory.

## Phase 8: Extraction — GREEN

Spawn the `philatex-newsletter-agent` with full context:

- `PDF_PATH`, `EDITION_YEAR`, `EDITION_ID`, `CADENCE`, and `QUARTER_NAME` (quarterly) or `EDITION_MONTHS` (bimonthly, e.g. `January,February`)
- `WORKTREE` and `REVIEWS` (Phase 4b)
- **Research findings** (`patterns`, `specs`, `gaps`), the **frozen plan**, and the **frozen acceptance contract** from Phases 6–7
- The **learnings** loaded in Phase 5

Files the agent must read before starting: its own instructions (`.claude/agents/philatex-newsletter-agent.md`), `data/schemas/newsletter.schema.json`, `data/schemas/meeting.schema.json`, `data/newsletters/newsletters.json`, `data/meetings/meetings.json`.

The agent's definition of done is **every contract assertion GREEN**. It handles extraction, validation, data-file updates, ICS generation, HTML updates, then runs the green bar — `build:js`, `build:search` + `build:search:embed`, `validate:data` (scoped to the new ids via `VALIDATE_NEW_IDS`), `test:quick`, and `check-ics.mjs` (G1–G5) — and reports each contract assertion as GREEN or still-RED. It does NOT commit. It returns a structured Step 9 summary.

## Phase 9: QC Loop — review → fix → re-verify (agent team)

**REQUIRED:** follow `references/qc-loop.md` exactly. It defines the severity classes, the fix round, the exit checks, disputes, and the ledger. In summary:

- **Review 0** is a **full pass** of the review workflow in `references/orchestration.md`, run as the test runner. Build `args.extractedFacts` from the **current working tree**: one entry per meeting, plus officer roster, new-member names and publish date. Pass the frozen contract.
- **Full passes add two reviewers**, run by the orchestrator in the main loop **before** the review workflow. Their findings go in as `args.externalFindings`, so they are verified by skeptics and synthesized into the same report:
  - **browser UAT** via the `browse` skill against the worktree's local server;
  - a **cross-model review** via the `codex` skill.

  Details are in `references/qc-loop.md`.
- **Classify** every verified finding and every RED assertion as blocker, major, minor or advisory. Blocker, major and minor are **all fixed**; advisory is logged only.
- **Fix round:** snapshot, then re-dispatch `philatex-newsletter-agent` in **fix mode** with the open items. It fixes from the source, may dispute with evidence, and never edits the contract. Then the orchestrator re-runs the green bar G1–G5 in full, and a **scoped** review re-verifies the result. A fix that breaks something it did not target is restored from the snapshot.
- **Repeat** until **CLEAN**: nothing open at blocker, major or minor, no unruled disputes, and a full pass to confirm it. Stop early and escalate on **DISPUTES ONLY**, **OSCILLATING** (a resolved issue came back), **STALLED** (the severity-weighted score did not drop), or **CAP** (`MAX_CYCLES` fix rounds used).
- Record every review in `$REVIEWS/{EDITION_ID}-qc-ledger.md`.

A fix-required verdict is **not** a reason to go to the checkpoint; it is a reason to run the next fix round. Fixing is not "extracting content yourself" (Rule 2): the fixer is the extraction agent, working from the source.

## Phase 10: Verification Gate

Run it in full after a CLEAN exit. After an escalation, go to Phase 11 in "incomplete" mode. **Before Approve can be offered in incomplete mode, checks 2 and 4 must pass**, so an Approve always commits a tree that has the expected files and is pushable. Confirm:

1. **Every acceptance-contract assertion is GREEN**, including the automated green bar `[G1]`-`[G5]`: `build:js`, search rebuild + embed, scoped `validate:data`, `test:quick`, `check-ics.mjs`.
2. All expected files were modified: `data/newsletters/newsletters.json` (new edition ID), `data/meetings/meetings.json` (the edition's new dates), ≥1 ICS in `data/calendar/`, the edition's aggregate ICS in `public/` (`sapa-qN-YYYY-meetings.ics` or `sapa-YYYY-MM-meetings.ics`), the source PDF copied to `public/SAPA-PHILATEX-…pdf` (filePath must resolve — `[S4]`), and `index.html` / `newsletter.html` / `meetings.html`.
3. The final full pass found no blocker, major or minor items.
4. **The local CI gate is green: `bin/ci` exits 0.** A clean checkpoint then means "pushable" as well as "clean". Because `bin/ci` runs the full build, and **the full build rewrites the HTML pages this update edits**:
   1. **Before:** in the worktree, record `git status --porcelain --untracked-files=all`, and a content hash (`shasum`) of every modified or untracked file. The `--untracked-files=all` matters: plain `--porcelain` collapses a new untracked directory to one `?? dir/` line, and a restore keyed on that line deletes every new file inside it. Copy each of those files to `$REVIEWS/{EDITION_ID}-qc/pre-ci/`.
   2. **Run:** `cd "$WORKTREE" && bin/ci`, and read its summary line.
   3. **Restore:**
      - `git checkout --` every tracked file that was clean before (the build also rewrites `package.json`);
      - copy back every file that was already modified;
      - delete every untracked file that was not there before.
   4. **Prove it:** recompute the hashes and compare them with step 1. They must match **exactly**. `git status` alone cannot show this, because a file that was already modified still reads `M` after being rewritten.

   Report the real counts (tests / assertions / failures / errors).

If a check fails, record it in the ledger as a review scoring 100 (a blocker), so STALLED compares against it. Then return to the Phase 9 loop for another fix round, which counts toward the cap. If no fix rounds remain, escalate as CAP.

## Phase 11: Human Checkpoint

The only **approval** point, and the only place contract disputes are ruled on. The skill's other pauses are small confirmations: a missing PDF path, which email to use, or an existing worktree. **With `--notify`:** when the checkpoint is presented, send the operator **one** text using the `text-message` skill, then wait. The text gives the edition, the mode (clean or incomplete, with the exit reason), and whether Approve is available. Send no other texts for that checkpoint. It runs in one of two modes:
- **clean**: after a CLEAN exit and a passed Phase 10.
- **incomplete**: after a DISPUTES ONLY, OSCILLATING, STALLED or CAP exit. Put the **QC status block** from `references/qc-loop.md` above 11a.

Present, in order:

**11a. Adversarial Review Report** — the **latest** synthesized report, verbatim, at the top so the human sees what the panel caught before anything else. Follow it with a QC summary line: fix rounds used, and items fixed by severity. Never show a report that predates the current working tree.

**11b. Key-Facts Summary** — 10 FIXED categories, red-flags-first, as a numbered list under 20 lines:
1. `[UNVERIFIED] count` — "0 items" or "N items -- REVIEW REQUIRED"
2. `Schema validation status` — "All passed" or "N warnings: {details}"
3. `Newsletter ID + title`
4. `Edition date range` (the quarter's or the two months')
5. `Meetings added` — count and date span
6. `Officer changes` — names/roles or "No changes"
7. `New members` — count and names or "None"
8. `Announcements` — count and brief list
9. `TSDA shows` — count and date range or "None"
10. `Files modified` — count with category breakdown

If item 1 or 2 is non-zero/non-pass, or the checkpoint is in **incomplete** mode, add a visible warning line above the summary:
```
--- RED FLAGS DETECTED -- Review items above carefully ---
```

**11c. Changes by Category** — group modified files (Data / HTML / ICS / Build) with `git diff --stat` line counts and a one-line semantic annotation each. Collapse ICS to a single summary line.

**11d. Proposed Commit Message** — a conventional commit, e.g. `content(Q3-2026): add Third Quarter 2026 newsletter update`, or for a bimonthly edition `content(2027-01): add January/February 2027 newsletter update`. In incomplete mode, the body lists every open major/minor item under `Known open issues:`. In either mode, it lists every operator correction and ruling applied.

**11e. Decision Prompt** — offer these options:
- **clean mode:** **Approve** (commit) or **Reject** (revert).
- **incomplete mode, no open blockers and no unruled disputes:** **Continue** (`MAX_CYCLES` more fix rounds), **Approve** (publish with the open issues listed), or **Reject**.
- **incomplete mode, open blockers:** **Continue** or **Reject**.
- **incomplete mode, any unruled dispute:** a ruling (amend / uphold) on each dispute, or **Reject**.

Never offer Approve while a blocker, a RED assertion, or an unruled dispute is open. The full option table and the Continue semantics are in `references/qc-loop.md`.

Free-form text is handled as follows:
- **A correction, or an "amend" ruling**, re-enters the Phase 9 loop as a new revision with a fresh budget. Follow "Operator corrections" in `references/qc-loop.md`.
- **Guidance with no fact in it** (e.g. "only touch the Nov 13 file") is passed to the fixer on Continue.

After either, re-present the full checkpoint from 11a with the new report. This operator loop has no limit. If the operator is absent, the checkpoint waits. Only with `--notify` is a text sent, and it is the single text above. Never choose on their behalf.

## Phase 12: Resolve

**On Reject — clean revert (atomic):** the whole run lives in its own worktree, so reverting means removing it.
1. Confirm the worktree holds only this run's work: `git -C "$WORKTREE" log origin/main..HEAD` shows no commits.
2. `git worktree remove --force "$WORKTREE"` and `git branch -D content/{EDITION_ID}`. The bookkeeping in `$REVIEWS` is untouched, and Phase 13 reads it.
3. Report: "All changes reverted. The run's worktree and branch are deleted. No files were committed."

Never partially revert. The update is one transaction.

**On Approve — atomic commit:**
1. List what changed: `git -C "$WORKTREE" status --porcelain`. Keep only permitted files and build outputs. Anything else is a scope breach: stop and report it; don't stage it.
2. Cross-check the list against the union of the Phase 8 Files Created/Modified and every fix report's Files Touched. A mismatch in either direction is reported before committing.
3. `git add <file>`, one path at a time (NEVER `git add .` / `-A`). For `dist/`, stage bundle files whose content changed. Skip the timestamp-only `dist/build-info.json` and `dist/bundle-analysis.json` unless the bundle list itself changed (data-contract §E).
4. `git commit` on `content/{EDITION_ID}` using the Phase 11d message, including the `Known open issues:` body when approving in incomplete mode.
5. Report: "Changes committed: <hash> on branch content/{EDITION_ID} (worktree <path>). When ready: push, open a PR, merge, and after the site deploys run `/philatex-update --verify-live {EDITION_ID}`." Pushing re-runs `bin/ci` through the local CI hook, which rewrites the worktree's HTML after the commit. That is harmless, because the commit is already made; the worktree can simply be removed once merged.

Do NOT push. The operator chose "publish = commit only", and controls deployment.

## Phase 13: Retrospective & Self-Improvement

After Phase 12 resolves (either way), run the self-improvement protocol in `references/self-improvement.md`. **Skill edits never go into the content commit, and never into the main checkout.** Create a separate worktree: `git worktree add .claude/worktrees/philatex-learnings-{edition-id-lowercase} -b skill/philatex-learnings-{EDITION_ID} origin/main`. Append and promote there, commit, and report the branch for the operator to review. Evidence is read from `$REVIEWS`:

1. Gather evidence: the QC ledger (every item fixed, disputed, oscillating or regressed), the final review report, the human's corrections and contract rulings, contested facts, and any PDF format-drift notes.
2. Use `mcp__sequential-thinking__sequentialthinking` to separate durable rules from one-off quirks.
3. **Always** append every item to `references/learnings.md`.
4. For items meeting the promotion bar (recurring ≥2 editions OR human-confirmed) run the **over-fit critic** (`xhigh`); apply only `promote` verdicts to the target file (SKILL.md, `references/data-contract.md`, the persona roster, or the agent).
5. Report what was logged and what was promoted/proposed as the final line of the run.

**Guardrails are never self-edited** (see Important Rules 1a, 4–12, 14 and 15). They change only by direct human instruction.

## Phase 14: Verify Live + Draft Announcement (`--verify-live {EDITION_ID}` only)

Run this after the operator has pushed, merged and deployed. It verifies the real site before anything is announced.
1. **REQUIRED SUB-SKILL:** `browse` (gstack). Use a **fresh browser context** (the site has a service worker, and a cached worker can serve stale pages even with a new URL). Load `https://sastamps.org/` with a cache-busting query (`?v=<timestamp>`), then `/newsletter.html` and `/meetings.html`. Confirm:
   - the new edition's banner and PDF link are on the homepage;
   - the PDF URL returns 200, and its size equals `public/SAPA-PHILATEX-…pdf` on `origin/main`;
   - the meeting calendar shows the new edition's dates;
   - each aggregate and individual `.ics` link returns 200;
   - the homepage's dated sections (announcements, TSDA shows) show this edition;
   - there are no **new** console errors (compare against the previous edition's pages; errors that predate this edition are reported but don't block).

   Report each check with its evidence. A 404 or stale page is **not** a pass.
   - **Stale page: lag or defect?** Compare the live page with the same file on `origin/main`. If `origin/main` already has the new content, it is deploy lag. Wait about two minutes (a single `Monitor` until-loop or one scheduled wake-up, **never** `sleep`) and retry once.
   - If `origin/main` itself is stale, it is a **content defect** the QC loop missed. Report it; it needs a new run or a fix branch.
2. **Log it.** Append the outcome of every live check, pass or fail, to `references/learnings.md` in a `philatex-learnings` worktree (as in Phase 13). A defect that reached production is the strongest learning a run can produce.
3. **Only if every check passes:** **REQUIRED SUB-SKILL:** `google-workspace`. Create a **Gmail draft addressed to the operator** (for them to forward). It announces the new Philatex: title, the PDF link, the next three meetings, and any highlighted program. Use the operator's own email voice. **Never send it.** Report the draft's subject and link.
4. If any check fails, report it. Do not draft. An in-chat request to email the membership directly is answered with the draft, never a send. The operator forwards it themselves.

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

BUILD OUTPUTS (written only by the green bar's npm scripts, never
edited by hand; excluded from the out-of-scope check [N2]; snapshotted
and committed with the update):
  search.html                      (build:search:embed re-embeds the index)
  dist/**                          (build:js, build:search)

RUN BOOKKEEPING — in the MAIN checkout's .planning/reviews/ ($REVIEWS), never in
the worktree, never committed with the site:
  {EDITION_ID}-acceptance-contract.md   (orchestrator only: rulings/corrections)
  {EDITION_ID}-newsletter-review.md     (the agent's proofreading report — the only
                                         bookkeeping file the agent may write)
  {EDITION_ID}-qc-ledger.md, {EDITION_ID}-qc/   (orchestrator only)

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
1a. **Contract-first (RED before GREEN).** No extraction begins until a frozen acceptance contract exists, authored from the source PDF/schemas — never back-filled from extractor output. A contract written after extraction is a violation; delete it and re-derive from the source. After freezing, an assertion changes **only** through an operator ruling or correction, recorded as `source: operator-ruling` / `source: operator-correction`. Any RED assertion blocks Approve.
2. **This skill does NOT extract content itself** — Phase 8's agent does. **It does NOT commit** until Phase 12 approval.
3. **It does NOT ask the user what edition the PDF is** — it reads page 1.
4. **The duplicate check (Phase 4) is mandatory and gates all fan-out.** Never skip it, even if the user says "just update it."
5. **The permitted-file list is the source of truth for scope.** Out-of-scope changes are flagged, not performed.
6. **Verify before the checkpoint (Phase 10).** A clean checkpoint requires every assertion GREEN, the green bar passing, and a final full review pass with no blocker, major or minor items. Anything short of that is presented in **incomplete** mode, never as clean.
7. **The human checkpoint (Phase 11) is MANDATORY.** Never skip it, even with zero `[UNVERIFIED]` markers and a clean review.
8. **On rejection, revert ALL changes; on approval, commit ALL changes atomically** with explicit `git add` paths.
9. **The QC loop is bounded; the operator loop is not.** The automatic loop stops after `MAX_CYCLES` fix rounds (default 3), or earlier on DISPUTES ONLY / OSCILLATING / STALLED, and escalates to the operator. Operator-driven Continue and corrections have no limit.
10. **Never publish with an open blocker or an unruled dispute.** Approve is not offered while any blocker, RED assertion or unruled dispute is open, whatever the time pressure or number of rounds.
11. **The contract is never edited to make a check pass, and the data is never changed to satisfy a wrong assertion.** Contract disputes go to the operator for a ruling. The orchestrator rewrites assertions only to record an operator ruling or correction.
12. **Every fix round re-runs the full green bar, and every review is recorded in the ledger.** A clean result must come from a full review pass, never from a scoped one.
13. **Self-improvement (Phase 13) always logs, rarely promotes.** Promotion requires recurrence-or-authority AND an over-fit critic's `promote` verdict. Guardrails (rules 1a, 4–12, 14 and 15) are never self-edited.
14. **All site writes happen in the run's worktree (Phase 4b).** The main checkout is never modified by a run, apart from its bookkeeping in `$REVIEWS`.
15. **Nothing is sent or announced before the live site is verified (Phase 14).** The announcement is a draft to the operator, never a send.
