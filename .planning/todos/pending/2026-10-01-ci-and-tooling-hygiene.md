---
created: 2026-10-01T03:10:00.000Z
title: CI and tooling hygiene found during the Dependabot fix (#158)
area: tooling
severity: minor
files:
  - package.json (test:a11y, build:css)
  - dist/css/styles.min.css, scripts/extract-critical-css.js, and index/about/contact/meetings/membership/newsletter.html (item 8)
  - .github/workflows/ci.yml, .github/workflows/scheduled-tests.yml
  - .pa11yrc.json
  - scripts/optimize-images.js
  - public/sapa-q4-2025-meetings.ics, data/calendar/ (2025-Q4 individual .ics)
---

## Problem

Found on 2026-09-30 while fixing the Dependabot alerts (#158). All of these already existed on main, and none were caused by that change.

1. **No accessibility test has ever run.** `test:a11y` calls `pa11y-ci`, which is not installed. Cloud CI runs that step with errors suppressed, and `scheduled-tests.yml` appends `|| true`, so it passes every time. Note that pa11y-ci 4.1.1 depends on pa11y 9 and would bring the extract-zip vulnerability back.
2. **`.pa11yrc.json` uses an outdated option.** It sets `ignoreHTTPSErrors`, which puppeteer renamed to `acceptInsecureCerts` (v23+), so the setting is silently ignored.
3. **The deploy job downloads Chrome it never uses.** puppeteer's install script fetches about 170 MB on every `npm ci`. Setting `PUPPETEER_SKIP_DOWNLOAD=1` on that job would stop it.
4. **DONE (chore/remove-unused-deps):** removed cssnano and autoprefixer (never loaded: there is no PostCSS config), and nanoid as a direct dependency. nanoid 3.x is still installed as postcss's own dependency. postcss and postcss-cli stay: `build:css` regenerates the committed `dist/css/styles.min.css` (7 of the 14 root pages load it). Nothing in `npm run build` or CI runs it, so run it by hand after editing `css/styles.css`.
5. **CI fetches an unpinned package.** It runs `npx broken-link-checker`, which is not a devDependency, so every run pulls whatever version is current and Dependabot never scans it.
6. **`scripts/optimize-images.js` has a write race.** Concurrent read-modify-write on `dist/images/placeholders.json` makes the file nondeterministic and sometimes malformed JSON.
7. **2025-Q4 calendar files fail check-ics with 27 errors.** There are no individual files, the DTSTAMP is `20250923`, and Oct 17 starts at 17:30 where the JSON says 18:30. The events are in the past, so this is low priority.
8. **HIGH: an inline CSS source map is copied into the HTML of the main pages, one more copy per build.** `postcss` (via `build:css`) appends an inline source map to the committed `dist/css/styles.min.css` (187,544 bytes; the CSS itself is 77,806). `scripts/extract-critical-css.js`, run by every `npm run build`, splits that file on `}`. The map chunk contains the text "h3", so it is inlined into a critical `<style>` block on index, about, contact, meetings, membership and newsletter.html. Each build adds another ~130 KB copy. Measured 2026-10-01: live homepage 517 KB with 3 copies, meetings 622 KB with 4, against 20 KB for glossary.html (which links `css/styles.css` and is unaffected); two consecutive local builds took index.html from 4 to 5 copies (647 KB to 777 KB). Fix needs all three parts: `build:css --no-map` (measured: then a true copy of `css/styles.css`) and a regenerated stylesheet; make the extractor skip comments and source maps; strip the copies already committed in the six pages.

## Solution

Pick the items worth doing. 8 (page weight on the live site) comes first, then 1 (choose a runner: pa11y 10 per URL, or lighthouse accessibility). 4 is done.
