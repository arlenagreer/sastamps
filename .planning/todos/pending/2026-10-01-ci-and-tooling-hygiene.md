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
8. **DONE (fix/inlined-source-map): stacked build output removed from the six main pages.** Three build steps appended instead of replacing, so each build stacked another copy of the critical CSS (with a ~110 KB inline source map), the font block, the font-observer script and `display=swap`; pages reached 300-490 KB committed and 430-620 KB live. They now write marked regions that are replaced in place. The critical region inlines `css/critical.css` and loads the full stylesheet render-blocking. `build:css` uses `--no-map`. `scripts/check-build-idempotent.js` (in `bin/ci`) proves the committed pages are a fixed point of the build.

9. **DONE (feat/plain-css-links): font loading works with storage blocked.** The inline observer is replaced by `js/font-loading.js` (guarded storage, 3 s fallback, weights passed), loaded as a plain script with `css/font-loading.css`, and covered by `scripts/test-font-loading.js`.

10. **resources.html still has an authored inline `<style class="critical-css">` block** (~240 lines) after its stylesheet links. It redefines `:root` tokens and base rules, so a token change in `css/critical.css` or `css/styles.css` will not reach that page. Removing it as-is changes the layout (header 82 → 137 px at 375 px), so fold its page-specific rules into `css/styles.css` deliberately, then delete it.

11. **`test:js` never lints the top-level `js/*.js` files.** `eslint js/**/*.js` is unquoted, so the shell expands `**` as `*` and only `js/<dir>/*.js` is linted. Quoting it lints 41 files instead of 32 and reports 72 errors in 7 existing files (calendar-adapter, calendar-component, error-boundary, lazy-loader, modal, reminder-system, script). Fix those, then quote the glob. (`js/font-loading.js` is listed explicitly meanwhile.)

## Solution

Pick the items worth doing. 1 (choose a runner: pa11y 10 per URL, or lighthouse accessibility) gives the most value. 4, 8 and 9 are done.
