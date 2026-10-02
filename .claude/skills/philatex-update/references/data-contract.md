# Philatex Update — Data Contract Reference

Quick-reference card for the extraction agent and reviewers. For full field definitions, the JSON schemas in `data/schemas/` are authoritative.

## A. JSON Data Files

**`data/newsletters/newsletters.json`**
- Key fields: `id`, `title`, `quarter` or `months` (see the cadence table below), `year`, `publishDate` (YYYY-MM-DD, the edition's first day), `filePath` (public/SAPA-PHILATEX-...), `description`, `featuredArticles[]`, `highlights[]`, `tags[]`, `pageCount`, `fileSize`, `status`
- Validate against: `data/schemas/newsletter.schema.json`. The schema accepts both id patterns and requires `quarter` for a `YYYY-QN` id and `months` for a `YYYY-MM` id.

| Field | Quarterly edition | Bimonthly edition (from January 2027) |
|-------|-------------------|---------------------------------------|
| `id` | `YYYY-QN`, e.g. `2026-Q4` | `YYYY-MM`, MM = the issue's **first** month, e.g. `2027-01` (Jan/Feb), `2027-03` (Mar/Apr) |
| `title` | `SAPA PHILATEX Fourth Quarter 2026` | `SAPA PHILATEX January/February 2027` |
| `quarter` | required: `First`/`Second`/`Third`/`Fourth` | omit |
| `months` | omit | required: the two month names in order, e.g. `["January", "February"]` |
| `publishDate` | first day of the quarter, e.g. `2026-10-01` | first day of the first month, e.g. `2027-01-01` |
| `filePath` | `public/SAPA-PHILATEX-Fourth-Quarter-2026.pdf` | `public/SAPA-PHILATEX-January-February-2027.pdf` |

Existing `YYYY-QN` entries stay as they are. History is never rewritten into the new scheme.
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
| `index.html` | "Upcoming TSDA Stamp Shows" table | `<caption>` (hard-codes the quarter) + every row = this edition's shows |
| `newsletter.html` | `#main-content` | Current issue section, archive year section |
| `meetings.html` | `#main-content` | Meeting list overview |
| `meetings.html` | `#meeting-schedule-container` | Meeting schedule list |
| `meetings.html` | `#calendar-container` | Calendar widget data |
| `about.html` | `#main-content` | Board of Governors roster (if changed) |
| `contact.html` | -- | Mailing address block (if changed) |

**Edition labels in page text (bimonthly).** The pages hard-code quarterly wording that the skill fills in. These are not templated, so for a bimonthly edition write the label as follows:

- Edition label: `January/February 2027` wherever a quarterly run writes `Fourth Quarter 2026`. Examples: the index.html banner `SAPA PHILATEX - January/February 2027`; the newsletter.html current-issue `<p>` and the card title `January/February 2027 Edition`; an archive.html card `<p>January/February 2027</p>` with a `<!-- January/February 2027 -->` comment.
- The TSDA table caption names the months, e.g. `…for January–February 2027`, never a quarter.
- Leave the general prose about the publication schedule ("quarterly publication", newsletter.html's "Frequency: Quarterly" and its quarter-to-publish-date list, archive.html's intro) alone during a content run. Changing it is a separate, operator-approved site edit.
- Known gap: `js/modules/template-engine.js` renders a newsletter card as `{quarter} Quarter {year}`, which has no bimonthly form. If a run's output reaches that renderer, report it as a finding. Do not edit JS in a content run.

## C. ICS Conventions (verified against existing files)

- **Individual meeting files:** `data/calendar/YYYY-MM-DD-meeting.ics` (picnic uses `-picnic.ics`)
- **Edition schedule bundle (aggregate):** quarterly `public/sapa-qN-YYYY-meetings.ics` (e.g. `sapa-q4-2026-meetings.ics`); bimonthly `public/sapa-YYYY-MM-meetings.ics`, MM = the issue's first month, covering both months (e.g. `sapa-2027-01-meetings.ics` for January/February 2027). Below, "quarterly file" means this aggregate for either cadence.
- **PRODID:** individual `-//San Antonio Philatelic Association//SAPA Meetings//EN`; quarterly `-//San Antonio Philatelic Association//SAPA Meeting Calendar//EN`
- **UID:** individual `YYYYMMDDT193000Z-sapa@sastamps.org` — the time portion is a **FIXED `193000Z`** for every meeting (not its real time); only the date varies. Quarterly `sapa-YYYY-MM-DD@sastamps.org` (date-only).
- **DTSTAMP:** the edition's first day at midnight UTC, in both formats: e.g. `20260701T000000Z` for 2026-Q3, `20270101T000000Z` for 2027-01.
- **Event time anchoring — the two formats differ (this was a real bug):**
  - **Individual files = UTC (`Z`):** `DTSTART` = `meetingStart`, `DTEND` = `meetingEnd`, +5h CDT→UTC (roll to next UTC day past midnight). Standard 7:30→9:00 PM = `…T003000Z`/`…T020000Z` next day. Picnic 6:00→8:30 PM = same-day `T230000Z` / next-day `T013000Z`. **NOT doorsOpen.**
  - **Quarterly file = local/floating (no `Z`):** `DTSTART` = `doorsOpen` (6:30 PM standard → `T183000`), `DTEND` = `meetingEnd` (`T210000`). Picnic anchors meetingStart `T180000`→`T203000`.
  - **No confirmed end (start-only event, e.g. 2026-12-18 Holiday Party):** omit `time.meetingEnd` in meetings.json and omit `DTEND` (and `DURATION`) in both the individual and quarterly `.ics`; `DTSTART` is anchored as above. G5 enforces this.
- **Cancelled — two shapes (G5 checks both):**
  - **`type: holiday`** (cancelled when the newsletter was published): `STATUS:CANCELLED`, `LOCATION:Meeting Cancelled`, a fixed 1-minute placeholder. Individual `…T183000Z`→`…T183100Z`; quarterly `…T183000`→`…T183100`. `DTSTAMP` is the edition's first day.
  - **Any other type with `cancelled: true`** (cancelled after publication, e.g. 2026-04-24 or an operator correction): keep the type and the real times, and set `STATUS:CANCELLED`. `DTSTAMP` may be the date of the change.
- **Line endings:** existing `.ics` files use **LF**, not CRLF — match them.
- **Escaping:** commas as `\,` in LOCATION/DESCRIPTION (also `\;` `\\` `\n` if present).
- **DST:** CDT (UTC-5) runs 2nd Sunday of March → 1st Sunday of November. All Q2/Q3 dates are CDT; Q1/Q4 can straddle. Bimonthly: `YYYY-01` (Jan/Feb) is all CST; `YYYY-05`, `YYYY-07` and `YYYY-09` are all CDT; `YYYY-03` (Mar/Apr) and `YYYY-11` (Nov/Dec) straddle. Compute each meeting's UTC offset from its **own date** (America/Chicago). **Never copy a template's offset:** the newest templates are CDT-era, and **the 2026 Q1 files dated before Mar 8 are themselves wrong** (built with the CDT offset, one hour early), so they are not a CST reference. Gate G5 (`scripts/check-ics.mjs`) recomputes every time and is the authority.
- **Safest practice:** model each new file's *structure* on the newest same-type template `.ics`, and take its *times* from the time-zone computation.

## D. PDF Naming Convention

- Quarterly: `public/SAPA-PHILATEX-[Quarter]-Quarter-[Year].pdf`, e.g. `public/SAPA-PHILATEX-Third-Quarter-2026.pdf`. Quarter word mapping: Q1=First, Q2=Second, Q3=Third, Q4=Fourth.
- Bimonthly: `public/SAPA-PHILATEX-[Month1]-[Month2]-[Year].pdf`, with full month names, e.g. `public/SAPA-PHILATEX-January-February-2027.pdf`.

## E. Build & validation steps after data edits (verified)

Run all of these after changing `meetings.json` / `newsletters.json`; they are the contract's automated green bar:

- **`build:js`** — rebuild JS bundles. NOTE: contrary to older docs, meeting/newsletter JSON is **fetched at runtime** (`js/calendar-adapter.js`, `js/modules/meeting-loader.js`), NOT embedded by esbuild. So `build:js` does not actually refresh the data — run it for parity, but the real freshness path is the deployed JSON + the search index below.
- **`build:search`** — rebuild the lunr index (indexes `newsletters[]` and `meetings[]`) into `dist/data/`. Skipping this leaves site search stale for the new content. `search.html` fetches `dist/data/search-index.json` and `search-documents.json` at runtime; nothing is embedded in the page (the embed step was removed 2026-10), and `npm run build` regenerates the index, so a deploy always serves a fresh one. lunr build/load versions must match (2.3.9).
- **`validate:data`** (with `VALIDATE_NEW_IDS=<new ids>`) — ajv-validates the new entries against `data/schemas/*.schema.json`. Known-convention warnings (`time.bogStart`, `"N/A"` times on cancelled meetings) are tolerated; any other violation on a new entry fails.
- **`scripts/check-ics.mjs --edition {ID}`** (G5): accepts `YYYY-QN` or `YYYY-MM` and recomputes every individual (UTC) and aggregate (local) `.ics` time from `meetings.json` and the America/Chicago rules, and checks UID, DTSTAMP, STATUS, the cancelled placeholder and LF endings. Exit 0 required.
- **Build outputs are never committed.** The builds write only `dist/`, `css/*.min.css` and `_site/`, all gitignored, so they never show in `git status` and are never staged. CI rebuilds them on deploy. A *tracked* file that changes after a build is a defect (the build must never rewrite sources), not a build output.
- **`bin/ci` leaves the edited files alone.** The local CI gate runs the full `npm run build`, which assembles the site in `_site/` and never rewrites a tracked file (its `test:site-build` section fails if it does). SKILL.md Phase 10 still hashes the edited files around `bin/ci` to prove it.
