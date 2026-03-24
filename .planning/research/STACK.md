# Technology Stack: Claude Code Skills and Agent Definitions

**Project:** SAPA Website — v1.3 Philatex Update Agent
**Researched:** 2026-03-24
**Research mode:** Documentation/Ecosystem
**Overall confidence:** HIGH (official docs, verified with live examples in ~/.claude)

---

## Summary

This research documents the exact file formats, directory structures, and prompt patterns needed to build a project-local Claude Code skill (`/philatex-update`) and agent definition for the SAPA newsletter update workflow. Sources are the official Claude Code documentation at `code.claude.com/docs` and verified against live examples in `~/.claude/skills/` and `~/.claude/agents/`.

---

## Skills: File Format and Directory Structure

### What Skills Are

Skills extend Claude Code via a `SKILL.md` file. They are invoked as slash commands (`/skill-name`) or triggered automatically by Claude when the task matches the description. Skills follow the [Agent Skills open standard](https://agentskills.io), extended by Claude Code with invocation control, subagent execution, and dynamic context injection.

**Key distinction from the old `.claude/commands/` pattern:** A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work identically. Skills add optional features: a directory for supporting files, frontmatter invocation control, and `context: fork` for subagent execution. For v1.3, use the Skills format.

### Scope and Directory Location

| Location | Path | Applies To |
|----------|------|-----------|
| Enterprise | Managed settings | All users in org |
| Personal | `~/.claude/skills/<skill-name>/SKILL.md` | All your projects |
| **Project** | `.claude/skills/<skill-name>/SKILL.md` | **This project only** |
| Plugin | `<plugin>/skills/<skill-name>/SKILL.md` | Where plugin is enabled |

For v1.3: use **project-local** at `.claude/skills/philatex-update/SKILL.md`. This keeps the skill in version control alongside the website code it updates.

### Directory Structure for a Skill

```
.claude/skills/philatex-update/
├── SKILL.md              # Required: frontmatter + instructions
├── CHECKLIST.md          # Optional: update checklist reference doc
├── examples/
│   └── q2-2026.md        # Optional: example of a completed update
└── scripts/
    └── validate-json.sh  # Optional: helper script Claude can execute
```

### SKILL.md Format (Full Specification)

```yaml
---
name: philatex-update
description: Update the SAPA website with a new newsletter edition. Extracts metadata from a PDF, updates newsletters.json, meetings.json, and HTML pages. Use when a new Philatex newsletter is ready to publish.
argument-hint: <path-to-pdf>
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
context: fork
agent: gsd-executor
---

Your skill instructions here in Markdown...
```

### Frontmatter Field Reference (Complete)

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | No | string | Slash command name. Lowercase, hyphens, max 64 chars. Defaults to directory name. |
| `description` | Recommended | string | What the skill does and when Claude should use it automatically |
| `argument-hint` | No | string | Shown in autocomplete: e.g. `<path-to-pdf>` or `[filename] [format]` |
| `disable-model-invocation` | No | bool | `true` = only user can invoke. Claude never triggers it. Use for side-effect workflows like deploys or content updates. |
| `user-invocable` | No | bool | `false` = hidden from `/` menu. Claude can still invoke automatically. |
| `allowed-tools` | No | list | Tools Claude can use without permission prompts when this skill is active |
| `model` | No | string | Model override for this skill |
| `effort` | No | string | `low`, `medium`, `high`, `max` (Opus 4.6 only) |
| `context` | No | string | Set to `fork` to run skill in an isolated subagent |
| `agent` | No | string | Which subagent to use when `context: fork`. Options: built-ins (`Explore`, `Plan`, `general-purpose`) or any custom agent from `.claude/agents/` |
| `hooks` | No | object | Lifecycle hooks scoped to this skill. See Hooks section below. |

### String Substitutions Available in Skill Content

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking the skill |
| `$ARGUMENTS[N]` | Specific argument by 0-based index |
| `$N` | Shorthand: `$0` = first arg, `$1` = second |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_SKILL_DIR}` | Directory containing this SKILL.md |

**Example for v1.3:**
```yaml
---
name: philatex-update
description: Update SAPA website with a new Philatex newsletter PDF
argument-hint: <pdf-path>
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

Process newsletter PDF at: $ARGUMENTS

