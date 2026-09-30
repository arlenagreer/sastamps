# Philatex Update — QC Loop (review → fix → re-verify)

The QC loop is SKILL.md Phase 9. It begins once extraction (Phase 8) is done. It repeats **review → triage → fix → re-verify** until the update is clean or a stop condition fires, then hands the operator a status report at the Phase 11 checkpoint. The loop never commits and never skips the checkpoint.

## Severity classes

Every verified finding and every RED contract assertion gets exactly one class.

| Class | What belongs here | Gates the loop? | Publishable while open? |
|---|---|---|---|
| **blocker** | Any RED contract assertion. Wrong meeting date/time/type/cancellation. Wrong DST offset in an `.ics`. A failure in schema or `validate:data`. A red green-bar gate (G1–G5). The newsletter PDF missing at its `filePath`. A file modified outside the permitted scope. The declared build outputs, `search.html` and `dist/**`, are not out of scope. A review dimension that returned no real analysis (see step 2). | Yes | **Never** |
| **major** | Member-visible text that disagrees with the source (PDF or operator correction), covering names, titles, officers, announcements and TSDA shows. A missing section item. Stale prior-quarter content on any page. A wrong or missing `[UNVERIFIED]` marker. | Yes | Yes, listed in the commit |
| **minor** | Typos, formatting, inconsistent date/number style, and small wording drift that does not change meaning. | Yes | Yes, listed in the commit |
| **advisory** | Style suggestions, improvements for future editions, anything the source does not require. | No — logged only | n/a |

**Weights** for progress tracking: blocker = 100, major = 10, minor = 1.

## Definitions

- **Open set.** All unresolved blocker, major and minor items: verified findings plus RED assertions. **Disputed** items are held apart (see "Disputes").
- **Resolved.** A later review confirms the item is gone. The fixer saying "fixed" does not resolve an item.
- **Fingerprint.** `{file}|{location}|{title}` (the `FINDING` fields), normalized (lowercase, whitespace collapsed). It is how an issue is recognized as the same issue from one review to the next.
- **One defect, one item.** A finding that describes the same underlying fact as a RED assertion (same date, or same field) merges into that assertion and is scored once. A finding about the same fact as a held dispute joins the dispute; it does not open a new item.
- **Score.** The sum of weights over the open set.
- **Full pass.** The review workflow runs all four dimensions, the contract verifier over **every** assertion, and the ≥3-lens skeptic refutation over every high-risk fact **and every negative assertion**. `extractedFacts` is rebuilt from the **current working tree** before every full pass, never reused from the Step 9 summary. **Before** invoking the workflow, the orchestrator runs two more reviewers in the main loop, one after the other. Their findings are passed in as `args.externalFindings`, so the workflow verifies them with skeptics and synthesizes them into the one report shown at 11a:
  - **browser-uat.** Uses the `browse` skill. Serve the worktree: `cd "$WORKTREE" && npm start`, which uses port 3000. If that port is taken, don't stop whatever holds it (it is a shared resource). Use `npx http-server "$WORKTREE" -p <free port>` instead. Load `index.html`, `meetings.html` and `newsletter.html`. Verify the thing this edition changed, not just that pages return 200:
    - the new newsletter banner and its PDF link open;
    - the calendar shows the new quarter;
    - the homepage's dated sections (announcements, TSDA) are this quarter's;
    - the `.ics` links resolve;
    - site search finds the new newsletter;
    - there are no console errors.

    A guessed route that 404s is a finding, not a pass. Stop the server afterwards.
  - **cross-model.** Uses the `codex` skill. Give it the working-tree diff, the PDF path and the frozen contract, and ask for defects. Because it is a different model family, it catches blind spots the Claude reviewers share.

  Each must also return a `checked` summary (step 2 applies to them too).
- **Scoped pass.** Browser-uat and cross-model do not run on a scoped pass. Every item open at the last review is re-verified. Every assertion over a changed file is re-verified. The dimensions mapped from the changed files (table below) are run. Diff-safety runs on every pass. Skeptics run only for facts whose value changed.

