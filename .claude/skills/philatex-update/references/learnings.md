# Philatex Update — Learnings Log

Append-only memory for `/philatex-update`. The research and planning phases read this file every run; the self-improvement phase (Phase 13) appends to it. See `self-improvement.md` for the capture and promotion protocol.

**Do not delete entries.** Mark superseded ones `Status: retired` instead. Newest at the bottom.

---

### SEED — calendar table beats prose
- **Observed:** Meeting dates in newsletter prose have contradicted the calendar table; the table is correct.
- **Source:** format-drift
- **Generalizable rule:** Source every meeting date/time from the 3-column calendar TABLE (column N = month N), never from prose. Flag any prose/table conflict in the proofreading report.
- **Seen in:** multiple editions (≥2)
- **Status:** promoted → philatex-newsletter-agent.md §"Meeting Extraction Rules"

### SEED — picnic has a non-standard start time
- **Observed:** The annual club picnic starts at 6:00 PM, not the standard 6:30 PM doors-open.
- **Source:** human-correction
- **Generalizable rule:** Never apply default meeting times blindly. The picnic is `type: picnic`, start 6:00 PM. Check each meeting individually.
- **Seen in:** ≥2 editions
- **Status:** promoted → philatex-newsletter-agent.md §"Meeting Extraction Rules" / data-contract.md §C

### SEED — `bogStart` schema gap
- **Observed:** BOG (Board of Governors) meetings carry a `bogStart: "7:15 PM"` field that existing data uses but `meeting.schema.json` rejects (`additionalProperties: false`).
- **Source:** schema-gap
- **Generalizable rule:** Include `bogStart` for BOG meetings to match existing data; report it as a known schema gap, not an error.
- **Seen in:** ≥2 editions
- **Status:** promoted → philatex-newsletter-agent.md §"Schema Validation" / data-contract.md §A

### SEED — DST boundary for Q1/Q4
- **Observed:** ICS UTC math depends on CDT vs CST; Q1 and Q4 editions can straddle the DST boundary.
- **Source:** format-drift
- **Generalizable rule:** CDT (UTC-5) runs 2nd Sunday of March → 1st Sunday of November. Q2/Q3 are entirely CDT; resolve Q1/Q4 per-meeting.
- **Seen in:** ≥2 editions
- **Status:** promoted → data-contract.md §C

<!-- New learnings are appended below this line by Phase 13. -->

### 2026-Q3 rehearsal (2026-06-23) — individual-ICS DTSTART anchors meetingStart, not doorsOpen
- **Observed:** Verified `2026-06-05`/`2026-06-12` individual `.ics`: `DTSTART` = `meetingStart` (7:30/7:00 PM → next-day `T003000Z`/`T000000Z`), `DTEND` = `meetingEnd`. The old docs said `DTSTART` = doorsOpen (6:30 → `T233000Z`) — a 30-min + day-roll error on every event. Quarterly file is different (anchors doorsOpen 6:30 → local `T183000`).
- **Source:** review-panel (research critic) + ground-truth verification
- **Generalizable rule:** Individual = `meetingStart`→`meetingEnd` (UTC); quarterly = `doorsOpen`→`meetingEnd` (local). Always model new files on the newest same-type template.
- **Seen in:** all editions — **Status:** promoted → data-contract.md §C, philatex-newsletter-agent.md §"Time Conversion Reference"

### 2026-Q3 rehearsal — individual-ICS UID is a fixed `T193000Z`
- **Observed:** BOG, picnic, and holiday individual files all use `UID:YYYYMMDDT193000Z-sapa@sastamps.org`. The time portion is constant; only the date varies. Old doc claimed "UTC timestamp of doors-open time."
- **Source:** ground-truth verification — **Status:** promoted → data-contract.md §C, agent

### 2026-Q3 rehearsal — no JSON schema validation existed; added ajv `validate:data`
- **Observed:** `test:quick` is `html && js && css` only; NO npm script validated `data/*.json` against `data/schemas/`. A bad enum/field could ship silently.
- **Source:** ground-truth verification — **Status:** promoted → new `scripts/validate-data.js`, `package.json` (`validate:data`, ajv dep), green bar `[G3]`. Scoped via `VALIDATE_NEW_IDS` so it gates only the run's new entries.

### 2026-Q3 rehearsal — search index rebuild was missing from the skill
- **Observed:** The skill ran only `build:js`. `build:search` + `build:search:embed` (lunr index over newsletters+meetings, re-embedded into `search.html`) were never run, so new content was unsearchable.
- **Source:** Context7 research — **Status:** promoted → agent Step 8, data-contract.md §E, green bar `[G4]`

