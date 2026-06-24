# Philatex Update — Orchestration Reference

How `/philatex-update` runs as a multi-agent, adversarially-reviewed workflow. The orchestrator (the agent running the skill) reads this when it reaches the research, planning, or review phases.

## Operating Principles

1. **Run at extra-high effort.** The orchestrator operates at `xhigh` reasoning effort for the whole run. Inside dynamic workflows, pass `effort` per stage: `xhigh`/`max` for planning, adversarial verification, and synthesis; `low`/`medium` for mechanical stages (listing files, collecting line counts).
2. **Gate before you fan out.** The duplicate check (SKILL.md Phase 5) is cheap and MUST pass before any agent team is spawned. Never spend tokens on research/extraction for an edition that already exists.
3. **Fan out with dynamic workflows.** Use the `Workflow` tool for the research and review phases — they are fan-out + verify shapes that benefit from `pipeline()`/`parallel()` and per-stage effort. Read each workflow's returned results in the main loop before deciding the next phase; do not chain everything into one opaque script.
4. **Adversarial by default.** Research, planning, and review each end with a skeptic whose job is to *refute*, not confirm. A finding survives only if the skeptic cannot disprove it.
5. **Feed forward.** Every phase consumes the prior phase's structured output. Research findings + plan are passed into extraction; extraction output + facts are passed into review.

## Agent Team Roster

The skill is technology-specific (a static stamp-club site: JSON data, ICS calendar files, hand-authored HTML, an esbuild bundle, a lunr search index). Personas are chosen to match those surfaces.

| Phase | Persona / `agentType` (fallback) | Mandate |
|-------|----------------------|---------|
| Research | `gsd-phase-researcher` (`Explore`) | Map the exact current data shapes, ICS naming, and HTML section anchors a new edition must match. Read-only. |
| Research | default workflow agent + Context7 | Confirm authoritative format/library constraints (see Context7 below). |
| Research | default agent (`xhigh`) | **Completeness critic** — enumerate what the researchers missed that could break extraction or the build. |
| Planning | main-loop sequential thinking (`Plan`) | Produce the edition-specific plan AND the acceptance contract (RED). See `acceptance-contract.md`. |
| Planning | `gsd-plan-checker` (`quality-engineer`, `xhigh`) | **Adversarial plan-check** — goal-backward: if extraction satisfies this contract, is the data correct AND complete? What assertion is missing, wrong, or back-filled from habit (esp. negative assertions)? |
| Extraction | `philatex-newsletter-agent` | Existing extractor. Receives research + plan + frozen contract + learnings. Done = every assertion GREEN. |
| Review | `technical-writer` | **Content fidelity** — re-read the PDF; verify titles, articles, names, announcements against extracted text. |
| Review | `quality-engineer` (or `gsd-verifier`) | **Data integrity** — schema conformance, meeting count/date continuity, ICS time math (CDT/CST), `[UNVERIFIED]` handling, contract-assertion re-check. |
| Review | `pr-review-toolkit:silent-failure-hunter` (or `gsd-code-reviewer`) | **Diff safety** — permitted-file scope, silent failures, build integrity, unintended edits. |
| Review | default skeptics (`xhigh`, N≥3 lenses) | **Assertion refutation** — each independently tries to prove a high-risk per-meeting/negative assertion is still RED, from the source PDF. |
| Review | default agent (`max`) | **Synthesis** — consolidate confirmed findings + the contract scoreboard into one ranked report. |

**GSD agents are borrowed, not required.** If a named `agentType` is unavailable, or a GSD agent expects `.planning/` artifacts (RESEARCH.md, PLAN.md) it cannot find and stalls, fall back to the parenthesized persona with the mandate written into the prompt. The orchestration spine stays native either way.

## Sequential Thinking (planning phase)

Use the `mcp__sequential-thinking__sequentialthinking` tool in the main loop to frame the plan **before** spawning the adversarial plan-checker. Decompose, at minimum:

- Which quarter/year and therefore which DST regime applies (CDT vs CST; Q1/Q4 can straddle a boundary — see data-contract.md §C).
- Expected meeting count and the date span (13/quarter is typical; verify against the calendar table).
- Non-standard meetings for this edition (picnic start time, holidays/cancellations, BOG meetings).
- Whether the officer roster or mailing address changed (drives whether `about.html`/`contact.html` are touched).
- Which `[UNVERIFIED]` risks are likely given the PDF's structure survey.

Revise the thought chain with whatever the adversarial plan-checker surfaces, then freeze the plan and pass it to extraction.

## Context7 (research phase)

Use Context7 (`resolve-library-id` → `query-docs`) to ground the update in *current* docs rather than assumptions. Resolve and query, as relevant to the touched surfaces:

- **esbuild** — how meeting data is bundled at build time (the "stale meetings" failure mode lives here; see data-contract.md §E).
- **lunr** — search-index build expectations if `build:search` is affected.
- **vanilla-calendar-pro** — the data shape the calendar widget consumes on `meetings.html`.

For the **iCalendar (RFC 5545)** format, prefer the existing template `.ics` files in `data/calendar/` and `public/` as the source of truth, and use Context7/library docs only to resolve ambiguity (e.g., `STATUS`, `DTSTART`/`DTEND`, UTC vs local serialization).

Return from research only the facts that *constrain* how data, ICS, and HTML are written — not general documentation.

## Adversarial Review Protocol

The review panel is the **test runner** for the acceptance contract (`acceptance-contract.md`). It runs as a dynamic workflow **after** extraction and **before** the human checkpoint. Three independent adversarial mechanisms run together:

0. **Contract-assertion verification (the test run).** For every assertion the extractor claims GREEN, an independent verifier re-checks it against the source and tries to prove it is still RED. The output is a scoreboard: GREEN only for assertions that survive. Any surviving RED is a `blocker`.
1. **Dimension review → per-finding verification.** Each reviewer persona returns findings; each finding is then handed to an independent verifier prompted to *refute* it. A finding is reported only if the verifier cannot disprove it (`real: true`).
2. **High-risk fact / negative-assertion refutation.** Every high-risk per-meeting fact (date/time/type), the officer roster, new-member names, the publish date, and every negative assertion (e.g. "no picnic this quarter") is challenged by ≥3 independent skeptics, each using a different lens (`calendar-table`, `prose-cross-check`, `schema-enum`). A fact is **contested** if a majority refute it.

Confirmed findings + contested facts + the contract scoreboard are synthesized into a ranked report (`blocker` / `major` / `minor`) with file+location and a corrective action for each. That report is surfaced verbatim inside the human checkpoint (SKILL.md Phase 11), above the key-facts summary.

### Flagship review workflow (adapt, don't copy blindly)

```javascript
export const meta = {
  name: 'philatex-review',
  description: 'Adversarial multi-persona review of an extracted Philatex update before the human checkpoint',
  phases: [
    { title: 'Review', detail: 'expert personas review the extraction by dimension' },
    { title: 'Refute', detail: 'independent skeptics try to refute findings and high-risk facts' },
    { title: 'Synthesize', detail: 'consolidate confirmed issues into a ranked report' },
  ],
}
// args = { editionId, pdfPath, extractedFacts: [...], changedFiles: [...], summary: '...' }

const FINDING = {
  type: 'object', additionalProperties: false,
  required: ['title', 'file', 'location', 'severity', 'detail'],
  properties: {
    title: { type: 'string' }, file: { type: 'string' }, location: { type: 'string' },
    severity: { enum: ['blocker', 'major', 'minor'] }, detail: { type: 'string' },
  },
}
const FINDINGS = { type: 'object', additionalProperties: false, required: ['findings'],
  properties: { findings: { type: 'array', items: FINDING } } }
const VERDICT = { type: 'object', additionalProperties: false, required: ['real', 'reason'],
  properties: { real: { type: 'boolean' }, refuted: { type: 'boolean' }, reason: { type: 'string' } } }
const REPORT = { type: 'object', additionalProperties: false, required: ['blockers', 'major', 'minor', 'verdict'],
  properties: {
    blockers: { type: 'array', items: FINDING }, major: { type: 'array', items: FINDING },
    minor: { type: 'array', items: FINDING }, verdict: { enum: ['pass', 'fix-required', 'block'] },
  } }

const DIMENSIONS = [
  { key: 'content-fidelity', agentType: 'technical-writer', effort: 'xhigh',
    prompt: `Act as a philatelic newsletter proofreader. Re-read the PDF at ${args.pdfPath}. Verify every extracted title, featured article, member name, condolence, and announcement against the source text. Report each mismatch as a finding.` },
  { key: 'data-integrity', agentType: 'quality-engineer', effort: 'xhigh',
    prompt: `Audit the extracted data for edition ${args.editionId}. Validate against data/schemas/newsletter.schema.json and meeting.schema.json. Check meeting count, date continuity (no gaps/dupes vs existing meetings.json), enum validity, and that every below-high-confidence value carries an [UNVERIFIED] marker. Changed files: ${JSON.stringify(args.changedFiles)}.` },
  { key: 'ics-time-math', agentType: 'quality-engineer', effort: 'xhigh',
    prompt: `Verify ICS correctness for ${args.editionId}. For each generated .ics, confirm UTC math (individual files) and local serialization (quarterly file), CDT vs CST for the quarter's dates, cancelled-meeting 1-minute duration, and UID/PRODID conventions. Cross-check against the newest existing template .ics files.` },
  { key: 'diff-safety', agentType: 'pr-review-toolkit:silent-failure-hunter', effort: 'high',
    prompt: `Review the working-tree diff for edition ${args.editionId}. Flag any modification outside the permitted-file scope, any silently swallowed error, and confirm npm run build:js actually rebuilt the meeting bundle. Changed files: ${JSON.stringify(args.changedFiles)}.` },
]

