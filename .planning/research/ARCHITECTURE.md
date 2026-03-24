# Architecture Patterns: PDF Reading and Content Extraction in Claude Code

**Domain:** Claude Code agent PDF processing for newsletter-driven site updates
**Researched:** 2026-03-24
**Confidence:** HIGH (primary claims verified via official Anthropic docs and Claude Code issue tracker)

---

## Summary

The Philatex Update Agent reads a local newsletter PDF, extracts structured content, and uses
that content to update JSON data files and HTML pages. This document covers how to perform
each step within Claude Code, what the real constraints are, and the recommended approach for
mapping extracted content to the existing data file schema.

The SAPA Philatex newsletter is a 5-page document (Q2 2026 = 577 KB). All PDFs in the archive
are under 10 MB. This keeps the agent well within Claude Code's native PDF reading limits.

---

## Section 1: PDF Reading Tools Available in Claude Code

### 1.1 The Read Tool (Primary Approach)

Claude Code's built-in Read tool handles local PDF files natively. No conversion, no
preprocessing, no shell commands needed for standard text-based PDFs.

**How it works:**
- The agent calls `Read` with the absolute file path and, for PDFs over 10 pages, a page range
- The tool extracts text from each page and converts each page to an image
- Claude receives both the extracted text and the visual representation of each page
- This dual text+image processing lets Claude read tables, understand layout, and interpret
  content that spans visual and textual elements

**Parameters:**
- `file_path` — absolute path to the PDF (required)
- `pages` — page range string like `"1-5"` (required for PDFs over 10 pages, optional for smaller)
- `limit` and `offset` — not applicable to PDFs; use `pages` instead

**Limits (verified via official Claude Code docs and issue tracker):**
| Constraint | Value |
|-----------|-------|
| Max pages per Read call | 20 |
| PDFs under 10 pages | Can be read without `pages` parameter |
| PDFs over 10 pages | MUST specify `pages` parameter or call will fail |
| File type | Standard PDF only (no encrypted/password-protected) |
| File location | Local filesystem only (absolute path required) |
| Max request size | 32 MB (the entire request payload) |

**SAPA newsletter fit:** Q2 2026 is 5 pages / 577 KB. All known Philatex issues are under 15
pages. A single Read call without a `pages` parameter will handle any issue in the archive.
The 20-page limit is not a practical concern for this project.

**Example invocation in agent:**
```
Read tool: file_path="/Users/arlenagreer/Github_Projects/sastamps/public/SAPA-PHILATEX-Second-Quarter-2026.pdf"
```
No `pages` parameter needed for a 5-page newsletter.

### 1.2 Bash + pdftotext (Fallback for Text-Only Extraction)

If the Read tool fails (corrupted PDF, unexpected format, session error), `pdftotext` is the
reliable fallback. It is available on macOS via Homebrew (`brew install poppler`) and strips
the PDF to plain text.

```bash
pdftotext -layout /path/to/newsletter.pdf -
```

The `-layout` flag attempts to preserve column alignment, which matters for tables like the
meeting calendar. The `-` sends output to stdout.

**When to use:** Only as fallback. The Read tool gives Claude visual understanding of the page
layout, which is valuable for interpreting the newsletter's multi-column calendar table. Text-
only extraction loses that context.

### 1.3 What Does NOT Work

**Claude Code Read tool with image files (unreliable):** GitHub issue #35866 (consolidated,
open as of March 2026) documents that the Read tool fails to reliably deliver image content
to the model on some platforms and providers. PDFs are processed differently from raw images
and are not affected by this bug — the PDF path is handled via the PDF support pipeline, not
the image pipeline. Do not confuse the two.

**Remote PDF URLs:** The Read tool only works with local filesystem paths. If the PDF is only
accessible via URL, download it first using Bash + curl.

**Encrypted/password-protected PDFs:** Not supported. Standard newsletter PDFs are never
encrypted.

---

## Section 2: Content Extraction Strategy

### 2.1 What the Philatex Newsletter Contains