### 2026-Q3 rehearsal — `build:js` does NOT embed meeting data (corrects "stale meetings" rationale)
- **Observed:** `meetings.json`/`newsletters.json` are fetched at runtime (`js/calendar-adapter.js`, `js/modules/meeting-loader.js`), not bundled by esbuild. The old "must rebuild or meetings go stale" claim was a misdiagnosis; the real freshness path is deployed JSON + the search index.
- **Source:** Context7 research — **Status:** promoted → data-contract.md §E (still run `build:js` for parity)

### 2026-Q3 rehearsal — cancelled meetings use "N/A" times (schema-invalid but intentional)
- **Observed:** Holiday/cancelled meetings set `time` values to `"N/A"`, which fail the schema's H:MM AM/PM pattern. This is an intentional, long-standing convention.
- **Source:** validate:data full audit — **Status:** promoted → known-convention exception in `validate-data.js` (alongside `bogStart`). Do not "fix" by editing schemas or rewriting history.

### 2026-Q3 rehearsal — `bogStart` clarification (prior SEED stands)
- **Observed:** The research critic alarmed that `time.bogStart` "breaks the build." Ground truth: it violates the schema BUT nothing validates it, so it ships fine; existing data uses it. The SEED rule (include it) is correct; the alarm was a false positive.
- **Source:** ground-truth verification — **Status:** logged (reinforces existing SEED). Lesson: adversarial findings must be verified, not trusted.

### 2026-Q3 rehearsal — BACKLOG: 6 pre-existing schema violations (not this skill's data)
- **Observed:** Full `validate:data` audit found genuine drift in historical entries: `type` enum + `presenter`-as-string on `2026-03-27`, `2026-05-29`, `2025-11-21`; bad `featuredArticles[0].category` on `2025-Q4`.
- **Source:** validate:data full audit — **Status:** proposed (out of scope for newsletter updates; flag for a separate data-cleanup task — do NOT block Q3 on it).

### 2026-Q3 rehearsal — PROCESS: Workflow `args` object did not bind
- **Observed:** The research workflow ran with `editionId/quarter/year = undefined` — the `args` object passed to the `Workflow` tool did not reach the script's `args` global, so prompts interpolated "undefined". The adversarial critic caught it ("DO NOT PROCEED").
- **Source:** orchestration self-observation — **Status:** promoted (process) → when invoking research/review workflows, bake the known edition constants directly into the script prompts rather than relying on `args` plumbing; verify a non-undefined edition appears in the first agent's prompt before trusting results.

### 2026-Q3 rehearsal — BLOCKER: extractor never copied the source PDF into public/
- **Observed:** Extraction set newsletter `filePath` to `public/SAPA-PHILATEX-Third-Quarter-2026.pdf` and index/newsletter.html linked it, but never copied the PDF there — every download link would 404. The all-GREEN contract missed it because no assertion checked PDF existence.
- **Source:** review-panel (diff-safety) — **Status:** promoted → agent Step 5 now copies `$PDF_PATH` into public/; new contract assertion `[S4]` "PDF exists at filePath"; SKILL.md Phase 10 verification. Lesson: a passing test that omits a check is incomplete — the contract is only as good as its assertions.

### 2026-Q3 rehearsal — build:search:embed appended duplicate index blocks (compounding bug)
- **Observed:** `scripts/build-search-embedded.js` inserted a new `window.SEARCH_INDEX_DATA` block on every run without removing the prior one. search.html had accumulated 12 dead blocks (13 after Q3), ~250KB+ bloat, growing every quarter; only the last block runs.
- **Source:** review-panel (diff-safety) — **Status:** promoted → fixed the script to strip existing block(s) before inserting (idempotent replace); regenerated search.html down to one block.

### 2026-Q3 rehearsal — extractor left meetings.json metadata counts stale
- **Observed:** `metadata.totalMeetings`/`upcomingMeetings` were not updated after appending 13 meetings (showed 41/40 vs 66 actual; were already stale pre-Q3).
- **Source:** review-panel (data-and-ics) — **Status:** promoted → agent Step 5 now recomputes both counts; corrected to 66/12 for the Q3 commit.

### 2026-Q3 rehearsal — PROCESS: a review-panel dimension returned a placeholder
- **Observed:** The content-fidelity reviewer (technical-writer agentType) returned a "test payload" instead of real analysis; the orchestrator had to verify that dimension (the officer change) manually.
- **Source:** orchestration self-observation — **Status:** logged → consider a cheap output-sanity check on each review dimension (reject results whose findings look like placeholders) and re-run that dimension before trusting the panel as complete.

