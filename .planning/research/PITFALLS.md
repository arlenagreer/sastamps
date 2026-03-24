# Domain Pitfalls: Claude Code Skills and Content Automation Agents

**Domain:** Newsletter-to-website content automation agent (SAPA Philatex Update)
**Researched:** 2026-03-24
**Confidence:** HIGH (official Anthropic skill docs), MEDIUM (community/practitioner sources)

---

## Critical Pitfalls

Mistakes in these categories cause rewrites, data corruption, or agent failure requiring manual recovery.

---

### Pitfall 1: Prompt Scope Creep — The Agent Does Too Much

**What goes wrong:**
The agent is instructed to "update the website with this newsletter" and interprets that as license to refactor HTML, reorganize JSON structure, touch unrelated files, or "clean up" things it notices along the way. AI agents are documented as over-engineering solutions, adding unnecessary abstractions, or modifying code that works fine because they lack the judgment to say "this is good enough."

**Why it happens:**
Vague scope boundaries + the agent's training to be helpful. A prompt like "update the site" does not define what the agent must NOT do. The agent will do exactly what you said, not what you meant.

**Consequences:**
- Build pipeline breaks because a file outside scope was silently modified
- Lunr.js search index becomes stale if search-indexed files change without rebuilding
- ESBuild tree-shaking silently drops code if import structure is altered
- Orphaned JS modules (data-loader, template-engine, pagination) get re-wired by "helpful" agent

**Prevention:**
Enumerate the explicit file list the agent is permitted to touch in SKILL.md. Use a deny-by-default stance: "Only modify files listed below. If you identify something that SHOULD be changed outside this list, report it in the checkpoint summary — do not make the change."

**Specific SAPA file scope (permitted):**
```
data/newsletters/newsletters.json
data/meetings/meetings.json
index.html
meetings.html
newsletters.html
public/ (new PDF only, no deletions)
```

**Phase to address:** Agent definition phase (before any autonomous execution)

---

### Pitfall 2: PDF Extraction Hallucination — Plausible but Wrong

**What goes wrong:**
The agent reads the newsletter PDF and extracts meeting dates, member names, or article titles with high-sounding confidence, but some details are wrong. LLMs are not OCR engines — if uncertain whether a character is "I" or "1", they output what seems plausible with no indication they were guessing. The agent doesn't know it's wrong.

**Why it happens:**
Claude is reading a rendered document (PDF), not structured data. SAPA's newsletter uses a column-based layout (standard newsletter format). Multi-column pages create reading-order ambiguity — content from column 2 may be interleaved with column 1 text during extraction. The agent fills gaps with plausible inference.