1. Read the PDF to extract: volume, issue number, date, page count, editor info
2. Add entry to data/newsletters/newsletters.json
3. Update newsletter.html with current issue details
4. Update index.html with homepage preview
5. Copy PDF to public/newsletter_archive/
6. STOP and report changes — await human approval before committing
```

### Dynamic Context Injection (Shell Command Preprocessing)

The `` !`<command>` `` syntax runs shell commands before skill content is sent to Claude. Output replaces the placeholder. Runs at invocation, not by Claude.

```markdown
## Current newsletter state
- Latest entry: !`cat data/newsletters/newsletters.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d['newsletters'][-1], indent=2))"`
- Archive count: !`ls public/newsletter_archive/*.pdf 2>/dev/null | wc -l | tr -d ' '`
```

### Invocation Control Matrix

| Frontmatter | User invoke | Claude auto-invoke | Context loading |
|-------------|-------------|-------------------|-----------------|
| (default) | Yes | Yes | Description always in context |
| `disable-model-invocation: true` | Yes | No | Description NOT in context |
| `user-invocable: false` | No | Yes | Description always in context |

For `/philatex-update`: use `disable-model-invocation: true`. This is a side-effect workflow with file writes and a human checkpoint. Claude should not trigger it automatically.

---

## Sub-Agents: File Format and Directory Structure

### What Sub-Agents Are

Sub-agents are specialized AI assistants running in their own context window with a custom system prompt, tool access, and independent permissions. Claude delegates to them when the task description matches. Defined as Markdown files with YAML frontmatter.

### Scope and Directory Location

| Location | Path | Priority |
|----------|------|----------|
| CLI flag `--agents` | Session-only JSON | Highest |
| **Project** | `.claude/agents/<name>.md` | 2 |
| Personal | `~/.claude/agents/<name>.md` | 3 |
| Plugin | `<plugin>/agents/<name>.md` | Lowest |

For v1.3: project-local agent at `.claude/agents/newsletter-updater.md`. Check into version control.

**Note:** The project's `.claude/agents/` directory currently exists but is empty. Personal agents (`~/.claude/agents/`) include the GSD suite (gsd-executor, gsd-project-researcher, etc.) used as reference patterns.

### Agent File Format (Complete Specification)

```markdown
---
name: newsletter-updater
description: Updates SAPA website files when a new Philatex newsletter is published. Handles JSON data files, HTML page updates, and PDF placement. Requires human approval before committing.
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
permissionMode: default
---

You are the SAPA newsletter update agent. Your job is to update the website
when a new Philatex newsletter edition is published.

[System prompt content in Markdown...]
```

### Agent Frontmatter Field Reference (Complete)

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier: lowercase letters and hyphens |
| `description` | Yes | When Claude should delegate to this agent. Be specific. |
| `tools` | No | Allowlist of tools. Inherits all if omitted. |
| `disallowedTools` | No | Denylist: removed from inherited or specified list |
| `model` | No | `sonnet`, `opus`, `haiku`, full model ID, or `inherit` |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Max agentic turns before stopping |
| `skills` | No | Skills to preload into agent context at startup (full content injected) |
| `mcpServers` | No | MCP servers scoped to this agent |
| `hooks` | No | Lifecycle hooks for this agent |
| `memory` | No | Persistent memory: `user`, `project`, or `local` |
| `background` | No | `true` = always run as background task |
| `effort` | No | `low`, `medium`, `high`, `max` |
| `isolation` | No | `worktree` = run in isolated git worktree |
| `color` | No | UI color for identifying agent in session (not in official spec but used in GSD agents) |

### Built-in Agent Types

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| `Explore` | Haiku | Read-only | Fast codebase exploration |
| `Plan` | Inherits | Read-only | Pre-planning research |
| `general-purpose` | Inherits | All | Complex multi-step tasks |
| `Bash` | Inherits | Terminal | Terminal commands in separate context |

---

## Skill-to-Agent Orchestration Patterns

### Pattern 1: Skill invokes Agent via `context: fork`

The skill content becomes the task prompt for the specified agent. The agent runs in isolation without conversation history.

```yaml
# .claude/skills/philatex-update/SKILL.md
---
name: philatex-update
description: Update SAPA website with new newsletter
disable-model-invocation: true
context: fork
agent: newsletter-updater
---

Process newsletter PDF at: $ARGUMENTS
[... task instructions ...]
```

```markdown
# .claude/agents/newsletter-updater.md
---
name: newsletter-updater
description: Handles newsletter site updates
tools: Read, Write, Edit, Bash, Grep, Glob
---

