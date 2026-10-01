# Philatex Update — Acceptance Contract (the TDD "test")

The acceptance contract is the **RED** artifact of the skill's TDD methodology (`superpowers:test-driven-development`). It is written in Phase 7 **before** any extraction, from the PDF (page 1 calendar especially) + the JSON schemas + the frozen plan + accumulated learnings. It is a list of **checkable assertions** the extracted data MUST satisfy. Extraction (Phase 8) exists only to turn these GREEN; the adversarial review (Phase 9) is the test runner that tries to prove any claimed-GREEN assertion is still RED.

**Iron rule:** no extraction begins until a frozen contract exists, and the contract is authored from the source — never back-filled from whatever the extractor happened to produce. A contract written after extraction is not a test; it is a rationalization.

## Where it lives

`$REVIEWS/{EDITION_ID}-acceptance-contract.md`: the **main checkout's** `.planning/reviews/`, next to the proofreading report and outside the run's worktree. It is a run artifact, not website source, and is not in the permitted-file scope. Only the orchestrator writes it (the scope-guard hook blocks the agent).

## Assertion shape

```markdown
- **[A-id]** {statement} — source: {calendar-table | schema | plan | learnings | continuity} — check: {how to verify} — status: RED
```

Every assertion is authored `status: RED`, and **the file is never edited to flip it**. Per-review GREEN/RED lives in the QC ledger's scoreboard. An assertion is GREEN only when the check passes. A RED assertion is a **blocker** in the QC loop (`qc-loop.md`), and Approve is never offered while one is open.

**After freezing**, an assertion changes only by an operator ruling (on a contract dispute) or an operator correction. The rewritten line carries `source: operator-ruling` or `source: operator-correction`, keeps the original struck through beside it, and resets to `status: RED`. The fixer and the orchestrator never edit the contract on their own.

## Assertion categories (derive every applicable one)

1. **Counts** — exact totals from the calendar table, **over the edition's own span** (three months for `YYYY-QN`, two months for `YYYY-MM`). Never carry a per-quarter number such as "13 meetings" into a bimonthly contract; count the calendar. Totals cover: total meetings, holidays/cancelled, BOG/business, auctions, bourses/social, regular/program, picnic, special/exhibition.
2. **Per-meeting facts** — one assertion per meeting: `{date} = {type}` (+ `cancelled` for holidays, + `bogStart` for BOG). These are the highest-risk facts the skeptic panel refutes.
3. **Schema** — every newsletter and meeting entry validates against `data/schemas/*.schema.json`; all enums in range. Plus the newsletter PDF exists at `public/<filePath>` (a missing PDF = **blocker**; the extractor must copy the source PDF there).
4. **Continuity** — new meeting dates strictly after the last existing date in `meetings.json`; no duplicates; chronological.
5. **ICS** — one individual `.ics` per meeting + one edition aggregate (`public/sapa-qN-YYYY-meetings.ics` for quarterly, `public/sapa-YYYY-MM-meetings.ics` for bimonthly); UTC math correct for the DST regime of each date in the edition's months; cancelled = 1-minute duration; UID/PRODID conventions per `data-contract.md` §C.
6. **Provenance** — every below-high-confidence field carries `[UNVERIFIED]`.
7. **Negative assertions** — what must NOT appear (e.g., "no picnic this quarter"; "no file modified outside permitted scope"). Negative assertions are where over-fit hides; derive them from the calendar, **including footnotes under the calendar table**, not from habit. Mark each one `negative: true`, so the review panel puts it through the ≥3-skeptic challenge. Negative assertions normally come from the calendar; the one standing exception, below, comes from an operator ruling instead, and the panel verifies it against that ruling and the edition's data rather than refuting it from the PDF.
   - **Standing: no bourse table fee.** A club officer confirmed on 2026-09-30 that SAPA charges no dealer-table fee (provisional until he confirms it at the next club meeting). The extraction agent is instructed never to carry one forward. **If the source is silent on table fees**, author every edition:
     `- **[Nx]** NO dealer-table fee or table price on any bourse meeting this edition — source: operator-ruling (2026-09-30) — check: in $WORKTREE, read every field (title, topic, description, specialNotes, agenda, requirements) of each bourse entry in data/meetings/meetings.json, and the DESCRIPTION of its individual and edition .ics; no table fee or table price appears. Other amounts (a lot-value minimum, a gift-exchange limit) are not table fees — negative: true — status: RED`
     **If the source does state a fee**, author a positive per-meeting assertion with that amount instead, citing the newsletter page. If the officer reverses the confirmation, retire this assertion by operator ruling.
8. **Automated green bar** — `build:js` exits 0; `build:search` + `build:search:embed` refresh the search index; `validate:data` (scoped to the new ids via `VALIDATE_NEW_IDS`) passes with 0 hard errors; `test:quick` passes; `scripts/check-ics.mjs --edition {ID}` exits 0.

## Bimonthly editions (`YYYY-MM`)

The assertion shape is the same. What changes:

- **Counts** cover two months. January/February 2027 has 9 Fridays, for example, against the 13 of a typical quarter.
- **[S1]** reads: id `2027-01`, `months` `["January", "February"]`, no `quarter`, year 2027, publishDate `2027-01-01`, and it validates.
- **[S4]** reads: the PDF exists at `public/SAPA-PHILATEX-January-February-2027.pdf`.
- **[I1]** names `public/sapa-2027-01-meetings.ics` as the aggregate.
- **[G5]** runs `check-ics.mjs --edition 2027-01`.
- **Negative assertions** come from the two months on the calendar. Do not carry over a quarter's habits, such as "the picnic is Q2".

## Worked example — `2026-Q3`

Derived from the page-1 calendar (July/August/September 2026), schemas, and learnings. All dates fall in CDT (Q3). Abbreviated:

```markdown
# Acceptance Contract — 2026-Q3 (The Philatex, Third Quarter 2026)

## Counts
- **[C1]** Exactly 13 meetings — source: calendar-table — check: meetings.json new-entry count — status: RED
- **[C2]** Exactly 2 cancelled/holiday (Jul 3, Sep 4) — source: calendar-table — status: RED
- **[C3]** Exactly 3 BOG/business (Jul 10, Aug 7, Sep 11) — source: calendar-table — status: RED
- **[C4]** Exactly 3 auctions (Jul 17, Aug 14, Sep 18) — source: calendar-table — status: RED
- **[C5]** Exactly 3 bourse/social (Jul 24, Aug 21, Sep 25) — source: calendar-table — status: RED
- **[C6]** Exactly 2 stamp-program/regular (Jul 31, Aug 28; both "TBD or Bourse") — source: calendar-table — status: RED

## Per-meeting
- **[M1]** 2026-07-03 = holiday, cancelled:true (Independence Day) — status: RED
- **[M2]** 2026-07-10 = business, bogStart 7:15 PM ("Show and Tell") — status: RED
- **[M3]** 2026-07-17 = auction — status: RED
- **[M4]** 2026-07-24 = social (Bourse) — status: RED
- **[M5]** 2026-07-31 = regular, [UNVERIFIED] ("TBD or Bourse") — status: RED
- **[M6]** 2026-08-07 = business, bogStart 7:15 PM — status: RED
- **[M7]** 2026-08-14 = auction — status: RED
- **[M8]** 2026-08-21 = social (Bourse) — status: RED
- **[M9]** 2026-08-28 = regular, [UNVERIFIED] ("TBD or Bourse") — status: RED
- **[M10]** 2026-09-04 = holiday, cancelled:true (Labor Day) — status: RED
- **[M11]** 2026-09-11 = business, bogStart 7:15 PM — status: RED
- **[M12]** 2026-09-18 = auction — status: RED
- **[M13]** 2026-09-25 = social (Bourse) — status: RED

## Schema / Continuity / ICS / Provenance
- **[S1]** newsletter entry id "2026-Q3", quarter "Third", year 2026, publishDate "2026-07-01", validates — status: RED
- **[S2]** all 13 meeting entries validate (type enum, required fields) — status: RED
- **[S4]** the PDF exists at public/SAPA-PHILATEX-Third-Quarter-2026.pdf (filePath resolves; links don't 404) — status: RED
- **[H1]** index.html "Club News & Announcements" cards + "Upcoming TSDA Stamp Shows" table (caption + rows) reflect this edition; no stale prior-quarter content remains on any page — status: RED
- **[K1]** all new dates > last existing meetings.json date; chronological; no dupes — status: RED
- **[I1]** 13 individual .ics (UTC, DTSTART=meetingStart) + 1 public/sapa-q3-2026-meetings.ics (local, DTSTART=doorsOpen); UID fixed T193000Z; cancelled = 1-min; LF endings — status: RED
- **[P1]** every <high-confidence field carries [UNVERIFIED] (expect ≥2: M5, M9) — status: RED

## Negative
- **[N1]** NO picnic this quarter (Q3 has none; the picnic is Q2) — source: calendar-table + learnings — negative: true — status: RED
- **[N2]** NO file modified outside permitted-file scope (declared build outputs `search.html` and `dist/**` excepted) — negative: true — status: RED

## Green bar
- **[G1]** npm run build:js exits 0 — status: RED
- **[G2]** npm run build:search && npm run build:search:embed succeed (search index refreshed + re-embedded) — status: RED
- **[G3]** VALIDATE_NEW_IDS=<2026-Q3 + the 13 meeting ids> npm run validate:data exits 0 (0 hard errors) — status: RED
- **[G4]** npm run test:quick passes — status: RED
- **[G5]** node .claude/skills/philatex-update/scripts/check-ics.mjs --edition 2026-Q3 --root "$WORKTREE" exits 0 (every .ics time recomputed from America/Chicago rules) — status: RED
```

The extractor (Phase 8) must satisfy every assertion; the panel (Phase 9) flips each to GREEN only after independently checking it, and tries to refute the per-meeting and negative assertions against the source PDF. Promoted learnings (`self-improvement.md`) often become standing assertions reused every edition (e.g. N1, M2/M6/M11's `bogStart`).