| Changed file | Dimensions a scoped pass runs |
|---|---|
| `data/meetings/meetings.json`, `data/calendar/*.ics`, `public/*.ics` | data-integrity, ics-time-math |
| `data/newsletters/newsletters.json` | data-integrity, content-fidelity |
| `index.html`, `newsletter.html`, `meetings.html`, `about.html`, `contact.html` | content-fidelity |
| any file | diff-safety (always) |

- **Fix rounds and the cap.** `MAX_CYCLES` is the number of **fix rounds** the loop may run before it escalates. The default is **3**; `--max-cycles N` overrides it. A fix round is: snapshot → fix → green bar → review. `k` counts fix rounds done in this revision, starting at 0. `CAP` starts at `MAX_CYCLES` and rises by `MAX_CYCLES` each time the operator chooses Continue. The status block reports `k of CAP`.

## The loop

**Review 0.** Take the extraction result through a **full pass** (steps 1–4 below, with k = 0). Then, while no exit check fires:

**Fix round k+1:** steps 5–7, then increment k and run steps 1–4 again as a **scoped pass**.

1. **Review.** Run the review workflow (`orchestration.md`) with `args.mode` set to `full` or `scoped`. Pass the frozen contract and any `args.operatorCorrections`.
2. **Review completeness.** Every dimension must return a non-empty `checked` field: what it actually examined (files, pages, facts). Zero findings together with a real `checked` is a clean dimension. An empty or placeholder `checked`, or one that is not about this edition, means the dimension did not run.
   - Re-run it once.
   - If it fails again, record a **blocker** `review-incomplete:{dimension}`.
   - A `review-incomplete` item is **never sent to the fixer**, since there is nothing to fix. Instead, force that dimension into every later pass until it returns real output, which resolves the item.

   An unreviewed dimension can never produce a clean result.
3. **Triage and regression check.**
   - Classify every item and fingerprint it.
   - **Touched** means the file actually differs from the round's snapshot (`cmp`). Don't rely on the fixer's self-report.
   - A **regression** is any of the following in a touched file: a **new** blocker, major or minor fingerprint (never advisory) whose location lies in lines the round actually changed (diff against the snapshot); a previously GREEN assertion now RED; or a green-bar gate that is now red. Reviewer noise about unchanged lines is triaged normally and never triggers a restore. For each regressing file:
     - Restore it from the round's snapshot.
     - Re-run the green bar.
     - Run a scoped re-check of the restored files. It does not use a fix round, and it resets the file's own state, so the fixes the round made in other files stand.
     - Label the new item `regressed` (caused by the fix for `<item>`). If the re-check shows it gone, it is resolved. Every later fix dispatch carries the note: "fixing `<item>` damaged `<file>`; do not regenerate files outside the item."
   - **Adjudicate disputes** from the last fix report (see "Disputes").
   - Append the review's section to the ledger now. Complete it after step 7.
4. **Exit checks, in this order.** The first match ends the loop.
   1. **CLEAN**: the open set is empty, there are no unruled disputes, and this review was a **full pass**. Go to Phase 10.
   2. **CONFIRM**: the open set is empty, but this review was scoped. Run a **full pass** now. It does not use a fix round. Its result **replaces** this review; re-run step 3 and restart these checks from 4.1.
   3. **DISPUTES ONLY**: the open set is empty, the last review was a full pass, and one or more disputes are unruled. Escalate.
   4. **OSCILLATING**: an item that was **resolved** in an earlier review **of this revision** is open again (same fingerprint). Escalate. A correction that deliberately reopens a fact from an earlier revision is not oscillation.
   5. **STALLED**: k ≥ 1, and the score is not strictly lower than the previous review's score. "Previous" means the last review recorded before this one; a CONFIRM pass replaces its scoped review rather than adding a new entry. Escalate.
   6. **CAP**: k ≥ CAP. Escalate.

   When escalating, report **every** check that matched, not just the first. For example: `STALLED + CAP`.
