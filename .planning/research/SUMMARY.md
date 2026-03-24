# Research Summary: v1.3 Philatex Update Agent

**Domain:** Claude Code Skills and Agent Definitions for SAPA Newsletter Publishing
**Researched:** 2026-03-24
**Overall confidence:** HIGH

---

## Executive Summary

This milestone adds a project-local Claude Code skill (`/philatex-update`) and a companion agent definition to the SAPA website project. The skill codifies the v1.2 quarterly update workflow — executed manually — into a repeatable slash command.

The official documentation (code.claude.com/docs) describes two converging systems: **Skills** (SKILL.md files invoked as slash commands) and **Sub-agents** (Markdown files with YAML frontmatter). Both formats are stable, well-documented, and follow the open `agentskills.io` standard. Live examples were examined in `~/.claude/skills/gstack/` (10 skills) and `~/.claude/agents/` (GSD suite). File format is verified. Syntax is confirmed.

ARCHITECTURE.md provides detailed PDF reading constraints and data mapping from actual Philatex newsletter structure. FEATURES.md provides concrete skill/agent prompt patterns extracted from live working skills. PITFALLS.md catalogs 13 failure modes specific to newsletter-to-website automation, with specific prevention strategies drawn from Anthropic's official skill authoring docs and practitioner experience.

The file format is pure Markdown with YAML frontmatter. No build step, no npm packages, no toolchain changes to the existing website build system. The skill integrates by placing one directory in `.claude/skills/` and checking it into version control.

## Key Findings

**Stack:** SKILL.md file (YAML frontmatter + Markdown) at `.claude/skills/philatex-update/SKILL.md`. No dependencies. See STACK.md for complete frontmatter field reference and invocation patterns.

**Architecture:** Two-phase workflow. Phase 1: read PDF, extract content, stage all changes. Phase 2 (after human checkpoint): apply staged changes and commit. The agent must rebuild ESBuild bundles after updating meetings.json or the bundle serves stale data. See ARCHITECTURE.md for the full 6-phase agent workflow.

**Critical pitfall:** Scope creep is the top risk. Without an explicit permitted-file list, the agent will "helpfully" modify unrelated files. Use deny-by-default: enumerate exactly which files may be touched and require reporting-not-acting on anything outside the list.

---

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Skill Scaffold** — Create `.claude/skills/philatex-update/SKILL.md` with frontmatter, argument handling, and file scope boundaries
   - Addresses: `/philatex-update` skill as entry point (accepts PDF path)
   - Avoids: Scope creep (Pitfall 1) — define the permitted-file list in this phase
   - Key decision: Use `disable-model-invocation: true` — this is a side-effect workflow

2. **Extraction and Data Update Logic** — Encode PDF reading + JSON update steps with schema validation
   - Addresses: PDF reading, content extraction, newsletters.json + meetings.json updates
   - Avoids: JSON schema drift (Pitfall 4), PDF hallucination (Pitfall 2)
   - Key constraint: Agent must run `npm run build:js` after meetings.json update (ESBuild bundle requirement)

3. **HTML Page Updates** — newsletter.html, index.html, meetings.html updates with targeted edits
   - Addresses: Site HTML staying current with new issue
   - Avoids: Monolithic file rewrites — only targeted section replacements

4. **Human Checkpoint Design** — Structured checkpoint with key-facts summary, not just raw diff
   - Addresses: Human checkpoint before committing changes
   - Avoids: Checkpoint fatigue (Pitfall 5) — lead with 10 key facts, put full diff secondary

5. **Supporting Files** — CHECKLIST.md with exact JSON field names and HTML section references
   - Addresses: Agent needs reference material loaded on-demand
   - Avoids: SKILL.md exceeding 500 lines (documented context efficiency limit)

**Phase ordering rationale:**
- Scaffold first: validate invocation mechanic and establish safety boundaries before adding instructions
- Data before HTML: JSON files are schema-bound and higher risk for corruption; HTML is more forgiving
- Checkpoint design explicitly after update logic: the checkpoint must be designed around what the agent actually produces
- Supporting files last: reference material only useful once the main workflow is working

**Research flags for phases:**
- Phase 2: Idempotency check must be first step — verify newsletter ID does not already exist before any writes
- Phase 2: ICS calendar file generation is an explicit required step, easy to forget (Pitfall 10)
- Phase 4: Checkpoint output format matters as much as the check itself — see PITFALLS.md Pitfall 5 for skimmability design
- All phases: The agent file uses `context: fork` pattern ONLY if context window management becomes an issue. Default: run in main conversation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| SKILL.md format and frontmatter fields | HIGH | Official docs verified + live examples in ~/.claude/skills/gstack/ |
| Agent .md format | HIGH | Official docs verified + live examples in ~/.claude/agents/gsd-executor.md |
| Invocation control (`disable-model-invocation`) | HIGH | Explicitly documented in official Claude Code skills docs |
| `context:fork` behavior (no conversation history) | HIGH | Official docs explicitly state isolation from conversation history |
| Hook syntax | HIGH | Official docs verified |
| PDF reading via Read tool | HIGH | Official Anthropic docs + Claude Code issue tracker (#22908) |
| PDF extraction quality for multi-column newsletters | MEDIUM | Described as providing text + image dual representation; untested with actual Philatex PDFs |
| ESBuild bundle rebuild requirement | HIGH | Confirmed from v1.2 debug artifact (meetings-stale-content.md) |
| JSON schema mapping (meetings, newsletters) | HIGH | Verified against actual schema files in data/schemas/ |

---

## Gaps to Address

- ICS calendar file generation: v1.2 produced 13 ICS files but the exact generation mechanism was not examined. Phase 2 should verify the ICS format used and include explicit generation instructions in the skill.
- Schema `featuredArticles.category` enum: Q2 2026 used categories not in the schema (`"Calendar"`, `"Humor"`). One-time schema cleanup is needed either before or as part of v1.3. Agent should flag invalid categories for human review rather than silently inserting them.
- `AskUserQuestion` tool in skill context: The checkpoint may use this. Behavior in main-conversation skill context (vs. forked agent context) should be verified during implementation.
