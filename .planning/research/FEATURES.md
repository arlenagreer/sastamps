# Feature Landscape: Claude Code Skill & Agent Authoring Patterns

**Domain:** Claude Code skill authoring and agent orchestration
**Researched:** 2026-03-24
**Overall confidence:** HIGH (all findings from direct inspection of live skill files)

---

## Executive Summary

This document captures concrete patterns extracted from `~/.claude/skills/` and `~/.claude/agents/` for building the `/philatex-update` skill and its companion agent. Three fully-deployed skills were examined (gstack/review, gstack/ship, gstack/qa), four standalone skills (omnifocus, invoice, worklog, and the gstack browse entry point), and five agent definitions (gsd-executor, gsd-phase-researcher, gsd-project-researcher, and supporting GSD workflow files). All patterns below are confirmed against real, working files.

---

## Pattern 1: Skill Metadata (SKILL.md Frontmatter)

Every skill starts with a YAML frontmatter block. This is the minimum required header.

**Fields found in all examined skills:**

```yaml
---
name: skill-name
version: 1.0.0
description: |
  One or two sentences in plain language describing what the skill does.
  Include trigger phrases: "Use when asked to X, Y, or Z."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
  - WebSearch
---
```

**Key observations:**

- `name` is a short slug, lowercase, matching the directory name
- `description` always includes trigger phrases ("Use when...") that Claude Code uses to auto-select the skill
- `allowed-tools` is an explicit allowlist — omitted tools are unavailable to the skill
- `version` follows semver; gstack skills use it to drive auto-upgrade detection
- No `agent` field in skill frontmatter — skills are prompts, not agent definitions

**Simpler standalone skills (omnifocus, invoice, worklog) omit version** — they have only `name` and `description` in the frontmatter. Version tracking is optional for project-local skills.

**Minimal viable frontmatter for a new skill:**

```yaml
---
name: philatex-update
description: |
  Update the SAPA website with content from a new Philatex newsletter PDF.
  Use when asked to "update newsletter", "process Philatex", or given a PDF path.
---
```

---

## Pattern 2: Skill Prompt Body Structure

After the frontmatter, skills follow a consistent body structure. Examined skills use:

### High-complexity skills (gstack review, ship, qa)

```
# Skill Title: One-line summary

[Role statement: "You are running the /X workflow."]

## Step 1: [Setup/Pre-flight]
[Bash commands to discover context]

## Step 2: [Primary work]
[Instructions, conditionals, tool calls]

## Step N: [Finalization]
[Commit/output/report]

## Important Rules
[Short, imperative constraints]
```

### Simple standalone skills (omnifocus, invoice, worklog)

```
# Skill Title

## Overview
[What it does, when to use it]

## When to Use This Skill
[Trigger conditions]

## Core Capabilities
### 1. [Operation Name]
[Description + bash/code examples]

## Important Notes
[Constraints and gotchas]
```

**For `/philatex-update`:** Use the simple standalone pattern. The complexity lives in the agent, not the skill entry point.

---

## Pattern 3: Agent Definition Format

Agent files live in `~/.claude/agents/` (global) or `.claude/agents/` (project-local). They are Markdown files with YAML frontmatter.

**Agent frontmatter schema:**

```yaml
---
name: agent-name
description: One sentence. What the agent does and when it is spawned.
tools: Read, Write, Edit, Bash, Grep, Glob
color: yellow
# hooks:               (optional, commented out in most examined files)
#   PostToolUse:
#     - matcher: "Write|Edit"
#       hooks:
#         - type: command
#           command: "some-command $FILE 2>/dev/null || true"
---
```

**Key observations:**

- `tools` is a comma-separated list (not a YAML array, unlike skill `allowed-tools`)
- `color` is optional but used for visual identification in Claude Code UI
- `description` drives when the orchestrator picks this agent — make it specific
- Hooks are available but left commented out in practice; they run after every Write/Edit
- Agent files use `<role>` XML block immediately after frontmatter (GSD pattern), or plain Markdown prose (simpler agents)