5. **Snapshot.** Copy **every** permitted file this run created or modified, plus the build outputs (`search.html` and changed `dist/` files), from `$WORKTREE` to `$REVIEWS/{EDITION_ID}-qc/r{revision}-round-{k+1}/`, not just the files the fix is expected to touch. They are small, and a fixer can regenerate files nobody predicted. The revision is 0 until the first operator correction.
6. **Fix.** Dispatch `philatex-newsletter-agent` in **fix mode** (see its "Fix Mode" section). Pass it:
   - the open set, sorted blocker → major → minor;
   - `PDF_PATH`, the frozen contract, and any `OPERATOR_CORRECTIONS` / `OPERATOR_GUIDANCE`.

   An item returned `rebuild-only` (a build output whose source is already correct) is resolved by the green bar in step 7 and re-verified at the next review.

   An item that survived a previous "fixed" claim is re-sent with that claim **and** the reviewer's evidence that it is still present. The fixer must take a different approach, not repeat the same edit.
7. **Green bar.** The orchestrator runs G1–G5 **in full** after every fix round: `build:js`, `build:search` + `build:search:embed`, scoped `validate:data`, `test:quick`, and `node "$WORKTREE/.claude/skills/philatex-update/scripts/check-ics.mjs" --edition {EDITION_ID} --root "$WORKTREE"`. Every command runs as `cd "$WORKTREE" && …`. The fixer does not run them. A red gate is a blocker that the next review picks up.

**Phase 10 fails after CLEAN?** Record the failure in the ledger as its own review, scored as a blocker (100), so the next STALLED comparison uses it as the baseline. If a fix round remains, run it. Otherwise, escalate as CAP.

## Disputes

A **dispute** is a claim, backed by evidence, that the checker is wrong rather than the data. Disputes sit outside the fix set. They are never "fixed", never silently dropped, and never CLEAN. Each one reaches the operator.

- **Finding dispute.** The fixer shows, with a PDF page and passage, that a finding misreads the source.
- **Contract dispute.** The evidence says a frozen assertion is itself wrong. For example, the contract missed a footnote. The fixer may raise one even when it was not handed a related item.

The orchestrator adjudicates at step 3, in the review that follows the fix report:
- A **finding dispute** goes to an independent skeptic (`xhigh`). If the skeptic upholds the finding, the item returns to the open set. If it upholds the dispute, the dispute is held for the operator.
- A **contract dispute** is **always** held for the operator, with the skeptic's view of the evidence attached. The contract is frozen, so only the operator can decide it is wrong. Nothing a skeptic says may drop it.

The ledger records each dispute, its evidence, and the skeptic's verdict.

**Neither the fixer nor the orchestrator may edit the contract on their own authority, or change the data to satisfy a wrong assertion.** The operator **rules** on every held dispute at the checkpoint:
- **amend**: the ruling is treated exactly like an operator correction (below).
- **uphold**: the assertion or finding stands, and the finding returns to the open set. An upheld *contract* dispute over data that already satisfies the assertion leaves nothing to fix, so it is simply closed.

After the operator rules:
- If **any** ruling in the set is an amend, a new revision starts (below), and the upholds in the same set are applied within it.
- If **every** ruling is an uphold, return to the exit checks:
  - an empty open set goes through **CONFIRM**, then Phase 10;
  - anything upheld into the open set gets a fix round, if one remains;
  - otherwise, re-present the checkpoint with the ordinary options.

**Approve is not offered while any dispute is unruled.** A dispute may conceal a blocker-class error, so it has to be ruled first.

## Escalation = the Phase 11 checkpoint in "incomplete" mode

When the loop exits on anything other than CLEAN, present the Phase 11 checkpoint with this **QC status block** above 11a:

```
QC LOOP: {matched checks, e.g. STALLED + CAP} after {k} of {CAP} fix rounds (revision {r})
Score by review: {s0} → {s1} → …
Open: {b} blocker · {M} major · {m} minor · {d} disputed   (advisory: {a}, not gating)
{one line per open or disputed item: severity · fingerprint · why (oscillating / regressed / fix failed / disputed: evidence)}
Fixed during QC: {n} this revision, {N} whole run ({blocker/major/minor breakdown})
```