**Consequences:**
- Wrong meeting dates published (e.g., Friday instead of Friday's actual date)
- Wrong member names in "new members" section (a privacy concern)
- Wrong page numbers in `featuredArticles` array
- Wrong program speaker name or topic description

**Prevention:**
1. In the checkpoint summary, require the agent to output a structured extraction table showing what it found and where (page number, section). This forces visible evidence of what was parsed.
2. Write the skill prompt to flag ambiguous extractions explicitly: "If you cannot read a value with confidence, write `[UNVERIFIED]` as the value and note it in the checkpoint report."
3. Cross-reference against the existing JSON schema structure — dates must parse as valid ISO 8601, IDs must match the `YYYY-Qn` pattern.

**Detection:**
Any `[UNVERIFIED]` tokens in agent output. Dates that are not Fridays (SAPA always meets on Fridays). Member names that don't follow human-name patterns.

**Phase to address:** PDF reading step, before any JSON updates are staged

---

### Pitfall 3: Partial Update — Some Files Updated, Others Not

**What goes wrong:**
The agent successfully updates `data/newsletters/newsletters.json` but then encounters an ambiguity in `index.html` and stops (or fails silently), leaving the site in an inconsistent state. The newsletter JSON says Q3 2026 is published but the homepage still shows Q2 2026 content.

**Why it happens:**
Multi-file content updates have implicit dependencies. The v1.2 update required coordinated changes to: `newsletters.json`, `meetings.json`, `index.html`, `meetings.html`, `newsletters.html`, and the archived newsletters catalogue. An agent that errors mid-task leaves this dependency chain broken.

**Consequences:**
- Homepage shows outdated "current issue" while archive shows the new one
- Meeting calendar HTML and meeting JSON get out of sync
- `metadata.totalIssues` counter in newsletters.json is incremented but the HTML page count isn't updated

**Prevention:**
Structure the agent to treat the entire update as an atomic transaction. The SKILL.md workflow should define a "stage all changes" phase before anything is written, followed by a single "apply" phase. The checkpoint happens between staging and applying. If the human rejects any staged change, nothing is applied.

Never write individual files as each extraction step completes — accumulate all proposed changes in a staging summary first.

**Phase to address:** Checkpoint design phase

---

### Pitfall 4: JSON Schema Drift — Agent Invents New Fields or Breaks Existing Ones

**What goes wrong:**
The agent, seeing that Q2 2026 newsletter had a `highlights` array, decides Q3 needs a `summary` field (which it saw in a previous newsletter description). It adds a non-schema field or drops a required field it didn't find in the PDF.

**Why it happens:**
The JSON schemas in `data/schemas/` exist but the agent may not know to validate against them. Without explicit instruction to match the existing schema exactly, the agent uses the existing data as its template — and may drift if the latest newsletter differs from previous ones.

**Consequences:**
- `newsletters.schema.json` validation fails in CI/CD
- Site JavaScript that reads `featuredArticles[].category` breaks if agent uses `type` instead
- `pageCount` is omitted if the agent can't find it, causing display errors

**Prevention:**
1. Load the relevant JSON schema file as part of the skill context. Instruction: "The output JSON must validate against `data/schemas/newsletter.schema.json`. Read this file before generating any JSON."
2. Show the agent the most recent existing JSON entry as a concrete template: "The new entry MUST follow this exact structure."
3. Include a validation step in the workflow: run `node -e "require('./validate.js')"` or a simple JSON schema check before staging.

**Phase to address:** Agent definition + validation step design

---

### Pitfall 5: Checkpoint Fatigue — Human Approves Without Reading

**What goes wrong:**
The checkpoint shows 200 lines of diff. The human clicks "approve" because approvals have been fine in the past and the diff is large and tedious to read. A bad date, wrong member name, or stale field gets committed.

**Why it happens:**
When 95% of permission prompts are legitimate, users train themselves to approve without reading. Security research (Checkmarx "Lies-in-the-Loop") demonstrated that checkpoint fatigue is a predictable neurological response to signal overload — the highest-blast-radius actions go through the weakest checkpoint.

**Consequences:**
- Wrong data is committed and deployed to GitHub Pages
- Member privacy issue if wrong name is published
- Requires manual hotfix commit to correct — exactly the work the skill was meant to avoid

**Prevention:**
Design the checkpoint for skimmability, not completeness. Structure the checkpoint output as:
1. **Red flags** — anything marked `[UNVERIFIED]` or that the agent flagged as uncertain (must read)
2. **Key facts** — 5-10 extracted values the human should spot-check (meeting count, new member names, issue ID)
3. **Full diff** — available but collapsible

Keep the required-reading section under 20 lines. The human's job at checkpoint is to verify key facts, not audit every file.

**Phase to address:** Checkpoint design — highest priority design decision

---

## Moderate Pitfalls

Mistakes that cause significant rework but don't corrupt data or break the site.

---

### Pitfall 6: SKILL.md Too Vague — Agent Makes Judgment Calls You Didn't Intend

**What goes wrong:**
The SKILL.md says "extract meeting information from the PDF and update the meetings data file." The agent updates meetings.json correctly but also re-formats the ICS filename convention because it "seemed inconsistent." Or it extracts 13 meetings when the newsletter shows 12 because it includes the holiday cancellation as an entry.

**Why it happens:**
Vague instructions with multiple valid interpretations. The agent picks the most plausible interpretation, which may not be yours.

**Consequences:**
ICS file generation breaks. Archive links break. Time wasted reviewing unexpected changes.

**Prevention:**
Use the "degrees of freedom" principle from official Anthropic skill docs. High-variability decisions get low-constraint prompts. Fragile, exact-sequence operations get exact scripts and "run exactly this command" instructions. For SAPA:
- Meeting entry format: LOW freedom — show exact JSON template with field-by-field instructions
- Article description writing: HIGH freedom — let the agent write prose
- File naming conventions: LOW freedom — specify exact pattern `YYYY-Qn` and `SAPA-PHILATEX-[Quarter]-Quarter-[Year].pdf`

**Phase to address:** SKILL.md authoring

---

### Pitfall 7: SKILL.md Too Rigid — Agent Fails on Newsletter Format Changes

**What goes wrong:**
The skill is written with instructions like "find the meeting table on page 1" and "look for 'New Members' header on page 2." The Q3 2026 newsletter has a different layout — meetings moved to page 2, new members section was dropped. The agent either extracts garbage or reports failure, blocking the entire workflow.

**Why it happens:**
Content automation skills frequently over-fit to current document structure. The SAPA Philatex newsletter is produced by a volunteer editor — layout consistency is not guaranteed quarter to quarter.

**Consequences:**
Every time the newsletter format changes, the SKILL.md requires manual maintenance. If the skill is brittle and fails silently, corrupted data gets staged.

**Prevention:**
1. Write extraction instructions semantically, not positionally. "Find the list of meeting dates, times, and programs — these may be in a table or list format anywhere in the document" is more robust than "find the table on page 1."
2. Explicitly instruct the agent to report "Section not found: [name]" rather than silently skipping or guessing.
3. Include a version/format detection step: "Before extracting, describe the newsletter's structure — how many pages, what sections are present." This surfaces format changes at the start of the run.
4. Maintain a `references/newsletter-format-history.md` file documenting known layout variations across quarters.

**Phase to address:** SKILL.md authoring

---

### Pitfall 8: Context Window Bloat — Skill Loads Too Much Upfront

**What goes wrong:**
The SKILL.md loads the full meetings.json (300+ entries), newsletters.json, all schemas, and the full HTML of every page it might touch. The context fills up. The agent starts truncating earlier content, forgetting the schema constraints it was given at the start (documented "system prompt drift" — attention weight for early tokens decreases as context grows).

**Why it happens:**
Eager loading is the natural instinct — "give the agent everything it might need." But the skills architecture is designed for progressive, on-demand loading.

**Consequences:**
Agent ignores schema constraints that were loaded early, forgets the "do not touch these files" deny list, or misses file-naming conventions.

**Prevention:**
Follow the progressive disclosure pattern from official Anthropic skill docs. SKILL.md stays under 500 lines. Reference files (schemas, HTML templates, format history) are loaded on-demand via links. Instruct: "Before updating meetings.json, read data/schemas/meeting.schema.json."

Keep the deny-list and key constraints in SKILL.md (never in a reference file) — these must survive throughout the session.

**Phase to address:** SKILL.md structure design

---

### Pitfall 9: Agent Re-Runs Produce Non-Idempotent State

**What goes wrong:**
The agent is run twice for the same newsletter (e.g., human ran it again after approval thinking it didn't complete). The second run appends a duplicate entry to newsletters.json, creating `"id": "2026-Q3"` twice. Or meetings.json gets 13 new entries added on top of the 13 already added.

**Why it happens:**
No guard against re-runs. The agent sees "append new quarter's data" as its job and does it again without checking if the data already exists.

**Consequences:**
Duplicate JSON entries. Site displays the same newsletter twice. Meeting calendar shows duplicate entries. Must manually edit JSON to remove duplicates.

**Prevention:**
The agent's first step should always be an idempotency check: "Before making any changes, verify that the ID `[extracted-id]` does not already exist in the target JSON files. If it does, report this and stop."

**Phase to address:** Agent workflow design (first step of every run)

---

### Pitfall 10: ICS Calendar File Generation Misses or Is Stale

**What goes wrong:**
The agent updates meetings.json with Q3 2026 entries but does not regenerate the ICS calendar files. Or it generates ICS files with incorrect DTSTART/DTEND because the time format from the PDF was ambiguous ("7:30 PM" without timezone).

**Why it happens:**
ICS generation is a downstream side-effect of meeting data updates. The agent's prompt focuses on the JSON data files and HTML pages — ICS generation is easy to forget.

**Consequences:**
Users who import the calendar get an outdated file. Meetings page shows correct HTML but downloadable ICS is wrong.

**Prevention:**
Include ICS regeneration as an explicit step in the SKILL.md workflow checklist, not an optional step. The workflow checklist pattern (checkbox list the agent copies and tracks) prevents skipping. Specify the timezone explicitly: "All times are Central Time (America/Chicago). ICS DTSTART must use `TZID=America/Chicago`."

**Phase to address:** Workflow checklist design

---

## Minor Pitfalls

Nuisances that are caught at review but waste time.

---

### Pitfall 11: Agent Overwrites `metadata.lastUpdated` With Wrong Value

**What goes wrong:**
The `newsletters.json` metadata block has a `lastUpdated` ISO timestamp. The agent sets it to the date the script runs (today) rather than the newsletter's publication date, or it sets it to a non-ISO format.

**Prevention:**
Specify explicitly: "Set `metadata.lastUpdated` to the newsletter's `publishDate` value (first day of the quarter), formatted as ISO 8601 with UTC timezone: `YYYY-MM-DDT00:00:00.000Z`."

---

### Pitfall 12: Description Text is Generic or Hallucinated

**What goes wrong:**
The agent writes the newsletter `description` field with vague filler ("Features the usual club news and meeting schedule") or confabulates article content it didn't actually read.

**Prevention:**
Require the agent to quote specific details from the PDF in the description — article titles, speaker names, event names. A description containing only generic phrases is a signal the agent did not actually read the content.

---

### Pitfall 13: SKILL.md Becomes a Maintenance Liability Over Time

**What goes wrong:**
The skill works perfectly for Q3 2026. Over the next year, the newsletter format evolves, new JSON fields are added, a new page (e.g., "Programs" page) is added to the site. The SKILL.md silently becomes stale — it works but produces incomplete updates. Nobody notices until a significant field is missing from several quarters of data.

**Prevention:**
Add a `## Changelog` section to SKILL.md. When any target file's schema changes, update SKILL.md in the same commit. Treat the skill as code: it belongs in code review when data schemas or HTML page structure changes.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| SKILL.md authoring | Too vague = agent guesses; too rigid = breaks on format changes | Use degrees-of-freedom principle; semantic not positional extraction |
| PDF reading step | Hallucinated values from column layouts | Require `[UNVERIFIED]` markers; structured extraction report |
| Agent definition | Scope creep into unrelated files | Explicit permitted-file list; deny-by-default |
| JSON update step | Schema drift, new fields, missing fields | Load schema before writing; validate output |
| Checkpoint design | Approval blindness from large diffs | Checkpoint shows key facts + red flags, not full diff first |
| ICS generation | Skipped as non-obvious side effect | Checklist step in SKILL.md workflow |
| Re-run safety | Duplicate data entries | Idempotency check as first agent step every run |
| Skill maintenance | Stale instructions after schema/format evolution | Changelog section; update skill with schema changes |

---

## Anti-Patterns to Avoid in Skill/Prompt Design

### Anti-Pattern 1: "Update the website with this newsletter"
**Why bad:** No scope boundary. Agent will interpret this as broadly as needed.
**Instead:** "Make only the following changes: [explicit list]. Report anything else you notice but do not act on it."

### Anti-Pattern 2: Loading Full JSON Files as Context
**Why bad:** 300-entry meetings.json in context wastes tokens and causes prompt drift.
**Instead:** Load only the schema and the most recent 1-2 entries as templates. Write new entries against the schema.

### Anti-Pattern 3: "Extract all information from the PDF"
**Why bad:** No priority order. Agent extracts everything, some of it wrong, with no indication of confidence.
**Instead:** Define what to extract, in priority order, with explicit field names matching the JSON schema, and require `[UNVERIFIED]` for anything ambiguous.

### Anti-Pattern 4: One Long Continuous Task
**Why bad:** No recovery point if extraction is wrong. All-or-nothing execution with no review window.
**Instead:** Two-phase workflow: Phase 1 = read and stage (ends with checkpoint). Phase 2 = apply staged changes (only runs after human approval). Each phase is atomic.

### Anti-Pattern 5: Positional PDF Instructions
**Why bad:** "Look for the meeting table on page 1" breaks when layout changes.
**Instead:** "Find the meeting schedule — it will be a structured list of dates, times, and programs. It may appear on any page."

### Anti-Pattern 6: Checkpoint That Shows Only Diffs
**Why bad:** A 200-line diff requires full audit to spot one wrong date. Human approves without reading.
**Instead:** Checkpoint summary leads with human-readable key facts: meeting count, quarter ID, new members list, issue title. Diff is secondary.

### Anti-Pattern 7: Deeply Nested Reference Files in SKILL.md
**Why bad:** SKILL.md points to `advanced.md` which points to `details.md`. Claude may use `head -100` and get incomplete information, leading to partial instruction application.
**Instead:** All reference files linked directly from SKILL.md, one level deep.

---

## Sources

- [Skill authoring best practices — Anthropic Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) (HIGH confidence — official docs)
- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills) (HIGH confidence — official docs)
- [AI's Dirty Secret: It Still Can't Read PDFs Properly — TechBuzz](https://www.techbuzz.ai/articles/ai-s-dirty-secret-it-still-can-t-read-pdfs-properly) (MEDIUM confidence)
- [Limitations and Challenges in AI PDF Analysis — Oboe](https://oboe.com/learn/ai-pdf-analysis-4fpeuy/limitations-and-challenges-in-ai-pdf-analysis-4) (MEDIUM confidence)
- [AI Coding Agents: Pain Points, Pitfalls & Pro Tips](https://www.smiansh.com/blogs/the-real-struggle-with-ai-coding-agents-and-how-to-overcome-it/) (MEDIUM confidence)
- [Solving agent system prompt drift in long sessions — DEV Community](https://dev.to/nikolasi/solving-agent-system-prompt-drift-in-long-sessions-a-300-token-fix-1akh) (MEDIUM confidence)
- [Claude Code Auto Mode 2026: checkpoint fatigue — Rentier Digital](https://rentierdigital.xyz/blog/i-click-yes-47-times-a-day-in-claude-code-anthropic-just-rep) (MEDIUM confidence — practitioner analysis)
- [Enabling Claude Code to work more autonomously — Anthropic](https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously) (HIGH confidence — official)
- [How far can we push AI autonomy in code generation? — Martin Fowler](https://martinfowler.com/articles/pushing-ai-autonomy.html) (MEDIUM confidence)
- [Using LLMs for OCR and PDF Parsing — Cradl AI](https://www.cradl.ai/posts/llm-ocr) (MEDIUM confidence)