### 2026-Q3 (post-publish) — extractor left two dated home-page sections on stale Q2 content
- **Observed:** After publishing, the user found index.html's "Club News & Announcements" cards (old new members, June 19 picnic, May 29 program, April auction) and the "Upcoming TSDA Stamp Shows" table (caption "for Q2 2026", April–June rows) were never updated. Step 7 only updated the meeting table + newsletter banner. meetings.html's TSDA section WAS correct, so the miss was index.html-specific.
- **Source:** human-correction (post-publish) — directly downstream of the content-fidelity reviewer no-op (it would have caught this).
- **Generalizable rule:** A page can have several dated sections; update ALL of them and grep each page for prior-quarter markers before declaring done.
- **Status:** promoted → agent Step 7 (index.html now lists both sections + a "check every dated section" caution), data-contract.md §B, new contract assertion [H1]. Reinforces: the content-fidelity review dimension must actually run — a no-op there let a real gap ship.

### 2026-Q4 — FORMAT DRIFT: masthead no longer names the quarter; bimonthly from January 2027
- **Observed:** Page 1 reads "Vol 132 #4 · October – December 2026" with no "Fourth Quarter" text, so the edition id was inferred from the months. Page 6 says that beginning in January 2027 The Philatex will "(hopefully)" return to a bimonthly schedule.
- **Source:** format-drift
- **Generalizable rule:** Identify the edition from the masthead's date range, not only from a "Nth Quarter" phrase. A bimonthly issue will break every quarter-based assumption: the `YYYY-QN` id pattern and quarter enum, PDF and `sapa-qN` ICS naming, `check-ics --edition`, the quarter logic in `js/pages/meetings.js`, and `CALENDAR.DATE_RANGE.MAX` (2026-12-31).
- **Seen in:** 2026-Q4
- **Status:** proposed (awaiting human): decide the id and naming scheme for bimonthly issues before the January 2027 edition arrives.

### 2026-Q4 — type-mapping traps (holiday party, Blue-Chip nights)
- **Observed:** Research flagged three calendar cells that the agent's type table would mislabel. "Club Holiday Party" matches the HOLIDAY row, which gives `holiday`, and the loader renders that as NO MEETING. Nov 20 (bourse) and Dec 4 (BOG) both mention "Blue-Chip Auction Lot Viewing" and could be typed `auction`. The contract pinned them as `special` / `social` / `business`, and extraction got them right.
- **Source:** review-panel (research critic)
- **Generalizable rule:** Only a cell whose main event is an auction gets type auction. A non-cancelled party is `special` with real times; `holiday` always means cancelled.
- **Seen in:** 2026-Q4 (the 2025-12-12 party used `holiday` with `cancelled:false`, a bad precedent)
- **Status:** logged

### 2026-Q4 — extractor leaked process wording and dropped a source hedge
- **Observed:** The QC loop caught 5 minors, all text the extraction wrote:
  - reviewer language in public copy: "Per the newsletter,", and "roster and mailing address unchanged" (a comparison, not content);
  - "(hopefully)" dropped from two headings or titles that describe the bimonthly return;
  - "memorial tribute" wording the operator had dropped.

  Review 1 found the second hedge only after round 1 fixed the first.
- **Source:** review-panel (QC loop, rounds 1–2; codex agreed on the roster item)
- **Generalizable rule:** Public copy states source facts only, never where they came from or how they compare with the site. When fixing a wording defect, grep every surface this edition wrote for the same claim, not just the cited one.
- **Seen in:** 2026-Q4
- **Status:** logged (candidate agent rule if it recurs)

### 2026-Q4 — auction/bourse template notes are not in the source
- **Observed:** The club auctions carry "Cash or check accepted", "10% commission", "donated materials" and an 8:45 PM checkout. The bourses carry "$10/$15 dealer table" fees. None of this appears in the Q4 PDF. The same text is on every Q3 2026 auction and bourse.
- **Source:** review-panel (4 reviewers + codex)
- **Generalizable rule:** Whether to keep site-convention notes that a newsletter doesn't restate is the operator's call, not the extractor's.
- **Seen in:** 2026-Q3, 2026-Q4
- **Status:** fee part promoted → philatex-newsletter-agent.md (item 4, "Bourses carry no table fee or price") and acceptance-contract.md §"Assertion categories" 7 (club officer, 2026-09-30: no dealer-table fee charged; removed from every meeting; provisional until he confirms at the next club meeting, and if he reverses it, retire that assertion by operator ruling). Confirmed current by the same officer, kept as is: "Cash or check accepted" and the 10% commission. Still proposed (awaiting human): "donated materials", the 8:45 PM checkout, and "Contact secretary to reserve tables".

### 2026-Q4 — PROCESS: Codex cross-model review needs `codex-auto-review` on this account
- **Observed:** codex-cli 0.135.0 could not parse the service's model list. The operator approved an upgrade to 0.159.2. gstack's default `gpt-6-astra` then returned 400 ("not supported when using Codex with a ChatGPT account") and `gpt-5.5` returned 404. `codex-auto-review` worked, through the custom-instructions `codex exec` path, since the diff is uncommitted and includes untracked files.
- **Source:** orchestration self-observation
- **Generalizable rule:** Probe the model before the review. On this account, run the cross-model dimension with `-c 'model="codex-auto-review"'`.
- **Status:** logged

