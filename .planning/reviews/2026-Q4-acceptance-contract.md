# Acceptance Contract — 2026-Q4 (The Philatex, Vol 132 #4, October – December 2026)

Source: `philatex-2026-q4.pdf` (6 pages, 653,527 bytes, from Jim Durham's 2026-09-30 email), the schemas,
learnings, and operator instructions given 2026-09-30. Authored before extraction; revised per gsd-plan-checker (REVISE: M0, S1b, N3/July-1 contradiction + 7 warnings); **FROZEN 2026-09-30** before Phase 8.
Worktree: `.claude/worktrees/philatex-2026-q4` (branch `content/2026-Q4`). Status lives in the QC ledger, not here.

## Counts (calendar table, p.1)
- **[C1]** Exactly 13 new meetings, dates 2026-10-02 … 2026-12-25 (all Fridays): Oct 2, 9, 16, 23, 30; Nov 6, 13, 20, 27; Dec 4, 11, 18, 25 — source: calendar-table — status: RED
- **[C2]** Exactly 3 cancelled/holiday (`type: holiday`, `cancelled: true`): Oct 30, Nov 27, Dec 25 — source: calendar-table — status: RED
- **[C3]** Exactly 3 business/BOG (Oct 2, Nov 6, Dec 4) — source: calendar-table — status: RED
- **[C4]** Exactly 3 auction (Oct 16, Nov 13, Dec 11) — source: calendar-table — status: RED
- **[C5]** Exactly 2 social/bourse (Oct 23, Nov 20) — source: calendar-table — status: RED
- **[C6]** Exactly 1 regular/stamp program (Oct 9) — source: calendar-table — status: RED
- **[C7]** Exactly 1 special (Dec 18 Club Holiday Party), `cancelled: false` — source: calendar-table + operator — status: RED

## Per-meeting
- **[M0]** Every non-cancelled meeting except 2026-12-18 has time.doorsOpen "6:30 PM", meetingStart "7:30 PM", meetingEnd "9:00 PM"; business meetings (Oct 2, Nov 6, Dec 4) additionally bogStart "7:15 PM"; every cancelled meeting has "N/A" for all three (no bogStart). Source: p.1 footer ("Doors open at 6:30 PM, BOG meetings begin at 7:15 and all other meetings begin at 7:30"); meetingEnd 9:00 PM is site convention (see P1) — status: RED
- **[M1]** 2026-10-02 = business, bogStart 7:15 PM, meetingStart 7:30 PM, Show and Tell — status: RED
- **[M2]** 2026-10-09 = regular, "Expertising Philatelics" by Jimmy Tomchesson (Philatelic Stamp Authentication and Grading / PSAG); held the evening of Oct 9, the first day of the San Antonio TSDA show (Oct 9–10) — source: p.1 + p.2 — status: RED
- **[M3]** 2026-10-16 = auction (Club Auction; third Friday — NOT moved to match the generic "Second Friday: Auction" text) — status: RED
- **[M4]** 2026-10-23 = social (Stamp Bourse – buy, sell & trade) — status: RED
- **[M5]** 2026-10-30 = holiday, cancelled:true (Halloween); "next meeting" = November 6, 2026 — status: RED
- **[M6]** 2026-11-06 = business, bogStart 7:15 PM, Show and Tell — status: RED
- **[M7]** 2026-11-13 = auction (Club Auction) — status: RED
- **[M8]** 2026-11-20 = social (Stamp Bourse) + Blue-Chip Auction lot viewing + lot verification (NOT typed auction) — status: RED
- **[M9]** 2026-11-27 = holiday, cancelled:true (Thanksgiving); next meeting = December 4, 2026 — status: RED
- **[M10]** 2026-12-04 = business, bogStart 7:15 PM, Show and Tell + Blue-Chip Auction lot viewing (NOT typed auction) — status: RED
- **[M11]** 2026-12-11 = auction, "SAPA Blue-Chip Auction", details ONLY from p.3 (catalog value ≥ $20, opening bid may be lower; Scott or other recognized catalog number + value + catalog year; condition described; lots submitted before Nov 20 verified by expert panel; lot list sent to members and dealers before auction night; lots displayed Nov 20 and Dec 4; later lots, incl. auction night, not verified). No "10% commission"/"cash or check" template notes. Spelling "Blue-Chip". The p.1 cell has no "Visitors Welcome" (do not add one) — status: RED
- **[M12]** 2026-12-18 = special, "Club Holiday Party", doorsOpen 6:00 PM, meetingStart 6:00 PM, meetingEnd 9:00 PM (end = operator decision; flagged for confirmation at checkpoint), not cancelled; SAPA provides barbecue (brisket and turkey); bring a side dish or dessert if able; in the meeting room. No potluck/gift-exchange/raffle/RSVP/"bring the family" template carry-over; no "holiday" tag — source: p.1 + p.4 + operator — status: RED
- **[M13]** 2026-12-25 = holiday, cancelled:true (Christmas); NO invented January 2027 "next meeting" date — status: RED

## Schema / data
- **[S1]** newsletters.json: new entry prepended with id "2026-Q4", title "SAPA PHILATEX Fourth Quarter 2026", quarter "Fourth", year 2026, publishDate "2026-10-01", filePath "public/SAPA-PHILATEX-Fourth-Quarter-2026.pdf", pageCount 6, fileSize "638 KB", status "published"; metadata totalIssues 7, latestIssue "2026-Q4", lastUpdated "2026-10-01T00:00:00.000Z" — status: RED
- **[S1b]** The 2026-Q4 `description` summarises only this PDF (Oct–Dec calendar; Oct 9 Tomchesson/PSAG program; San Antonio TSDA show Oct 9–10; Blue-Chip Auction Dec 11; Holiday Party Dec 18; Steve Mabie memorial; Postal Note Stamps feature) and contains none of: Sam Rodgers, Cataloging, Flag Stamp, Auction Guidelines, Radek, Keown, "new Treasurer", Fort Sam Houston, "outgoing" — negative: true — status: RED
- **[S2]** all 13 meeting entries validate (type enum, required fields; tolerated conventions only: bogStart, "N/A" on cancelled); meetings.json metadata totalMeetings 79, upcomingMeetings = count of meetings with cancelled:false and date ≥ 2026-10-01 = 10 (do not copy Q3's 12, which fits no rule), lastUpdated "2026-10-01T00:00:00.000Z" — status: RED
- **[S3]** featuredArticles/highlights reflect p.2–6: In Fond Memory of Steve Mabie (regular item, per operator), October 9 Stamp Program, San Antonio Stamp Show, SAPA Annual Blue-Chip Auction, Something Punny, SAPA Holiday Party, Talking Stamps, What is a Bourse?, Featured Article: Postal Note Stamps!, Error in Stamp Design (+ answer), Board of Governors, Upcoming TSDA Shows, Coming Soon (bimonthly from January 2027, "hopefully"). Facts, not just titles: the memorial item states he passed July 1, 2026 and served as treasurer 2024–2026 and editor 2024–2025, and never calls him "outgoing"; the Blue-Chip item says Dec 11, $20 minimum catalog value, verification cutoff Nov 20 — status: RED
- **[S4]** `public/SAPA-PHILATEX-Fourth-Quarter-2026.pdf` exists, byte-identical to the source (653,527 bytes) — status: RED
- **[K1]** all new dates > last existing meetings.json date (2026-09-25); chronological; no duplicate ids; no existing entry modified (git diff shows only prepend/append/metadata) — negative: true — status: RED

## ICS (G5 plus what G5 cannot see)
- **[I1]** 13 individual `data/calendar/2026-MM-DD-meeting.ics` (Dec 18 is `-meeting.ics`, not `-party`/`-picnic`) + `public/sapa-q4-2026-meetings.ics` with exactly 13 VEVENTs; `check-ics --edition 2026-Q4` exit 0. October = CDT (7:30 PM → next-day T003000Z); Nov–Dec = CST (7:30 PM → next-day T013000Z; party 6:00–9:00 PM → 20261219T000000Z–T030000Z); quarterly party T180000–T210000 — status: RED
- **[I2]** quarterly header: `X-WR-CALNAME:SAPA Q4 2026 Meetings`, CALDESC mentions Fourth Quarter 2026; no "Q3"/"Third Quarter" anywhere in the file; SUMMARY/DESCRIPTION/CATEGORIES fit each meeting (party DESCRIPTION does not say doors open 6:30; Blue-Chip wording from source); cancelled DESCRIPTIONs' next-meeting text per M5/M9/M13; the Dec 11 SUMMARY is "SAPA Blue-Chip Auction" and its DESCRIPTION has no "Cash or check", "donated materials" or "10%" — status: RED

## HTML / operator instructions
- **[H1]** index.html dated sections are Q4: newsletter banner (title, publish date, PDF link); meeting table Oct/Nov/Dec (5/4/4 rows, Blue-Chip details in Nov 20 / Dec 4 / Dec 11 cells, party cell shows 6:00 PM, cancelled cells); Q4 ICS link; Latest Issue Highlights; Club News & Announcements (Coming Soon rewritten: January 2027, "hopefully"); TSDA table + caption (San Antonio Oct 9–10 Norris Conference Center from p.2; Mid-Cities Stamp Club Expo Nov 13–14 Grapevine; Dallas TSDA Dec 11–12 McKinney; Houston TSDA Jan 8–9, 2027); the JSON-LD Event is either absent, or has startDate 2026-10-09T19:30:00-05:00 (Oct 9 program); no -06:00 offset on any October date and no Q3 date — status: RED
- **[H2]** meetings.html: Q4 ICS link/label, TSDA caption + rows, BOTH inline JS fallback blocks rewritten for October/November/December 2026 — status: RED
- **[H3]** newsletter.html: quarter label, PDF link, edition title, publish date, "In This Issue" list (memorial as an ordinary item) — status: RED
- **[H4]** archive.html lists the Q3 2026 issue (operator-authorized scope exception, orchestrator edit) linking `public/SAPA-PHILATEX-Third-Quarter-2026.pdf` — source: operator-instruction — status: RED
- **[O1]** index.html contains NO "Honoring Steve Mabie", "Tribute to Steve Mabie", "Read the Tribute", "Steve Mabie Tribute Callout", and no "outgoing treasurer" — source: operator-instruction — negative: true — status: RED
- **[O2]** No memorial banner/callout on index.html, meetings.html or newsletter.html; the Q4 memorial appears only as a regular issue item (S3, H3, homepage highlights). Historical Q3 entries in newsletters.json, search.html and archive.html (incl. "Thank You, Steve Mabie") are unchanged history, not violations — source: operator-instruction — negative: true — status: RED

## Provenance
- **[P1]** Every below-high-confidence value is flagged; expected: Dec 18 meetingEnd 9:00 PM (operator decision, confirm at checkpoint) recorded in the proofreading report — never inside a time string (schema pattern). The report also lists as convention-derived (not in the PDF): publishDate 2026-10-01, title "SAPA PHILATEX Fourth Quarter 2026" (masthead says only "Vol 132 #4, October – December 2026"), and meetingEnd 9:00 PM — status: RED

## Negative
- **[N1]** NO picnic this quarter; NO `holiday` entry with `cancelled:false`; Dec 18 is not cancelled — negative: true — status: RED
- **[N2]** NO file modified outside permitted scope + declared build outputs (`search.html`, `dist/**`), except the operator-authorized `archive.html` — negative: true — status: RED
- **[N3]** NO stale prior-quarter content in index.html / meetings.html / newsletter.html: no "Third Quarter 2026", "Q3 2026", "q3-2026" as current-edition text; no "July 1, 2026" used as a publish date or in the newsletter banner/edition label (the memorial's date of passing is allowed); no "Welcome New Members" (Radek Lhotsky, David Keown), "New SAPA Treasurer", July 31 program card, "Beginning this summer", or "Admission and parking are free!" carry-over — negative: true — status: RED
- **[N4]** about.html and contact.html unchanged (roster and "c/o Al Lozano, 13530 FM 1560N, Helotes, TX 78023" already match p.6) — negative: true — status: RED

## Green bar (run as `cd "$WORKTREE" && …`)
- **[G1]** npm run build:js exits 0 (dist/js home/meetings/newsletter bundles embed the new data) — status: RED
- **[G2]** npm run build:search && npm run build:search:embed succeed; search.html contains newsletter-2026-Q4 — status: RED
- **[G3]** VALIDATE_NEW_IDS=2026-Q4,2026-10-02,2026-10-09,2026-10-16,2026-10-23,2026-10-30,2026-11-06,2026-11-13,2026-11-20,2026-11-27,2026-12-04,2026-12-11,2026-12-18,2026-12-25 npm run validate:data exits 0 — status: RED
- **[G4]** npm run test:quick passes — status: RED
- **[G5]** node .claude/skills/philatex-update/scripts/check-ics.mjs --edition 2026-Q4 --root "$WORKTREE" exits 0 — status: RED
