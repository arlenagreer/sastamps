---
slug: highlight-steve-mabie-tribute
created: 2026-06-24
type: quick
source: email from Jim Durham ([email redacted]), cc Nancy Mabie ([email redacted])
---

# Quick Task: Add Steve Mabie tribute reference to Highlights

## Request
Jim Durham (Q3 2026 Philatex editor) emailed:
> "Can you add a reference to the story about Steve Mabie to the Highlights
> sections? He is currently in hospice and I hope he gets to see the article
> on the web site before he passes."

The "story" is the **"Thank You Steve Mabie!"** tribute article on **page 2** of
the Q3 2026 newsletter (`public/SAPA-PHILATEX-Third-Quarter-2026.pdf`) — a Board
tribute to the outgoing club treasurer / newsletter editor.

## Approach
1. Homepage `index.html` "Latest Issue Highlights" is the visible Highlights
   section — add a prominent **first** bullet linking to the article (PDF p.2)
   so Steve/Nancy can click straight to it.
2. `data/newsletters/newsletters.json` Q3 `highlights[]` — add a parallel entry
   for data parity + Lunr search discoverability (note: this array is not
   rendered to the DOM on any live page; it only feeds the search index).
3. Regenerate the search index via `scripts/build-search-index.js`.

## Constraints / guardrails
- Time-sensitive + emotionally significant (hospice). Tone must be dignified;
  no private health details published.
- `escapeHTML()` is the render chokepoint for newsletters.json → plain text only.
- Never hand-edit `dist/`; regenerate via the sanctioned build script.
- Deploy (merge to main → GitHub Pages) and the reply email to Jim are
  outward-facing/hard-to-reverse → require explicit user approval (standing rule).

## Files
- `index.html` (Highlights bullet + link)
- `data/newsletters/newsletters.json` (Q3 highlight)
- `dist/data/search-index.json`, `dist/data/search-documents.json` (regenerated)
