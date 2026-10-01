# Acceptance Contract — 2026-Q3 (The Philatex, Third Quarter 2026)

Frozen RED artifact for the /philatex-update run. Derived from the page-1 calendar,
the JSON schemas, research, and learnings — BEFORE extraction. The extractor must turn
every assertion GREEN; the adversarial panel re-checks each against the source PDF.
All dates fall in CDT (Q3). Last existing meeting in meetings.json: 2026-06-26.

## Counts
- **[C1]** Exactly 13 new meetings (2026-07-03 … 2026-09-25) — source: calendar-table — status: RED
- **[C2]** Exactly 2 cancelled/holiday (Jul 3, Sep 4) — source: calendar-table — status: RED
- **[C3]** Exactly 3 BOG/business (Jul 10, Aug 7, Sep 11) — source: calendar-table — status: RED
- **[C4]** Exactly 3 auctions (Jul 17, Aug 14, Sep 18) — source: calendar-table — status: RED
- **[C5]** Exactly 3 bourse/social (Jul 24, Aug 21, Sep 25) — source: calendar-table — status: RED
- **[C6]** Exactly 2 stamp-program/regular (Jul 31, Aug 28; both "TBD or Bourse") — source: calendar-table — status: RED

## Per-meeting (source: calendar-table)
- **[M1]** 2026-07-03 = holiday, cancelled:true (Independence Day) — status: RED
- **[M2]** 2026-07-10 = business, bogStart 7:15 PM ("Show and Tell") — status: RED
- **[M3]** 2026-07-17 = auction (Visitors Welcome) — status: RED
- **[M4]** 2026-07-24 = social (Bourse) — status: RED
- **[M5]** 2026-07-31 = regular, [UNVERIFIED] ("TBD or Bourse") — status: RED
- **[M6]** 2026-08-07 = business, bogStart 7:15 PM — status: RED
- **[M7]** 2026-08-14 = auction (Guests Welcome) — status: RED
- **[M8]** 2026-08-21 = social (Bourse) — status: RED
- **[M9]** 2026-08-28 = regular, [UNVERIFIED] ("TBD or Bourse") — status: RED
- **[M10]** 2026-09-04 = holiday, cancelled:true (Labor Day) — status: RED
- **[M11]** 2026-09-11 = business, bogStart 7:15 PM — status: RED
- **[M12]** 2026-09-18 = auction (Guests Welcome) — status: RED
- **[M13]** 2026-09-25 = social (Bourse) — status: RED

## Schema / Continuity / ICS / Provenance
- **[S1]** newsletter entry: id "2026-Q3", quarter "Third", year 2026, publishDate "2026-07-01", filePath "public/SAPA-PHILATEX-Third-Quarter-2026.pdf", title references "Third Quarter 2026" — validates — status: RED
- **[S2]** all 13 meeting entries validate (type enum, required fields, time pattern for active meetings) — status: RED
- **[S3]** metadata updated: totalIssues 5→6, latestIssue "2026-Q3", lastUpdated "2026-07-01T00:00:00.000Z" — status: RED
- **[K1]** all new dates > 2026-06-26; chronological, appended to end; no dupes — status: RED
- **[I1]** 13 individual .ics (UTC, DTSTART=meetingStart→meetingEnd; holidays fixed T183000Z→T183100Z) in data/calendar/ + 1 public/sapa-q3-2026-meetings.ics (local, DTSTART=doorsOpen→meetingEnd); UID fixed T193000Z; DTSTAMP 20260701T000000Z; LF endings — status: RED
- **[P1]** every <high-confidence field carries [UNVERIFIED] (expect ≥2: M5, M9) — status: RED

## Negative
- **[N1]** NO picnic this quarter (Q3 has none; the picnic is Q2) — source: calendar-table + learnings — status: RED
- **[N2]** NO file modified outside permitted-file scope — status: RED

## Green bar
- **[G1]** npm run build:js exits 0 — status: RED
- **[G2]** npm run test:quick passes — status: RED
- **[G3]** VALIDATE_NEW_IDS="2026-Q3,2026-07-03,2026-07-10,2026-07-17,2026-07-24,2026-07-31,2026-08-07,2026-08-14,2026-08-21,2026-08-28,2026-09-04,2026-09-11,2026-09-18,2026-09-25" npm run validate:data exits 0 — status: RED
- **[G4]** npm run build:search && npm run build:search:embed succeed — status: RED