Based on the Q2 2026 newsletter (reviewed in quick task #2):

| Page | Content |
|------|---------|
| 1 | Masthead, meeting calendar table (3-column: April/May/June rows with date + description) |
| 2 | Club news: new members, announcements, BOG roster, website updates |
| 3 | Features: "Did You Know?", "Talking Stamps", start of feature article |
| 4 | Feature article continuation, BOG/officer listing, TSDA show schedule |
| 5 | Postcard club info, mostly whitespace |

The newsletter follows a consistent quarterly structure. Future issues will follow the same
pattern with different content.

### 2.2 Extraction Prompt Design

**Single-pass extraction is the right approach.** The newsletter is small (5 pages) and
thematically consistent. One Read + one extraction prompt produces all needed data in a
single response. Splitting into multiple passes adds complexity without benefit.

**Prompt structure for extraction:**

The agent should use a structured extraction prompt that:
1. Presents the desired output schema explicitly (show the JSON structure)
2. Lists each extraction target by section
3. Asks for a single JSON object as the response
4. Includes instructions for ambiguous cases (e.g., "if a meeting type is unclear, use 'regular'")

**Example extraction prompt pattern:**
```
You have just read the Philatex newsletter PDF. Extract the following structured data and
return it as a single JSON object matching this schema:

{
  "newsletter_metadata": { ... },
  "meetings": [ ... ],       // each meeting in meetings.json format
  "officers": { ... },       // key:value pairs of role:name
  "announcements": [ ... ],  // list of string announcements
  "tsda_shows": [ ... ],     // stamp show entries
  "featured_articles": [ ... ]
}

Rules:
- Meeting dates: use YYYY-MM-DD format
- Meeting IDs: same as date (YYYY-MM-DD)
- If a meeting is cancelled, set "cancelled": true
- Standard location fields are: MacArthur Park Lutheran Church, 2903 Nacogdoches Road, ...
- Standard times are: doorsOpen "6:30 PM", BOG "7:15 PM", other meetings "7:30 PM"
```

### 2.3 Extraction Targets and Their Complexity

| Target | Complexity | Notes |
|--------|-----------|-------|
| Meeting calendar | Medium | 3-column table; must parse 13+ rows per issue; holiday entries have no time |
| Officer roster | Low | Usually on page 4, consistent table format |
| New member names | Low | Short list, always in a "New Members" section |
| Newsletter metadata (title, quarter, year) | Low | From masthead/header |
| Featured articles | Low | Titles and page numbers visible from layout |
| TSDA show schedule | Medium | Table with date ranges, show names, locations |
| Announcements | Medium | Free-form prose; agent must identify discrete announcements |
| Page count | Low | Count pages read |
| File size | Low | Read from filesystem with Bash stat command |

### 2.4 Handling the Meeting Calendar Table

The meeting calendar is the most complex extraction target. The newsletter lays it out as a
3-column table (one column per month). Each row is a week/date. Example from Q2 2026:

```
April           May              June
4/03 NO MTG     5/01 BOG...     6/05 BOG...
4/10 BOG...     5/08 Auction... 6/12 Auction...
...
```

**Extraction guidance:**
- Claude's visual PDF understanding reads this table correctly because it receives both text
  and image data. A text-only extraction via pdftotext may scramble column order.
- The agent should explicitly tell Claude in the prompt: "The calendar is a 3-column table;
  column 1 = April, column 2 = May, column 3 = June."
- Holiday/no-meeting entries use cancelled=true and require special time handling (use "N/A")
- The picnic meeting has a non-standard start time (6:00 PM instead of 6:30) — the agent
  should watch for this and not apply the standard time defaults blindly

### 2.5 Inferring Meeting Types

The newsletter uses informal labels. The agent needs a mapping rule:

| Newsletter Text | meetings.json `type` |
|-----------------|---------------------|
| "NO MEETING", "HOLIDAY" | "holiday", cancelled: true |
| "Board Of Governors Meeting" / "BOG" | "business" |
| "Club Auction" | "auction" |
| "Bourse" | "social" |
| "Stamp Program" (with presenter) | "regular" (or "educational") |
| "Annual Club Picnic" | "special" (or "picnic") |
| Anything unclear | "regular" |

The meeting.schema.json allows: `"regular", "business", "auction", "exhibition", "social",
"special", "picnic", "holiday"`.

---

## Section 3: Data Mapping to Existing JSON Schemas

### 3.1 meetings.json Mapping

Schema file: `data/schemas/meeting.schema.json`
Data file: `data/meetings/meetings.json`

**Required fields per entry:** `id`, `date`, `time`, `location`, `type`

**Standard location block (reuse verbatim for all meetings):**
```json
{
  "name": "MacArthur Park Lutheran Church",
  "building": "Building 1",
  "room": "Fellowship Hall",
  "address": {
    "street": "2903 Nacogdoches Road",
    "city": "San Antonio",
    "state": "TX",
    "zipCode": "78217"
  }
}
```

**Standard time block for regular meetings:**
```json
{
  "doorsOpen": "6:30 PM",
  "bogStart": "7:15 PM",
  "meetingStart": "7:30 PM",
  "meetingEnd": "9:00 PM"
}
```
Note: `bogStart` is not in the official schema (schema uses `doorsOpen` only as required).
The existing data uses `bogStart` as an extension. The agent should include it for BOG
meetings and omit it for non-BOG meetings to match the existing pattern.

**Holiday/cancelled entries:**
```json
{
  "time": { "doorsOpen": "N/A", "meetingStart": "N/A", "meetingEnd": "N/A" },
  "cancelled": true
}
```

**Picnic exception (June 19 in Q2 2026):**
```json
{
  "time": { "doorsOpen": "6:00 PM", "meetingStart": "6:00 PM" },
  "type": "picnic"
}
```

**Append strategy:** The agent reads the current meetings.json, identifies the last date
present, then appends only new entries (from the upcoming quarter). It does not replace the
entire file. The file currently ends at 2026-03-27; Q2 2026 adds 2026-04-03 through 2026-06-26.

### 3.2 newsletters.json Mapping

Schema file: `data/schemas/newsletter.schema.json`
Data file: `data/newsletters/newsletters.json`

**Required fields:** `id`, `title`, `quarter`, `year`, `publishDate`, `filePath`, `description`

**ID pattern:** `YYYY-QN` (e.g., `2026-Q3`)

**Quarter name mapping:**
| Quarter | `quarter` value |
|---------|----------------|
| Q1 (Jan-Mar) | "First" |
| Q2 (Apr-Jun) | "Second" |
| Q3 (Jul-Sep) | "Third" |
| Q4 (Oct-Dec) | "Fourth" |

**publishDate convention:** Use the first day of the first month in the quarter (e.g., Q3 2026
= `2026-07-01`).

**filePath pattern:** `public/SAPA-PHILATEX-[Quarter]-Quarter-[Year].pdf`
Example: `public/SAPA-PHILATEX-Third-Quarter-2026.pdf`

**fileSize:** The agent should get this from the filesystem, not try to extract it from the PDF.
```bash
stat -f "%z" /path/to/newsletter.pdf
```
Then format as human-readable (e.g., `590878` bytes → `"577 KB"`).

**pageCount:** The agent reads the PDF and counts pages. For a 5-page PDF read in one call,
this is simply 5.

**featuredArticles categories:** The schema allows:
`"Feature"`, `"History"`, `"Collection Tips"`, `"Meeting Report"`, `"Show Report"`,
`"Member Spotlight"`, `"News"`, `"Education"`

Note: Q2 2026 used `"Calendar"` and `"Humor"` which are NOT in the schema. The agent should
map to the closest valid category (`"Calendar"` → `"News"`, `"Humor"` → `"Feature"`) or
the schema should be extended. The agent should flag this ambiguity for human review rather
than silently using invalid values.

**Prepend strategy:** New newsletter entries go at the top of the `newsletters` array (most
recent first). The `metadata` block at the bottom must be updated: `lastUpdated`, `totalIssues`
(increment by 1), `latestIssue` (set to new ID).

### 3.3 HTML Page Updates

The agent also updates HTML directly. This is lower-risk than JSON because the HTML changes
are targeted replacements rather than schema-bound data entry.

**Files typically updated:**
| File | What changes |
|------|-------------|
| `newsletter.html` | Current issue section, 2026 archive list |
| `meetings.html` | Meeting schedule table, calendar data |
| `index.html` | Upcoming meeting, latest newsletter link, highlights |
| `about.html` | Officer/BOG roster if changed |

**Approach:** The agent reads the relevant section of each HTML file, identifies the pattern
(by looking at adjacent existing entries), and writes the new entry following the same markup
pattern. The agent should not rewrite entire HTML files — only targeted sections.

---

## Section 4: Agent Workflow Architecture

### 4.1 Recommended Phase Structure for the Agent

```
Phase 1: PDF Intake
  - Accept PDF path (from skill invocation argument)
  - Verify file exists (Bash: ls -la /path/to/file.pdf)
  - Get file size (Bash: stat)
  - Read PDF with Read tool

Phase 2: Structured Extraction
  - Run single extraction prompt against PDF content
  - Output: raw extracted JSON object
  - Validate against schemas (check required fields present)
  - Flag any anomalies for human review

Phase 3: Data File Updates
  - Append meeting entries to meetings.json
  - Prepend newsletter entry to newsletters.json
  - Update metadata block in newsletters.json

Phase 4: HTML Updates
  - Update newsletter.html (current issue + archive entry)
  - Update meetings.html (schedule table)
  - Update index.html (upcoming meeting, newsletter link)
  - Update about.html if officer roster changed

Phase 5: Build
  - Run npm run build:js to rebuild meeting bundle
  - Run npm run build:css if needed

Phase 6: Human Checkpoint
  - Present diff summary to user
  - List all files changed
  - Request confirmation before committing
```

### 4.2 Non-Linear Considerations

The agent does not need to be strictly sequential. Phases 3 and 4 are largely independent.
However, Phase 2 must complete before Phases 3 and 4. Phase 5 must follow all data file
updates. Phase 6 always comes last.

The agent should detect idempotency: if the newsletter entry already exists in newsletters.json
(by checking the `id` field), it should skip that step and report it was already done.

### 4.3 Skill Entry Point

The `/philatex-update` skill accepts a PDF file path as its argument:
```
/philatex-update /path/to/newsletter.pdf
```

The SKILL.md file should include:
- When to invoke (user says "update site with new newsletter", "process Philatex PDF", etc.)
- The full workflow phases above
- Schema references for meetings and newsletters
- Standard location and time defaults
- Instructions for the human checkpoint

---

## Section 5: Limitations and Gotchas

### 5.1 Visual vs. Text-Only Extraction

The Read tool processes PDFs as both text and images. This is important for the meeting
calendar, which is a multi-column table. If the agent ever falls back to `pdftotext`, it must
compensate by explicitly prompting Claude about the expected column structure.

**Confidence: HIGH** — verified from official Anthropic PDF support docs.

### 5.2 The 20-Page Limit Per Read Call

The Philatex newsletter is consistently 3-5 pages. The 20-page limit does not apply here.
If a future issue exceeds 20 pages (extremely unlikely for this newsletter), the agent would
need to use the `pages` parameter and call Read multiple times, then combine the extractions.

**Confidence: HIGH** — verified from Claude Code issue #22908 and Read tool documentation.

### 5.3 Schema Drift

The `featuredArticles.category` enum in newsletter.schema.json does not include all categories
actually used in production (e.g., "Calendar", "Humor"). The agent must validate extracted
data against the schema and surface mismatches rather than silently inserting invalid values.
The schema may need a one-time cleanup.

**Confidence: HIGH** — verified by reading the actual schema and the Q2 2026 data.

### 5.4 The ESBuild Bundle Rebuild Requirement

The meeting data is bundled at build time by ESBuild, not fetched at runtime. This means
updating meetings.json alone is not sufficient — the agent must run `npm run build:js` to
rebuild the bundle. Failure to do this was the root cause of the "stale meetings" bug in
v1.2 (documented in .planning/debug/meetings-stale-content.md).

**Confidence: HIGH** — verified from the v1.2 debug file and build system architecture.

### 5.5 Newsletter-to-Reality Discrepancies

The Q2 2026 newsletter contained a factual error: it said Joe Perez's stamp program was "in
April" but the calendar showed it on May 29. The agent should source meeting dates from the
calendar table (not the prose sections), and flag prose/calendar discrepancies for human
review rather than silently choosing one.

**Confidence: HIGH** — documented in the newsletter review in quick task #2.

### 5.6 Quarterly Timing and Bundle Logic

The meetings.js page bundle uses quarter-based display logic with a 14-day lookahead window.
When the agent adds Q3 meetings in mid-June (within 14 days of Q2 end), the page will
automatically show Q3 meetings after the bundle is rebuilt. The agent does not need to modify
the display logic — it only needs to rebuild the bundle.

**Confidence: HIGH** — from v1.2 debug resolution and source code in js/pages/meetings.js.

### 5.7 ICS Calendar Files

Each meeting also needs a `.ics` calendar file in the calendar files directory. The v1.2
milestone included 13 ICS files for Q2. The agent should generate these as part of Phase 4
or Phase 3. ICS generation is straightforward (VCALENDAR format) and can be done via Bash
or via agent-written strings.

**Confidence: MEDIUM** — based on v1.2 content (ics files shipped) but exact generation
mechanism in v1.2 was not examined in this research.

---

## Sources

- [Claude PDF Support — Official Anthropic Docs](https://platform.claude.com/docs/en/build-with-claude/pdf-support) — HIGH confidence
- [Claude Code Read Tool Description — Piebald-AI system prompt repo](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/tool-description-readfile.md) — HIGH confidence
- [Claude Code Issue #22908 — PDF pages parameter and large-PDF guidance](https://github.com/anthropics/claude-code/issues/22908) — HIGH confidence
- [Claude Code Issue #35866 — Read tool image delivery (not PDF) bug](https://github.com/anthropics/claude-code/issues/35866) — HIGH confidence
- [Claude Code Read PDF: What Works, What Doesn't — AgentPatch](https://agentpatch.ai/blog/claude-code-read-pdf/) — MEDIUM confidence (third-party, consistent with official docs)
- `.planning/quick/2-review-sapa-philatex-q2-2026-newsletter-/NEWSLETTER-REVIEW.md` — newsletter structure reference — HIGH confidence (direct observation)
- `.planning/debug/meetings-stale-content.md` — ESBuild bundle rebuild requirement — HIGH confidence (from actual v1.2 debug)
- `Q2-2026-update-plan.md` — v1.2 manual workflow reference — HIGH confidence (project artifact)
- `data/schemas/meeting.schema.json` and `data/schemas/newsletter.schema.json` — schema definitions — HIGH confidence (source of truth)
