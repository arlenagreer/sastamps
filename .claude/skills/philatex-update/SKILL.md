---
name: philatex-update
description: |
  Update the SAPA website with content from a new Philatex newsletter PDF.
  Reads the PDF, checks for duplicate editions, extracts content, updates
  site files, and presents changes for review. Use when asked to "update
  newsletter", "process Philatex", "update site with new Philatex", or
  given a PDF path with "/philatex-update".
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---

# /philatex-update

Quarterly newsletter update workflow for the San Antonio Philatelic Association website. This skill validates a new Philatex PDF, identifies its edition, checks for duplicates, extracts content via the philatex-newsletter-agent, verifies the agent's work, and presents changes for human review before committing.

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

## Step 5: Extraction and Update Workflow

When the duplicate check passes:

1. Report: "Edition {ID} is new. Proceeding with extraction and update workflow."
2. Spawn the extraction agent with the following context:

   Agent: `philatex-newsletter-agent`
   Context to pass:
   - PDF_PATH: the validated PDF file path (absolute)
   - EDITION_YEAR: the identified year (e.g., 2026)
   - QUARTER_NAME: the identified quarter name (e.g., "Third")
   - EDITION_ID: the constructed edition ID (e.g., "2026-Q3")

   Files the agent must read before starting:
   - `.claude/agents/philatex-newsletter-agent.md` (its own instructions)
   - `data/schemas/newsletter.schema.json` (validation target)
   - `data/schemas/meeting.schema.json` (validation target)
   - `data/newsletters/newsletters.json` (current catalogue)
   - `data/meetings/meetings.json` (current meetings)

3. The agent handles all extraction, validation, data file updates, ICS generation, HTML updates, and ESBuild rebuild.
4. The agent does NOT commit. It returns a structured summary of all changes.

## Step 6: Post-Agent Verification

After the agent completes, verify its work before proceeding to checkpoint:

1. Confirm the agent reported build success (`npm run build:js` exit code 0)
2. Confirm all expected files were modified:
   - `data/newsletters/newsletters.json` (must contain new edition ID)
   - `data/meetings/meetings.json` (must contain new quarter dates)
   - At least one ICS file in `data/calendar/` for the new quarter
   - Quarterly aggregate ICS in `public/`
   - `index.html`, `newsletter.html`, `meetings.html` updated
3. Count [UNVERIFIED] markers across all modified files
4. If the agent reported any errors or failed the build, report the failure and STOP

If verification passes, proceed to the human checkpoint (Phase 12).

**Post-agent behavior:** After Step 6 verification passes, proceed to Step 7 (Human Checkpoint).

## Step 7: Human Checkpoint

After Step 6 verification passes, present the human checkpoint. This is the ONLY place where the skill pauses for human input.

### 7a. Key-Facts Summary

Build a 10-item key-facts summary from the agent's Step 9 output. Present these 10 FIXED categories in this EXACT order (red-flags-first):

1. `[UNVERIFIED] count` -- "0 items" or "N items -- REVIEW REQUIRED". Source: agent summary [UNVERIFIED] Markers count.
2. `Schema validation status` -- "All passed" or "N warnings: {details}". Source: agent summary Schema Validation.
3. `Newsletter ID + title` -- e.g., "2026-Q3: The Philatex -- Third Quarter 2026". Source: agent summary Edition block.
4. `Quarter date range` -- e.g., "July-September 2026". Derive from QUARTER_NAME context variable.
5. `Meetings added` -- count and date span, e.g., "13 meetings, Jul 3 - Sep 25". Source: agent summary Data Statistics.
6. `Officer changes` -- names and roles or "No changes". Source: agent summary (compare about.html modifications).
7. `New members` -- count and names or "None". Source: agent summary announcements.
8. `Announcements` -- count and brief list. Source: agent summary announcements.
9. `TSDA shows` -- count and date range or "None". Source: agent summary.
10. `Files modified` -- count with category breakdown, e.g., "17 files: 2 data, 5 HTML, 13 ICS, 1 build". Source: agent summary Files Created + Files Modified.

Present the 10 items as a numbered list. The entire summary MUST fit under 20 lines. Items 1-2 are red flags -- if either is non-zero/non-pass, add a visible warning line above the summary:

```
--- RED FLAGS DETECTED -- Review items 1-2 carefully ---
```

### 7b. Changes by Category

After the key-facts summary, show a "Changes by Category" section grouping modified files by type:

- **Data Files:** list each with `+N -M` line counts and semantic annotation (e.g., "newsletters.json (+45 -3) -- 1 new edition entry")
- **HTML Pages:** list each with `+N -M` and annotation
- **ICS Calendar:** collapse to single summary line, e.g., "13 individual + 1 quarterly .ics files generated"
- **Build Output:** note rebuild status

Get line counts using `git diff --stat` on each modified file. This section shows SCOPE, not content -- the key-facts summary already covers semantics. The human can run `git diff <file>` for line-by-line detail.

### 7c. Proposed Commit Message

Propose a conventional commit message for the update, e.g.:

```
content(Q3-2026): add Third Quarter 2026 newsletter update
```

Show this at the end of the checkpoint so the human can review or adjust it.

### 7d. Approve/Reject Prompt

After presenting the summary and diff overview, prompt the human for a decision. Present two explicit options: **Approve** (commit all staged changes) or **Reject** (revert all changes). The human may also type free-form feedback instead of selecting an option -- this triggers the fix-and-retry loop.

If the human types feedback (anything other than "approve" or "reject"), treat it as a correction request. Make the requested changes, then re-present the full checkpoint from 7a. This loop continues until the human approves or rejects.

## Step 8: Rejection -- Clean Revert

When the human selects "Reject":

1. Identify all files modified during this run. Source: the agent's Step 9 summary (Files Created + Files Modified lists).
2. For files that existed before the run (modified files): run `git checkout -- <file>` for each one to revert to HEAD state.
3. For files that were newly created during the run (new ICS files, new PDF in public/): run `rm <file>` for each one.
4. After revert, run `npm run build:js` to restore the build output to pre-run state.
5. Verify clean state: run `git status` and confirm no uncommitted changes remain in permitted-file scope.
6. Report: "All changes reverted. Working tree restored to pre-run state. No files were committed."

This is all-or-nothing. Never partially revert. The entire update is treated as an atomic transaction -- either everything is committed or nothing is.

## Step 9: Approval -- Atomic Commit

When the human selects "Approve":

1. Stage all modified and newly created files: `git add <file>` for each file from the agent's Files Created + Files Modified lists. Do NOT use `git add .` or `git add -A` -- only add files from the permitted-file scope.
2. Also stage the build output files in `dist/` that were regenerated by `npm run build:js`.
3. Commit with the proposed conventional commit message from Step 7c: `git commit -m "<message>"`.
4. Report: "Changes committed: <commit hash>. Run `git push` when ready to deploy."

Do NOT push. The human controls when to push to the remote.

---

## Reference Checklist

A quick-reference card for the downstream agent. For full field definitions, see the validation schemas.

### A. JSON Data Files

**`data/newsletters/newsletters.json`**
- Key fields: `id` (YYYY-QN), `title`, `quarter` (First/Second/Third/Fourth), `year`, `publishDate` (YYYY-MM-DD, first day of quarter), `filePath` (public/SAPA-PHILATEX-...), `description`, `featuredArticles[]`, `highlights[]`, `tags[]`, `pageCount`, `fileSize`, `status`
- Validate against: `data/schemas/newsletter.schema.json`
- Schema includes "Calendar" and "Humor" in `featuredArticles.category` enum (added in Phase 11)

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
6. **After the agent completes, verify its summary before presenting the checkpoint.** If the build failed or required files were not updated, do NOT proceed to checkpoint.
7. **The human checkpoint (Step 7) is MANDATORY.** Never skip it, even if all validations pass and there are zero [UNVERIFIED] markers.
8. **On rejection, revert ALL changes.** Never leave partial modifications. The working tree must return to the exact state before the skill was invoked.
9. **On approval, commit ALL changes atomically.** Use `git add` with explicit file paths, never `git add .` or `git add -A`.
10. **The fix-and-retry loop has no limit.** The human can request as many corrections as needed before approving or rejecting.