**GSD agent body structure (gsd-executor, gsd-phase-researcher):**

```markdown
---
name: agent-name
description: ...
tools: Read, Write, Bash, ...
color: cyan
---

<role>
[Who you are, spawned by which command, core job.]

**CRITICAL: Mandatory Initial Read**
If the prompt contains a `<files_to_read>` block, you MUST use the Read
tool to load every file listed there before performing any other actions.
</role>

<project_context>
[How to discover project conventions before acting.]
</project_context>

<execution_flow>
<step name="step_name" priority="first">
[Step details]
</step>
</execution_flow>
```

**For a custom philatex agent:** Use a simpler structure — `<role>` + numbered steps — not the full GSD XML machinery. See Pattern 8 for the recommended template.

---

## Pattern 4: Skill-to-Agent Orchestration

The GSD system shows the canonical pattern for a skill that spawns an agent:

**Skill** = entry point, argument parsing, user-facing interface
**Agent** = executor, does the actual work, returns structured result

**Orchestration flow:**

```
User types: /philatex-update path/to/newsletter.pdf
    ↓
SKILL.md runs (in main Claude Code context)
- Parses argument (PDF path)
- Validates the path exists
- Passes context to agent via Task() spawn
    ↓
Agent runs (in isolated subagent context)
- Reads PDF
- Does review/extraction/update work
- Returns structured result to orchestrator
    ↓
SKILL.md resumes
- Reads agent result
- Presents checkpoint to user
- After approval: commits
```

**The Task() spawn pattern used in GSD workflows:**

```
Task(subagent_type="agent-name", prompt="[context + instructions]")
```

The prompt passed to Task() contains:
- `<files_to_read>` block listing files the agent must load first
- The work instructions
- Expected output format

**Key finding:** Agents do NOT commit themselves in GSD's Pattern B (segmented). The orchestrating skill/workflow creates the final commit after the checkpoint clears. This is the pattern to follow for philatex-update.

---

## Pattern 5: Checkpoint Patterns (Human Pause)

Checkpoints are the mechanism for human-in-the-loop verification. Three types exist:

### checkpoint:human-verify (most common, ~90% of usage)

```xml
<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Summary of what was built/extracted</what-built>
  <how-to-verify>
    Specific things to check — not CLI commands, only human judgment items
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>
```

**Critical rule:** Claude sets up everything BEFORE the checkpoint. The human only does what requires judgment. Never ask the human to run CLI commands.

### checkpoint:decision (rare, ~9%)

```xml
<task type="checkpoint:decision" gate="blocking">
  <decision>What needs deciding</decision>
  <context>Why this matters</context>
  <options>
    <option id="option-a"><name>...</name><pros>...</pros><cons>...</cons></option>
    <option id="option-b"><name>...</name><pros>...</pros><cons>...</cons></option>
  </options>
  <resume-signal>Select: option-a or option-b</resume-signal>
</task>
```

### checkpoint:human-action (rare, ~1%)

For things that literally cannot be automated (entering MFA codes, physical actions).

**For philatex-update:** Use `checkpoint:human-verify`. The agent extracts and stages all changes; the checkpoint presents a diff summary for approval before committing.

---

## Pattern 6: Argument Passing to Skills

Skills receive user input via `$ARGUMENTS`. Examined patterns:

**gstack/qa pattern:**
```markdown
## Setup

**Parse the user's request for these parameters:**

| Parameter | Default | Override example |
|-----------|---------|-----------------:|
| Target URL | (auto-detect) | `https://myapp.com` |
| Tier | Standard | `--quick`, `--exhaustive` |
```

**invoice pattern (simpler):**
The skill reads client name from the user's message text, no special `$ARGUMENTS` parsing.

**Recommended pattern for philatex-update:**
```markdown
## Input