[System prompt: agent's persona and constraints]
```

**Flow:** User types `/philatex-update path/to/newsletter.pdf` → Skill content + argument sent to `newsletter-updater` agent → Agent executes in forked context → Summary returned to main conversation.

### Pattern 2: Agent preloads Skills as reference material

The agent's system prompt defines behavior; preloaded skills inject domain knowledge.

```markdown
---
name: newsletter-updater
description: Updates website for new newsletter editions
tools: Read, Write, Edit, Bash, Grep, Glob
skills:
  - philatex-conventions
  - json-schema-reference
---

You are the newsletter update agent. Follow the conventions and schemas
from preloaded skills when updating data files.
```

**Note:** Subagents do NOT inherit skills from the parent conversation. List them explicitly in `skills:`.

### Pattern 3: Simple skill without agent fork (recommended for v1.3)

For a single-agent workflow with human checkpoint, a skill without `context: fork` is simpler. Claude executes in the main conversation context where the human can review before commit.

```yaml
---
name: philatex-update
description: Update SAPA website with new Philatex newsletter edition
argument-hint: <pdf-path>
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

Process newsletter PDF: $ARGUMENTS

Steps:
1. Extract metadata (volume, issue, date, page count)
2. Update data/newsletters/newsletters.json
3. Update newsletter.html and index.html
4. Show diff of all changes
5. PAUSE — ask human to review and approve before any git commit
```

**Recommendation for v1.3:** Start with Pattern 3. The human checkpoint requirement means main-conversation execution (with full visibility) is more appropriate than a forked agent. Add `context: fork` only if context window management becomes an issue.

---

## Hooks: Lifecycle Events for Skills and Agents

### Hook Events Available

| Event | Fires When | Use For |
|-------|-----------|---------|
| `PreToolUse` | Before any tool executes | Block dangerous commands, validate inputs |
| `PostToolUse` | After tool completes | Lint, log, validate outputs |
| `Stop` | Claude finishes a turn | Quality gates, force continuation |
| `SubagentStart` | Agent spawned | Setup, logging |
| `SubagentStop` | Agent completes | Cleanup, summary |
| `SessionStart` | Session opens | Load context |
| `UserPromptSubmit` | User submits prompt | Context injection |

### Hook Configuration in SKILL.md or Agent Frontmatter

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "./scripts/validate-json.sh"
```

### Hook Exit Codes

| Exit Code | Effect |
|-----------|--------|
| `0` | Success, continue |
| `2` | Block the action (stderr shown as reason) |
| `1`, `3+` | Non-blocking error, continue |

### Hook Input: JSON via stdin

```json
{
  "session_id": "abc123",
  "cwd": "/path/to/project",
  "hook_event_name": "PreToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "data/newsletters/newsletters.json",
    "content": "..."
  }
}
```

---

## Supporting Files Pattern

Keep `SKILL.md` under 500 lines. Move reference material to supporting files and reference them explicitly:

```markdown
## Reference files
- For JSON schema details, see [../data/schemas/newsletters.json](../data/schemas/newsletters.json)
- For update checklist, see [CHECKLIST.md](CHECKLIST.md)
- For example completed update, see [examples/q2-2026.md](examples/q2-2026.md)
```

---

## `agentskills.io` Open Standard

Claude Code skills follow the [Agent Skills open standard](https://agentskills.io). The standard defines:
- SKILL.md as the entrypoint filename
- YAML frontmatter between `---` markers
- `name` and `description` as key fields
- `$ARGUMENTS` substitution

Claude Code extends this with: `context: fork`, `agent:`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `hooks`, and dynamic context injection (`` !`command` ``).

**Confidence:** HIGH (verified against `code.claude.com/docs/en/slash-commands` and live skill examples)

---

## Project-Specific Implementation Notes

### Current State of `.claude/` in sastamps

```
.claude/
├── agents/        # Empty — no project-level agents yet
├── commands/      # Empty — no project-level commands yet
├── settings.json
└── settings.local.json
```

### Files to Create for v1.3

```
.claude/
├── agents/
│   └── newsletter-updater.md    # Optional: if using context:fork pattern
└── skills/
    └── philatex-update/
        ├── SKILL.md             # Required
        └── CHECKLIST.md         # Optional: update workflow steps
```

### Newsletter Update Workflow Captured in v1.2

The v1.2 manual update touched these files (captured from commit history):
1. `data/newsletters/newsletters.json` — add new entry with volume, issue, filename, pageCount, date
2. `newsletter.html` — current issue details, editor info
3. `index.html` — homepage preview and quarter-look-ahead logic
4. `meetings.html` — new quarter meeting schedule
5. `about.html` — BOG roster if changed
6. `public/newsletter_archive/<filename>.pdf` — PDF placement

The agent needs to handle items 1-5 (HTML updates + JSON). Item 6 (PDF placement) requires the user to provide the file path as the skill argument.

---

## Installation / Setup Commands

No npm packages required. Skills and agents are pure Markdown files.

```bash
# Create skill directory
mkdir -p .claude/skills/philatex-update

# Optionally create agents directory
mkdir -p .claude/agents

# Verify location
ls .claude/skills/
ls .claude/agents/
```

---

## Official Documentation Sources

| Source | URL | Confidence |
|--------|-----|-----------|
| Skills documentation | https://code.claude.com/docs/en/slash-commands | HIGH |
| Sub-agents documentation | https://code.claude.com/docs/en/sub-agents | HIGH |
| Hooks documentation | https://code.claude.com/docs/en/hooks | HIGH |
| Agent Skills open standard | https://agentskills.io | MEDIUM (not directly fetched) |
| Live skill examples | `~/.claude/skills/gstack/` | HIGH |
| Live agent examples | `~/.claude/agents/gsd-executor.md` | HIGH |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Skill location | `.claude/skills/` (project) | `~/.claude/skills/` (personal) | Newsletter workflow is project-specific; commit to version control |
| Invocation pattern | Simple skill (no fork) | `context: fork` with agent | Human checkpoint requires main-conversation visibility; fork adds complexity without benefit |
| Old commands format | Skills format | `.claude/commands/*.md` | Skills format recommended for new work; supports supporting files and frontmatter |
| Agent definition | Project-local `.claude/agents/` | Personal `~/.claude/agents/` | Agent is SAPA-specific; no reason to expose to other projects |