11a–11d follow as usual. The 11d body lists open items **and** ruled disputes. The options depend on the state:

| State | Options offered |
|---|---|
| No open blockers, no unruled disputes | **Continue**, **Approve** (publish; open majors/minors listed in the commit), **Reject** |
| Open blockers, no unruled disputes | **Continue**, **Reject**. **Approve is not offered.** |
| Any unruled dispute | A ruling on each dispute (**amend** / **uphold**), or **Reject**. Continue is not offered until every dispute is ruled on, because fixing cannot resolve a dispute. **Approve is not offered.** |

**Continue:**
- `CAP` rises by `MAX_CYCLES`.
- The loop resumes **with a fix round, not an exit check**, so at least one round always runs.
- `k`, fingerprints and score history carry over. The first review after Continue is compared against the review that escalated, so a round that makes no progress hands control back straight away. That is intended: the operator can Continue again with new guidance.
- Any text the operator adds is passed to the fixer as `OPERATOR_GUIDANCE`.
  - Guidance that states no fact, such as "fix only the Nov 13 file", does not amend the contract.
  - Guidance that names a defect the open set lacks adds it as an item, classified by the table.

If the operator is absent, the checkpoint waits. Notify them through their standing instructions and do not choose on their behalf.

## Operator corrections (and "amend" rulings) re-enter the loop

An operator correction is **ground truth, even where it contradicts the PDF**, because the club may have changed plans after printing.

1. **Clarify first.** If the correction leaves a schema-required field undetermined, ask one clarifying question at the checkpoint before applying it. Examples: a new event with no time, or a label that collides with an enum (a "holiday party" is `social`, because `holiday` means cancelled).
2. **Amend.** The orchestrator records the operator's words and rewrites **every** assertion they affect (per-meeting facts, counts, ICS, provenance, negative assertions). Each rewritten line gets `source: operator-correction` (or `operator-ruling`), with the original struck through beside it, and is reset to RED. This is the only way the orchestrator may touch the contract.
3. **Revision.** Increment the revision `r`. The ledger and the snapshot directories use `r{r}`, so nothing from an earlier revision is overwritten. The budget is fresh: k = 0 and CAP = MAX_CYCLES.
4. **Apply.** Run one **apply round** (snapshot → fix → green bar), with the correction passed as `OPERATOR_CORRECTIONS`. It does not count toward k. Then review with a **full pass**: that is Review 0 of the new revision, and the loop continues as usual.
5. **Check against the correction.** Every reviewer and skeptic checks corrected facts **against the correction, not the PDF**, and confirms each one is consistent across `meetings.json`, `newsletters.json`, both `.ics` forms, the HTML and the search index. A site that deliberately differs from the PDF on a corrected fact is not a finding.
6. **Re-present.** Show the checkpoint again with the **new** report, labelled `revision {r}`. Never show a report generated before the correction. The commit body (11d) lists every correction and ruling in **either** mode, clean or incomplete.

## The ledger

`$REVIEWS/{EDITION_ID}-qc-ledger.md` (in the main checkout) is bookkeeping, like the contract. It is also where the **contract scoreboard** lives: the GREEN/RED status of each assertion per review. The contract file itself is never edited for status. Write one section per review:

```markdown
## r{r} · Review {k}{ (confirm) when a CONFIRM pass replaced the scoped one} — {full|scoped} pass — score {s}
| Fingerprint | Severity | Status (open/resolved/disputed/regressed/advisory) | Evidence / skeptic verdict |
|---|---|---|---|
Scoreboard: {assertion → GREEN|RED}
Fix round {k+1}: {file → item}, Green bar: G1 {✓|✗} G2 … G5, Regressions: {…}, Exit check: {none|CLEAN|…}
```

Phase 13 reads the ledger. An item fixed in the QC loop is a defect the extractor produced, which makes it a learning candidate. Oscillations, regressions and disputes are the strongest candidates. An operator correction about **this edition's facts**, such as a cancelled meeting, is logged but is not a rule to promote.
