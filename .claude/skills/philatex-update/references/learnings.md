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