phase('Review')
const reviewed = await pipeline(
  DIMENSIONS,
  d => agent(d.prompt, { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS, agentType: d.agentType, effort: d.effort }),
  (review, d) => parallel((review?.findings ?? []).map(f => () =>
    agent(`Adversarially verify this ${d.key} finding against the source PDF (${args.pdfPath}). Set real:false ONLY if you can disprove it; otherwise real:true. Finding: ${JSON.stringify(f)}`,
      { label: `verify:${d.key}`, phase: 'Refute', schema: VERDICT, effort: 'xhigh' })
      .then(v => ({ ...f, dimension: d.key, verdict: v })))),
)

phase('Refute')
const LENSES = ['calendar-table', 'prose-cross-check', 'schema-enum']
const refutations = await parallel((args.extractedFacts ?? []).map(fact => () =>
  parallel(LENSES.map(lens => () =>
    agent(`You are a skeptic. Using the ${lens} lens, try to REFUTE this extracted fact by re-reading ${args.pdfPath}. Fact: ${JSON.stringify(fact)}`,
      { label: `refute:${fact.id ?? fact.key}`, phase: 'Refute', schema: VERDICT, effort: 'xhigh' })))
    .then(votes => {
      const v = votes.filter(Boolean)
      return { fact, refutedBy: v.filter(x => x.refuted).length, votes: v }
    })))

phase('Synthesize')
const confirmed = reviewed.flat().filter(Boolean).filter(f => f.verdict?.real)
const contested = refutations.filter(r => r.refutedBy >= 2)
const report = await agent(
  `Synthesize a ranked reviewer report for edition ${args.editionId}. Confirmed findings: ${JSON.stringify(confirmed)}. Contested facts (majority-refuted): ${JSON.stringify(contested)}. Bucket by severity, give file+location and a corrective action for each, and set an overall verdict.`,
  { label: 'synthesize', phase: 'Synthesize', schema: REPORT, effort: 'max' })

return { confirmed, contested, report }
```

### Research workflow (run before planning)

```javascript
export const meta = {
  name: 'philatex-research',
  description: 'Research codebase patterns and authoritative format specs before extracting a Philatex newsletter',
  phases: [{ title: 'Gather' }, { title: 'Critique' }],
}
// args = { editionId, quarter, year, learnings: '...(contents of references/learnings.md)...' }

phase('Gather')
const [patterns, specs] = await parallel([
  () => agent(`Map the SAPA patterns a new edition (${args.editionId}) must match. Read the newest entries in data/newsletters/newsletters.json and data/meetings/meetings.json, the 3 most recent data/calendar/*.ics, the latest public/sapa-q*-*.ics, and the section anchors in newsletter.html / meetings.html / index.html. Return exact shapes, naming, and anchors. Also fold in any relevant prior learnings: ${args.learnings}`,
    { label: 'codebase-patterns', phase: 'Gather', agentType: 'Explore', effort: 'medium' }),
  () => agent(`Use Context7 (resolve-library-id then query-docs) to confirm current constraints for: esbuild (build-time meeting bundling), lunr (search index), vanilla-calendar-pro (calendar data shape). For iCalendar, treat existing template .ics files as source of truth and only resolve ambiguity. Return only facts that constrain how data/ICS/HTML are written for ${args.quarter} Quarter ${args.year}.`,
    { label: 'format-specs', phase: 'Gather', effort: 'high' }),
])

phase('Critique')
const gaps = await agent(
  `Adversarial completeness critic. Given these findings, enumerate what is MISSING or unverified that could cause an incorrect extraction or a broken build for ${args.editionId}. Findings: ${JSON.stringify({ patterns, specs })}.`,
  { label: 'research-critic', phase: 'Critique', effort: 'xhigh' })

return { patterns, specs, gaps }
```

## Passing args from the orchestrator

The orchestrator invokes each workflow with `Workflow({ script: <inline>, args: {...} })` (or `scriptPath` for a saved copy). Build `extractedFacts` for the review workflow from the extraction agent's Step 9 summary: one entry per meeting (`{id, date, time, type}`), plus officer-roster and new-member entries, plus the newsletter `publishDate`. These are the high-risk facts the skeptics refute.
