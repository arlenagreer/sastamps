# Proofreading Report: SAPA PHILATEX Third Quarter 2026

## Document Metadata
- **Title:** The PHILATEX — Third Quarter 2026
- **Volume/Issue:** Vol 132 #3
- **Header Date:** July – August 2026 (note: covers July–September 2026 per calendar)
- **Pages:** 7
- **File Size:** 937,654 bytes (~916 KB)
- **PDF Path:** /Users/arlenagreer/Desktop/Third Quarter 2026.pdf

---

## Section-by-Section Review

### Page 1 — Masthead and Meeting Calendar

**Structure:** Standard masthead with three logos (APS, SAPA stamp image, TPA), calendar table, location note.

**Issues found:**

- **MINOR:** The masthead date reads "July – August 2026" but the calendar covers July–September 2026. This is not a discrepancy that affects extraction (the calendar table is the authoritative source), but it may confuse readers.
- **MINOR:** The Sep 11 calendar cell shows a superscript "1" before "Board Of Governors Meeting" (rendered as "11¹ Board Of Governors Meeting"). This appears to be a layout artifact or footnote marker. No corresponding footnote was found in the newsletter. Logged as minor formatting issue; does not affect the date (September 11).

**Calendar Table Extraction (source of truth):**

| Date | Column | Entry |
|------|--------|-------|
| Jul 3 | July | NO MEETING – Independence Day |
| Jul 10 | July | Board Of Governors Meeting; Program: "Show and Tell" |
| Jul 17 | July | Club Auction – Visitors Welcome |
| Jul 24 | July | Bourse – buy, sell, & trade; Guests Welcome |
| Jul 31 | July | Stamp Program: TBD or Bourse |
| Aug 7 | August | Board Of Governors Meeting; Program: "Show and Tell" |
| Aug 14 | August | Club Auction – Guests Welcome |
| Aug 21 | August | Bourse – buy, sell, & trade; Guests Welcome |
| Aug 28 | August | Stamp Program: TBD or Bourse |
| Sep 4 | September | NO MEETING – Labor Day |
| Sep 11 | September | Board Of Governors Meeting; Program: "Show and Tell" |
| Sep 18 | September | Club Auction – Guests Welcome |
| Sep 25 | September | Bourse – buy, sell, & trade; Guests Welcome |

Total: 13 entries. Confirmed: 2 holidays, 3 BOG, 3 auctions, 3 bourses, 2 stamp programs. NO PICNIC.

**No prose/calendar conflicts detected.**

### Page 2 — We Welcome Visitors / New Members / Thank You Steve Mabie / New SAPA Treasurer

**Issues found:**

- **MODERATE (officer change):** The newsletter announces Mark Brill as the new SAPA Treasurer replacing Steve Mabie. The current about.html still shows Steve Mabie as Treasurer. This requires an update to about.html.
- **MINOR:** Steve Mabie is described as former "treasurer/newsletter editor" but the newsletter also names him as the member who "served as treasurer and newsletter editor since 2024." Jim Durham is listed as the current Philatex Editor on page 7. No inconsistency — Steve Mabie was replaced as newsletter editor (by Jim Durham, per Q1 2026) and is now also replaced as Treasurer.
- **MINOR:** David Keown's application is noted as "not officially been approved yet (a mere formality)" — his membership status is pending at time of printing. Logged for awareness; no data impact.

### Page 3 — Philatex Archives / Talking Stamps

**Issues found:**

- **MINOR:** "Talking Stamps" section references "4th of July stamp humor inspired by Mad Magazine's 'Talking Stamps'" — the superscript formatting for "4th" (4^th) is informal but not an error.
- No structural or content issues.

### Page 4 — Feature Article: First US Flag Stamp (continued)

**Issues found:**

- None. Well-written historical article. The 1957 first flag stamp, Scott 1094, details appear accurate.

### Page 5 — Error in Stamp Design / SAPA Auction Guidelines

**Issues found:**

- **MINOR:** The puzzle stamp (Completion of First Transcontinental Railroad, 1869/1944) has the wind-direction error as described. The answer appears on page 7.
- The auction guidelines section is a standing policy article. No issues.

### Page 6 — Auction Guidelines (continued) / Stamp Unveiling Event

**Issues found:**

- **MINOR:** The event flyer mentions "America Celebrates 250, 1776–2026" but the event name is listed as "42nd Annual Fourth of July Patriotic Ceremony." This is contextual and not an error in the newsletter itself.
- No data extraction impact.

### Page 7 — Board of Governors / Write to SAPA / Upcoming TSDA Shows / Coming Soon

**Issues found:**

- **CRITICAL (for about.html):** Board of Governors listed as:
  - President: Chip Swinney
  - Vice President: Al Lozano
  - Secretary: Rick Cross
  - **Treasurer: Mark Brill** (changed from Steve Mabie)
  - Membership: Dora Roberts
  - Historian: Fred Groth
  - Auctioneer: Chip Swinney
  - Governor: Lea Senghaas
  - Governor: Nancy Mabie
  - Philatex Editor: Jim Durham
  - Webmaster: Arlen Greer

- **MODERATE:** "Coming Soon!" section notes "The next issue of The Philatex... is tentatively scheduled to be sent in August" and signals "a return to a bimonthly schedule." This would mean the Q4 2026 newsletter may arrive in October (normal) and there may be a mid-cycle issue in August. This is out-of-scope for the current Q3 update but worth flagging for the next planning cycle.

- **TSDA Shows listed:**
  - July 17–18: Houston TSDA, Hilton Garden Inn, 12245 Katy Freeway, Houston
  - August 21–22: Dallas TSDA, Holiday Inn & Suites, 3220 Craig Drive, McKinney
  - September 18–19–20: Greater Houston Stamp Show, Humble Civic Center, 8233 Will Clayton Road, Humble TX 77338 (Fri 10–6, Sat 10–5, Sun 10–4)
  - October 9–10: San Antonio TSDA, Norris Conference Center, 618 NW Freeway Loop 410, San Antonio TX 78216

- **MAILING ADDRESS:** "Write to SAPA: San Antonio Philatelic Association, c/o Al Lozano, 13530 FM 1560N, Helotes, TX 78023" — matches current contact.html. No change needed.

---

## Summary of Issues by Severity

### Critical (extraction-impacting)
1. **Treasurer officer change:** Mark Brill replaces Steve Mabie as Treasurer. about.html must be updated.

### Moderate
1. **David Keown's membership:** Application not yet officially approved at print time.
2. **Bimonthly schedule announcement:** Next issue expected August 2026 — may affect Q4 planning.

### Minor
1. Masthead date "July–August 2026" does not match full quarter coverage (July–September).
2. Superscript "1" artifact in Sep 11 calendar cell — likely a footnote marker with no corresponding footnote.
3. Steve Mabie's dual role (treasurer + newsletter editor) now fully transferred.
4. David Keown membership pending.

---

## Extraction-Impacting Discrepancies

| # | Type | Description | Resolution |
|---|------|-------------|------------|
| 1 | Officer change | Mark Brill is new Treasurer (not Steve Mabie) | Update about.html |
| 2 | Sep 11 cell artifact | Superscript "1" before "Board Of Governors" text | Ignored; date is unambiguously Sep 11 |
| 3 | Stamp program content unknown | Jul 31 and Aug 28 listed as "TBD or Bourse" | Mark [UNVERIFIED] on both meetings |

---

*Report generated: 2026-06-23*
*Agent: Philatex Newsletter Agent*
*Edition: 2026-Q3*
