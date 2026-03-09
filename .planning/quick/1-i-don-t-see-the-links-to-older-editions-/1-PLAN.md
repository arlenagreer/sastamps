---
phase: quick-fix
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - dist/js/archive.min.js
autonomous: true
requirements: [QUICK-01]

must_haves:
  truths:
    - "Archived newsletter links (2008-2024) appear on the archive page"
    - "Each year section renders with clickable PDF download links"
  artifacts:
    - path: "dist/js/archive.min.js"
      provides: "Built archive bundle containing renderArchivedNewsletters"
      contains: "renderArchivedNewsletters"
  key_links:
    - from: "dist/js/archive.min.js"
      to: "data/newsletters/archived-newsletters.json"
      via: "fetch call in renderArchivedNewsletters"
      pattern: "archived-newsletters"
---

<objective>
Rebuild the archive JS bundle so older newsletter links (2008-2024) appear on the archive page.

Purpose: The source code in js/pages/archive.js was updated (Mar 9) to include renderArchivedNewsletters() which fetches archived-newsletters.json and renders year-grouped PDF links. However, the built bundle dist/js/archive.min.js is stale (Feb 16) and does not contain this function. The archived newsletters section loads an empty container because the rendering code was never compiled into the production bundle.

Output: Rebuilt dist/js/archive.min.js containing the archived newsletter rendering logic.
</objective>

<execution_context>
@/Users/arlenagreer/.claude/get-shit-done/workflows/execute-plan.md
@/Users/arlenagreer/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
The archive page (archive.html) loads dist/js/archive.min.js which is built from js/pages/archive.js via esbuild.
The source archive.js contains renderArchivedNewsletters() that fetches data/newsletters/archived-newsletters.json and renders year-grouped PDF links into the #archived-newsletters container.
The built bundle is stale (Feb 16) and missing this function. The JSON data (99 entries) and PDFs (98 files in public/newsletter_archive/) are all present.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rebuild JS bundles to include archived newsletter rendering</name>
  <files>dist/js/archive.min.js</files>
  <action>
    Run `npm run build:js` from the project root to rebuild all JS bundles via esbuild. This will compile js/pages/archive.js (which contains renderArchivedNewsletters) into dist/js/archive.min.js.

    After the build completes, verify the built bundle contains the archived newsletter rendering code by checking for "archived-newsletters" or "renderArchivedNewsletters" in the output file.
  </action>
  <verify>
    <automated>grep -c "archived-newsletters" dist/js/archive.min.js</automated>
  </verify>
  <done>dist/js/archive.min.js contains the renderArchivedNewsletters function and references to archived-newsletters.json. When the archive page loads, the #archived-newsletters container will be populated with year-grouped PDF links for 2008-2024.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Rebuilt the archive JS bundle so it includes the code that renders older newsletter editions (2008-2024) on the archive page.</what-built>
  <how-to-verify>
    1. Run `npm run serve` to start the dev server
    2. Visit http://localhost:3000/archive.html
    3. Scroll below the 2025/2026 newsletter cards
    4. Confirm you see year-grouped sections (2024, 2023, ... 2008) with clickable PDF links
    5. Click one or two links to confirm they open the correct PDF
  </how-to-verify>
  <resume-signal>Type "approved" or describe any issues</resume-signal>
</task>

</tasks>

<verification>
- `grep -c "archived-newsletters" dist/js/archive.min.js` returns a count > 0
- Archive page renders 17 year sections (2008-2024) with PDF links when loaded in browser
</verification>

<success_criteria>
The archive page displays clickable links to all 98 older newsletter PDFs (2008-2024), grouped by year in descending order, below the existing 2025-2026 newsletter cards.
</success_criteria>

<output>
After completion, create `.planning/quick/1-i-don-t-see-the-links-to-older-editions-/1-SUMMARY.md`
</output>