Parse the user's invocation:
- First argument: path to the Philatex newsletter PDF (required)
- If no PDF path given: ask the user with AskUserQuestion before proceeding

Example: `/philatex-update ~/Downloads/philatex-q3-2026.pdf`
```

---

## Pattern 7: AskUserQuestion Format Contract

All gstack skills follow a strict format for `AskUserQuestion`. This is enforced in the shared preamble (SKILL.md lines 49-59):

```markdown
**ALWAYS follow this structure for every AskUserQuestion call:**
1. Re-ground: State project, current branch, current task (1-2 sentences)
2. Simplify: Plain English explanation, no jargon
3. Recommend: "RECOMMENDATION: Choose [X] because [one-line reason]"
   Include "Completeness: X/10" for each option
4. Options: Lettered A) B) C) — show effort when relevant (human: ~X / CC: ~Y)
```

**For a project-local skill** without the gstack preamble, a simpler version works:

```markdown
When asking the user a question, always:
1. State what has been done so far (1 sentence)
2. Ask the specific question
3. Give a recommendation
4. Provide lettered options: A) B) C)
```

---

## Pattern 8: Recommended Template for philatex-update

Based on all examined patterns, here is the concrete template to follow:

### SKILL.md (entry point)

```yaml
---
name: philatex-update
description: |
  Update the SAPA website with content from a new Philatex newsletter PDF.
  Reads the PDF, reviews content, extracts meeting dates and announcements,
  updates data files and HTML pages, and presents changes for approval before
  committing. Use when asked to "update newsletter", "process Philatex PDF",
  or "update site with new newsletter".
---
```

Skill body:
1. Parse PDF path from arguments (ask if missing)
2. Validate file exists and is readable
3. Spawn agent with Task() passing the PDF path and list of files to update
4. Receive agent result (extracted content + staged changes summary)
5. Present checkpoint:human-verify with diff summary
6. After "approved": commit changes with descriptive message
7. Report success

### Agent definition (.claude/agents/philatex-newsletter-agent.md)

```yaml
---
name: philatex-newsletter-agent
description: Reads a Philatex newsletter PDF, extracts content, reviews quality, and updates SAPA website data files. Spawned by /philatex-update skill.
tools: Read, Write, Edit, Bash, Grep, Glob
color: blue
---
```

Agent body uses `<role>` + numbered steps:
1. Read PDF using Read tool
2. Extract: volume/issue numbers, meeting dates, officer updates, announcements
3. Review: proofread content, flag layout issues
4. Update: data/newsletters/newsletters.json, data/meetings/meetings.json, relevant HTML pages
5. Generate diff summary for checkpoint
6. Return structured result (do NOT commit)

---

## Pattern 9: File Structure for a Project-Local Skill

Based on how gstack skills are organized, and how GSD locates skills:

```
.claude/
├── agents/
│   └── philatex-newsletter-agent.md   # agent definition
└── skills/                             # if project needs local skills
    └── philatex-update/
        └── SKILL.md                    # skill entry point
