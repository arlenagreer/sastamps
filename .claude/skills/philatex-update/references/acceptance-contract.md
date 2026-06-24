# Philatex Update — Acceptance Contract (the TDD "test")

The acceptance contract is the **RED** artifact of the skill's TDD methodology (`superpowers:test-driven-development`). It is written in Phase 7 **before** any extraction, from the PDF (page 1 calendar especially) + the JSON schemas + the frozen plan + accumulated learnings. It is a list of **checkable assertions** the extracted data MUST satisfy. Extraction (Phase 8) exists only to turn these GREEN; the adversarial review (Phase 9) is the test runner that tries to prove any claimed-GREEN assertion is still RED.

**Iron rule:** no extraction begins until a frozen contract exists, and the contract is authored from the source — never back-filled from whatever the extractor happened to produce. A contract written after extraction is not a test; it is a rationalization.

## Where it lives

`.planning/reviews/{EDITION_ID}-acceptance-contract.md` (next to the proofreading report). It is a run artifact, not website source, and is not in the permitted-file scope — it is bookkeeping, like the review report.

## Assertion shape

```markdown
- **[A-id]** {statement} — source: {calendar-table | schema | plan | learnings | continuity} — check: {how to verify} — status: RED
```

`status` flips to GREEN only when the check passes. A contract with any RED assertion at Phase 10 is a `block`.

## Assertion categories (derive every applicable one)

1. **Counts** — exact totals from the calendar table: total meetings, holidays/cancelled, BOG/business, auctions, bourses/social, regular/program, picnic, special/exhibition.
2. **Per-meeting facts** — one assertion per meeting: `{date} = {type}` (+ `cancelled` for holidays, + `bogStart` for BOG). These are the highest-risk facts the skeptic panel refutes.
3. **Schema** — every newsletter and meeting entry validates against `data/schemas/*.schema.json`; all enums in range. Plus the newsletter PDF exists at `public/<filePath>` (a missing PDF = **blocker**; the extractor must copy the source PDF there).
4. **Continuity** — new meeting dates strictly after the last existing date in `meetings.json`; no duplicates; chronological.
5. **ICS** — one individual `.ics` per meeting + one quarterly aggregate; UTC math correct for the quarter's DST regime; cancelled = 1-minute duration; UID/PRODID conventions per `data-contract.md` §C.
6. **Provenance** — every below-high-confidence field carries `[UNVERIFIED]`.
7. **Negative assertions** — what must NOT appear (e.g., "no picnic this quarter"; "no file modified outside permitted scope"). Negative assertions are where over-fit hides; derive them from the calendar, not from habit.
8. **Automated green bar** — `build:js` exits 0; `build:search` + `build:search:embed` refresh the search index; `validate:data` (scoped to the new ids via `VALIDATE_NEW_IDS`) passes with 0 hard errors; `test:quick` passes.

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
- **[N1]** NO picnic this quarter (Q3 has none; the picnic is Q2) — source: calendar-table + learnings — status: RED
- **[N2]** NO file modified outside permitted-file scope — status: RED

## Green bar
- **[G1]** npm run build:js exits 0 — status: RED
- **[G2]** npm run test:quick passes — status: RED
- **[G3]** VALIDATE_NEW_IDS=<2026-Q3 + the 13 meeting ids> npm run validate:data exits 0 (0 hard errors) — status: RED
- **[G4]** npm run build:search && npm run build:search:embed succeed (search index refreshed + re-embedded) — status: RED
```

The extractor (Phase 8) must satisfy every assertion; the panel (Phase 9) flips each to GREEN only after independently checking it, and tries to refute the per-meeting and negative assertions against the source PDF. Promoted learnings (`self-improvement.md`) often become standing assertions reused every quarter (e.g. N1, M2/M6/M11's `bogStart`).
