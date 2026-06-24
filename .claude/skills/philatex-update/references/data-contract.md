# Philatex Update — Data Contract Reference

Quick-reference card for the extraction agent and reviewers. For full field definitions, the JSON schemas in `data/schemas/` are authoritative.

## A. JSON Data Files

**`data/newsletters/newsletters.json`**
- Key fields: `id` (YYYY-QN), `title`, `quarter` (First/Second/Third/Fourth), `year`, `publishDate` (YYYY-MM-DD, first day of quarter), `filePath` (public/SAPA-PHILATEX-...), `description`, `featuredArticles[]`, `highlights[]`, `tags[]`, `pageCount`, `fileSize`, `status`
- Validate against: `data/schemas/newsletter.schema.json`
- Schema includes "Calendar" and "Humor" in `featuredArticles.category` enum (added in Phase 11)

**`data/meetings/meetings.json`**
- Key fields: `id` (YYYY-MM-DD), `date`, `time` (doorsOpen required), `location`, `type` (regular/business/auction/exhibition/social/special/picnic/holiday), `title`, `presenter`, `cancelled`
- Validate against: `data/schemas/meeting.schema.json`
- Note: existing data uses `bogStart` as an extension not in schema -- include for BOG meetings

**`metadata` block in newsletters.json**
- Update: `lastUpdated` (ISO 8601 UTC, set to the newsletter's `publishDate`), `totalIssues` (+1), `latestIssue` (new edition ID)

## B. HTML Pages -- Section IDs Receiving Updates

| Page | Section ID | Content |
|------|-----------|---------|
| `index.html` | `#main-content` | Upcoming meeting info, latest newsletter link |
| `index.html` | `#meeting-schedule` | Schedule highlights |
| `index.html` | "Club News & Announcements" cards | New members, officer changes, announcements/events (replace stale; no Q2-only carryover like the picnic) |
| `index.html` | "Upcoming TSDA Stamp Shows" table | `<caption>` (hard-codes the quarter) + every row = this quarter's shows |
| `newsletter.html` | `#main-content` | Current issue section, archive year section |
| `meetings.html` | `#main-content` | Meeting list overview |
| `meetings.html` | `#meeting-schedule-container` | Meeting schedule list |
| `meetings.html` | `#calendar-container` | Calendar widget data |
| `about.html` | `#main-content` | Board of Governors roster (if changed) |
| `contact.html` | -- | Mailing address block (if changed) |

## C. ICS Conventions (verified against existing files)

- **Individual meeting files:** `data/calendar/YYYY-MM-DD-meeting.ics` (picnic uses `-picnic.ics`)
- **Quarterly schedule bundle:** `public/sapa-qN-YYYY-meetings.ics`
- **PRODID:** individual `-//San Antonio Philatelic Association//SAPA Meetings//EN`; quarterly `-//San Antonio Philatelic Association//SAPA Meeting Calendar//EN`
- **UID:** individual `YYYYMMDDT193000Z-sapa@sastamps.org` — the time portion is a **FIXED `193000Z`** for every meeting (not its real time); only the date varies. Quarterly `sapa-YYYY-MM-DD@sastamps.org` (date-only).
- **DTSTAMP:** the quarter's first day at midnight UTC (e.g. `20260701T000000Z` for Q3), in both formats.
- **Event time anchoring — the two formats differ (this was a real bug):**
  - **Individual files = UTC (`Z`):** `DTSTART` = `meetingStart`, `DTEND` = `meetingEnd`, +5h CDT→UTC (roll to next UTC day past midnight). Standard 7:30→9:00 PM = `…T003000Z`/`…T020000Z` next day. Picnic 6:00→8:30 PM = same-day `T230000Z` / next-day `T013000Z`. **NOT doorsOpen.**
  - **Quarterly file = local/floating (no `Z`):** `DTSTART` = `doorsOpen` (6:30 PM standard → `T183000`), `DTEND` = `meetingEnd` (`T210000`). Picnic anchors meetingStart `T180000`→`T203000`.
- **Cancelled/holiday:** `STATUS:CANCELLED`, `LOCATION:Meeting Cancelled`; fixed 1-minute placeholder — individual `…T183000Z`→`…T183100Z`, quarterly `…T183000`→`…T183100`.
- **Line endings:** existing `.ics` files use **LF**, not CRLF — match them.
- **Escaping:** commas as `\,` in LOCATION/DESCRIPTION (also `\;` `\\` `\n` if present).
- **DST:** CDT (UTC-5) runs 2nd Sunday of March → 1st Sunday of November. All Q2/Q3 dates are CDT; Q1/Q4 can straddle — resolve per-meeting against an existing CST reference file.
- **Safest practice:** model each new file on the newest same-type template `.ics`.

## D. PDF Naming Convention

- New PDF destination: `public/SAPA-PHILATEX-[Quarter]-Quarter-[Year].pdf`
- Example: `public/SAPA-PHILATEX-Third-Quarter-2026.pdf`
- Quarter word mapping: Q1=First, Q2=Second, Q3=Third, Q4=Fourth

## E. Build & validation steps after data edits (verified)

Run all of these after changing `meetings.json` / `newsletters.json`; they are the contract's automated green bar:

- **`build:js`** — rebuild JS bundles. NOTE: contrary to older docs, meeting/newsletter JSON is **fetched at runtime** (`js/calendar-adapter.js`, `js/modules/meeting-loader.js`), NOT embedded by esbuild. So `build:js` does not actually refresh the data — run it for parity, but the real freshness path is the deployed JSON + the search index below.
- **`build:search` + `build:search:embed`** — rebuild the lunr index (indexes `newsletters[]` and `meetings[]`) and re-embed it into `search.html`. Skipping this leaves site search stale for the new content. lunr build/load versions must match (2.3.9).
- **`validate:data`** (with `VALIDATE_NEW_IDS=<new ids>`) — ajv-validates the new entries against `data/schemas/*.schema.json`. Known-convention warnings (`time.bogStart`, `"N/A"` times on cancelled meetings) are tolerated; any other violation on a new entry fails.
- `dist/bundle-analysis.json` carries a `buildDate` that changes every build; expect it modified but only re-commit when bundle contents/list actually change.