### 2026-Q4 — PROCESS: the Workflow args-binding guard caught a bad launch; worktrees need `npm ci` before push
- **Observed:** The first full-review launch passed a literal placeholder string as `args`. The script's `args.contract.length === 45` guard aborted it before any agent ran. Separately, a global `.trim()` on `git status --porcelain` output cut the first path to "rchive.html". The Phase 13 learnings worktree also could not push until `npm ci` ran, because the local CI gate reports NOT VERIFIED (exit 3) without `node_modules`.
- **Source:** orchestration self-observation
- **Generalizable rule:**
  - Keep an args-binding guard at the top of every review script (this reinforces the promoted Q3 rule).
  - Build path lists with `--untracked-files=all` and a per-line `substr($0,4)`, never a whole-output trim.
  - Run `npm ci` in the learnings worktree too.
- **Status:** logged

### 2026-Q4 — pre-existing site defects found during the run
- **Observed:**
  - **Fixed separately in PR #146:** Q1 2026 individual `.ics` files were an hour early (CDT offset during CST); Q1/Q2 2026 non-BOG meetings were recorded as 7:00 instead of the newsletters' 7:30; the Jan 30 type was wrong.
  - **Still open, separate fixes pending:** site search never renders results in production, because the inline script in `search.html` is HTML-escaped (`&amp;&amp;`); the meetings loader only knows two quarters, and `ci.yml` never deploys `js/`, so production shows the pages' hard-coded fallback blocks.
- **Source:** review-panel / browser UAT
- **Status:** logged

### 2026-Q4 — Phase 14 live verification: PASS (2026-09-30, after #147 and #146 deployed)
- **Observed:** On sastamps.org, in a fresh headless-browser context with cache-busted URLs:
  - the homepage shows "SAPA PHILATEX – Fourth Quarter 2026", published October 1, 2026;
  - the Q4 PDF returns 200 at 653,527 bytes, equal to `origin/main`;
  - the Meetings page lists all 13 Q4 dates and the calendar widget renders;
  - the quarterly `.ics` and all 13 individual `.ics` files return 200;
  - the TSDA caption reads "for Q4 2026", all four Q4 announcement cards are present, and no Q3 text or "Honoring Steve Mabie" banner remains;
  - there are 0 console errors on the homepage, newsletter and meetings pages.

  Before #147 deployed, the live Meetings schedule was blank, because the bundle had switched to Q4 on about Sep 16 and no Q4 data existed.
- **Source:** live verification
- **Generalizable rule:** The Meetings bundle rolls to the next quarter 14 days before the quarter ends, so an edition should deploy by roughly the 15th of the quarter's last month or the live schedule goes empty. PR #149 makes an empty quarter fall back to the current one.
- **Status:** logged

### 2026-09-30 — DECIDED: bimonthly edition id and naming (resolves the 2026-Q4 "FORMAT DRIFT … bimonthly from January 2027" item)
- **Observed:** The 2026-Q4 run logged, as `proposed (awaiting human)`, that a return to a bimonthly schedule in January 2027 would break every quarter-based assumption. The operator chose a scheme before the January 2027 issue.
- **Source:** human-decision
- **Generalizable rule:** Find the edition from the masthead's month span. Three months is `YYYY-QN`. Two months is `YYYY-MM`, where MM is the issue's first month (Jan/Feb 2027 → `2027-01`). For a bimonthly issue the title is `SAPA PHILATEX January/February 2027` and the PDF is `public/SAPA-PHILATEX-January-February-2027.pdf`. The aggregate ICS is `public/sapa-2027-01-meetings.ics`. The `newsletters.json` entry carries `months` instead of `quarter`. Individual `.ics` naming is unchanged. Existing `YYYY-QN` ids are never rewritten. The meetings page stays quarter-based, because the meeting schedule does not follow the newsletter's cadence.
- **Seen in:** 2026-Q4 (announcement on p.6)
- **Status:** decided and implemented. The 2026-Q4 item above is superseded by this entry. Changed: `newsletter.schema.json` (both id patterns, plus a conditional that requires `quarter` or `months`), `check-ics.mjs --edition YYYY-MM` (with `check-ics.test.mjs`), SKILL.md Phase 3/4b/8/10/11/14, data-contract.md §A–D, acceptance-contract.md, and philatex-newsletter-agent.md. Still open: `js/modules/template-engine.js` (`{quarter} Quarter {year}`) and the pages' general "quarterly" prose. These need a separate, operator-approved change.