```

**However:** The existing project `.claude/agents/` is empty and `.claude/commands/` exists. Claude Code commands (slash commands) live in `~/.claude/commands/` or `.claude/commands/`. The GSD system places skills in `~/.claude/skills/`.

**Confirmed pattern from GSD workflows:** Skills in `.claude/skills/[name]/SKILL.md` are discovered by GSD executors, but Claude Code itself triggers skills via the `/skill-name` command syntax when they are registered in the right location. For a project-specific skill, placing the agent in `.claude/agents/` (project-local) and the command in `.claude/commands/` is the right structure.

---

## Pattern 10: What NOT to Do (Anti-Patterns)

Extracted from examined skill pitfalls and GSD deviation rules:

| Anti-Pattern | Why Bad | Instead |
|---|---|---|
| Ask user to run CLI commands at checkpoint | Breaks automation principle | Claude runs everything, user only judges |
| Agent commits its own work | Prevents human checkpoint before commit | Agent stages, skill orchestrator commits after approval |
| Monolithic skill with all logic inline | Loses fresh-context benefit of agents | Thin skill entry point + rich agent |
| Load full 100KB+ agent files into context | Context cost | Load SKILL.md (~130 lines), load rules/*.md as needed |
| Parse $ARGUMENTS with grep/sed in skill | Fragile | Use node gsd-tools or explicit instructions |
| Use `AskUserQuestion` for yes/no | Poor UX | Provide lettered options with recommendation |
| Hardcode file paths without validation | Silent failures | Validate with `[ -f "$FILE" ]` before using |
| Skip `<files_to_read>` block in agent prompt | Agent has no context | Always include critical files in the prompt block |

---

## Table Stakes Features

Features required for the philatex-update skill to be useful:

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| PDF path argument | Without it, skill can't start | Low | First positional arg |
| PDF existence check | Prevents cryptic errors | Low | `[ -f "$PDF_PATH" ]` |
| Content extraction (meetings, metadata) | Core purpose | Medium | Read tool on PDF |
| JSON data file updates | Site data lives in JSON | Medium | newsletters.json, meetings.json |
| Diff summary before commit | User must approve changes | Low | git diff output |
| Human checkpoint | Explicit in project requirements | Low | checkpoint:human-verify |
| Atomic commit after approval | Clean git history | Low | GSD commit pattern |

## Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Newsletter review/proofreading | Flags typos before publishing | Medium | Part of review step |
| ICS file generation for meetings | Keeps calendar files in sync | Medium | Matches v1.2 pattern |
| Homepage quarter-look-ahead update | Keeps homepage current | Low | Already exists in codebase |
| Multi-file update coordination | All files updated atomically | Medium | Matches v1.2 approach |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| Auto-commit without checkpoint | Violates project requirement | Always pause for approval |
| Full pipeline automation (email PDF, etc.) | Out of scope (Project.md) | Manual PDF fetch, skill does the rest |
| CMS-style edit UI | Static site constraint | Edit JSON/HTML files directly |

---

## Feature Dependencies

```
PDF path validated
  → PDF content read
    → Content extracted (meetings, metadata, announcements)
      → JSON data files updated
      → HTML pages updated
        → Diff summary generated
          → checkpoint:human-verify (STOP)
            → User approves
              → commit
```

---

## Sources

All findings from direct inspection of:
- `/Users/arlenagreer/.claude/skills/gstack/SKILL.md.tmpl` (gstack entry point template)
- `/Users/arlenagreer/.claude/skills/gstack/review/SKILL.md.tmpl` (review skill)
- `/Users/arlenagreer/.claude/skills/gstack/ship/SKILL.md.tmpl` (ship skill, lines 1-100)
- `/Users/arlenagreer/.claude/skills/gstack/qa/SKILL.md.tmpl` (qa skill, lines 1-80)
- `/Users/arlenagreer/.claude/skills/omnifocus/SKILL.md` (omnifocus skill)
- `/Users/arlenagreer/.claude/skills/invoice/SKILL.md` (invoice skill)
- `/Users/arlenagreer/.claude/skills/worklog/SKILL.md` (worklog skill, lines 1-60)
- `/Users/arlenagreer/.claude/agents/gsd-executor.md` (gsd-executor agent)
- `/Users/arlenagreer/.claude/agents/gsd-phase-researcher.md` (gsd-phase-researcher agent)
- `/Users/arlenagreer/.claude/agents/gsd-project-researcher.md` (gsd-project-researcher agent)
- `/Users/arlenagreer/.claude/get-shit-done/templates/phase-prompt.md` (PLAN.md template)
- `/Users/arlenagreer/.claude/get-shit-done/references/checkpoints.md` (checkpoint patterns)
- `/Users/arlenagreer/.claude/get-shit-done/workflows/execute-plan.md` (orchestration workflow)
- `/Users/arlenagreer/.claude/get-shit-done/workflows/execute-phase.md` (phase execution)
