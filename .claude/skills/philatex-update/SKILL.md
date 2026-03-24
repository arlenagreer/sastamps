---
name: philatex-update
description: |
  Update the SAPA website with content from a new Philatex newsletter PDF.
  Reads the PDF, checks for duplicate editions, then hands off to the
  extraction and update workflow. Use when asked to "update newsletter",
  "process Philatex", "update site with new Philatex", or given a PDF path
  with "/philatex-update".
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# /philatex-update

Quarterly newsletter update workflow for the San Antonio Philatelic Association website. This skill validates a new Philatex PDF, identifies its edition, checks for duplicates, and hands off to the extraction agent.

## Step 1: Input Parsing

Parse the user's invocation for the PDF path:

- **First argument:** path to the Philatex newsletter PDF (required)
- If no PDF path is given, ask the user to provide one before proceeding

Example: `/philatex-update ~/Downloads/philatex-q3-2026.pdf`

## Step 2: File Validation

Validate the provided PDF path before proceeding:

1. Check the file exists: `[ -f "$PDF_PATH" ]`
2. Check it has a `.pdf` extension (case-insensitive)
3. If the file does not exist or is not a PDF, report the error and **STOP**

Do not proceed to edition identification if validation fails.

## Step 3: Edition Identification

Read the PDF to determine which edition it is:

1. Use the **Read** tool on the PDF path (no `pages` parameter needed -- newsletters are under 10 pages)
2. Look at page 1 for the masthead: "THE PHILATEX" with the quarter and year (e.g., "Second Quarter 2026")
3. Map the quarter name to the edition ID format `YYYY-QN`:
   - First = Q1
   - Second = Q2
   - Third = Q3
   - Fourth = Q4
4. Construct the edition ID (e.g., "2026-Q3")

**The newsletter always identifies itself on page 1. Do NOT rely on the filename.**

## Step 4: Duplicate Check

Before any file modifications, check whether this edition has already been processed:

1. Read `data/newsletters/newsletters.json`
2. Inspect the `id` field of every entry in the `newsletters` array
3. Compare each `id` against the constructed edition ID (e.g., "2026-Q3")

**If a match is found:**
> "Edition {ID} already exists in newsletters.json. This newsletter has already been processed. No changes made."

**STOP.** Do not modify any files.

**If no match is found:** proceed to Step 5.

## Step 5: Handoff to Extraction Workflow

When the duplicate check passes:

1. Report: "Edition {ID} is new. Proceeding with extraction and update workflow."
2. Pass the following context to the Phase 11 agent:
   - PDF file path
   - Identified edition year (e.g., 2026)
   - Identified quarter name (e.g., "Third")
   - Constructed edition ID (e.g., "2026-Q3")
3. The Phase 11 agent handles all content extraction, data file updates, HTML updates, ICS generation, and schema validation.

> TODO: Phase 11 will define the agent at `.claude/agents/philatex-newsletter-agent.md`

**Post-agent behavior:** The skill resumes after the agent completes to handle the human checkpoint (Phase 12). The commit happens in the skill after checkpoint approval, not in the agent.

---

## Reference Checklist

A quick-reference card for the downstream agent. For full field definitions, see the validation schemas.

### A. JSON Data Files

**`data/newsletters/newsletters.json`**
- Key fields: `id` (YYYY-QN), `title`, `quarter` (First/Second/Third/Fourth), `year`, `publishDate` (YYYY-MM-DD, first day of quarter), `filePath` (public/SAPA-PHILATEX-...), `description`, `featuredArticles[]`, `highlights[]`, `tags[]`, `pageCount`, `fileSize`, `status`
- Validate against: `data/schemas/newsletter.schema.json`
- Known gap: `featuredArticles.category` enum does not include "Calendar" or "Humor" -- flag any articles using these categories for human review rather than silently inserting them

**`data/meetings/meetings.json`**
- Key fields: `id` (YYYY-MM-DD), `date`, `time` (doorsOpen required), `location`, `type` (regular/business/auction/exhibition/social/special/picnic/holiday), `title`, `presenter`, `cancelled`
- Validate against: `data/schemas/meeting.schema.json`
- Note: existing data uses `bogStart` as an extension not in schema -- include for BOG meetings

**`metadata` block in newsletters.json**
- Update: `lastUpdated` (ISO date), `totalIssues` (+1), `latestIssue` (new edition ID)

### B. HTML Pages -- Section IDs Receiving Updates

| Page | Section ID | Content |
|------|-----------|---------|
| `index.html` | `#main-content` | Upcoming meeting info, latest newsletter link |
| `index.html` | `#meeting-schedule` | Schedule highlights |
| `newsletter.html` | `#main-content` | Current issue section, archive year section |
| `meetings.html` | `#main-content` | Meeting list overview |
| `meetings.html` | `#meeting-schedule-container` | Meeting schedule list |
| `meetings.html` | `#calendar-container` | Calendar widget data |
| `about.html` | `#main-content` | Board of Governors roster (if changed) |
| `contact.html` | -- | Mailing address block (if changed) |

### C. ICS Naming Conventions

- **Individual meeting files:** `data/calendar/YYYY-MM-DD-meeting.ics` (e.g., `2026-07-03-meeting.ics`)
- **Quarterly schedule bundle:** `public/sapa-qN-YYYY-meetings.ics` (e.g., `public/sapa-q3-2026-meetings.ics`)
- **ICS UID format:** `YYYYMMDDTHHMMSSZ-sapa@sastamps.org`
- **ICS PRODID:** `-//San Antonio Philatelic Association//SAPA Meetings//EN`

### D. PDF Naming Convention

- New PDF destination: `public/SAPA-PHILATEX-[Quarter]-Quarter-[Year].pdf`
- Example: `public/SAPA-PHILATEX-Third-Quarter-2026.pdf`
- Quarter word mapping: Q1=First, Q2=Second, Q3=Third, Q4=Fourth

---

## Permitted-File Scope Boundary

```
PERMITTED FILES (agent may modify freely):
  data/newsletters/newsletters.json
  data/meetings/meetings.json
  data/calendar/*.ics              (new files only)
  public/*.ics                     (new files only)
  public/*.pdf                     (additions only, no deletions)
  index.html
  newsletter.html
  meetings.html
  about.html
  contact.html

SCOPE RULE: Any file NOT on this list requires explicit human
confirmation before modification. If the agent identifies out-of-scope
changes it believes are needed, it must report them in the checkpoint
summary rather than making them.
```

---

## Important Rules

1. **This skill does NOT extract content, update files, validate schemas, or run build commands.** Those are Phase 11 agent responsibilities.
2. **This skill does NOT commit changes.** Commits happen after the Phase 12 human checkpoint approval.
3. **This skill does NOT ask the user what edition the PDF is.** It reads the PDF to determine the edition automatically.
4. **The duplicate check is mandatory.** Never skip it, even if the user says "just update it."
5. **The permitted-file list is the source of truth for scope.** Any modification outside this list must be flagged, not performed.
