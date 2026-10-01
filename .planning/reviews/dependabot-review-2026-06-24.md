# Dependabot PR Review — 2026-06-24

Method: per-dependency research (changelogs/CVEs/known issues) + adversarial verification
(26-agent dynamic workflow) + TDD-style local regression validation (baseline → merge →
build → test → artifact-diff) in an isolated git worktree. Repo: `arlenagreer/sastamps`.

## TL;DR verdicts

| PR | Change | Risk | Verdict |
|----|--------|------|---------|
| **#98** | brace-expansion 1.1.14→1.1.15 (+2.1.0→2.1.1) | none | ✅ **Merge as-is** — fixes ReDoS CVE-2025-5889 |
| **#99** | undici 7.25.0→7.27.2 | low | ✅ **Merge as-is** — security-positive, lockfile-only dev |
| **#100** | actions/checkout v6→v7 | none | ✅ **Merge as-is** — security hardening, no behavior change here |
| **#102** | grouped: sharp + 8 dev tools + ~130 transitives | low | ⚠️ **Merge ONLY after fixing the lockfile + regenerating dist** |

No change in this batch touches a **shipped-to-browser** dependency
(`vanilla-calendar-pro`, `lunr`, `node-fetch` are all unchanged). Production reaches only
through build artifacts, generated images, the test/lint gates, and CI.

## Baseline (current `main`, 8c1101b)
- `npm ci` PASS, `npm run build` PASS, `test:js`/`test:css`/`test:md`/`validate:data` PASS.
- ⚠️ Pre-existing, unrelated to deps: `test:html` fails with **18 trailing-whitespace errors**
  (mostly `newsletter.html`) — constant across every branch, factored out. Worth a separate fix.
- ⚠️ Pre-existing, unrelated to deps: `npm run optimize:images` fails `sharp-cli: command not found`
  because `sharp-cli@5.2.0` installs its binary as **`sharp`**, not `sharp-cli` (`bin:{"sharp":"bin/cli.js"}`),
  but the `optimize:*` scripts call `sharp-cli`. The CI/production image path
  (`npm run build` → `scripts/optimize-images.js` → `require('sharp')`) is unaffected and works.

---

## PR #98 — brace-expansion 1.1.14 → 1.1.15
- **Security:** fixes **CVE-2025-5889 / GHSA-v6h2-p8h4-qcjw** (ReDoS / catastrophic backtracking in `expand()`).
- Lockfile-only, dev-only, transitive. No `package.json` change. Patch bump; sub-deps unchanged.
- **Local validation:** merge CLEAN, `npm ci`+build+all tests PASS, **dist byte-identical** to baseline.
- **Verdict: MERGE.**

## PR #99 — undici 7.25.0 → 7.27.2
- Lockfile-only transitive dev dep, pulled in only by `linkinator` (CI link checker). Never imported by app/build code.
- Security-positive: the 7.27.x line carries the fix for the Socks5ProxyAgent cross-origin advisory (CVE-2026-6734); no breaking API changes relevant to its role.
- **Local validation:** merge CLEAN, `npm ci`+build+all tests PASS, **dist byte-identical** to baseline.
- **Verdict: MERGE.**

## PR #100 — actions/checkout v6 → v7
- Major bump, but the **only** functional change (PR #2454) is refusing fork-PR checkout under
  `pull_request_target`/`workflow_run` unless `allow-unsafe-pr-checkout: true`. **None of your 4 usages
  use those triggers**, so it's a no-op behavior change (net security hardening).
- Both v6 and v7 run on the `node24` action runtime — **no runner/Node delta**. CI is Node 22 on ubuntu-latest.
- **Local validation:** merge CLEAN; merged workflows show 4× `@v7`, 0 remaining `@v6`.
- **Verdict: MERGE.**

## PR #102 — grouped "dependencies" (sharp + dev tooling + transitives)
Direct bumps: `sharp` 0.34.5→0.35.2 (runtime/build-time), `esbuild` 0.28.0→0.28.1,
`eslint` 10.4.1→10.5.0, `cssnano` 8.0.1→8.0.2, `markdownlint-cli` 0.48→0.49,
`lighthouse` 13.3→13.4, `autoprefixer` 10.5.0→10.5.1, `globals` 17.6→17.7, plus ~130 transitives
(incl. hidden majors `caniuse-api` 3→4 and `commander` 14→15).

### 🔴 BLOCKER (must fix before merge)
**The PR's lockfile is internally inconsistent** — `npm ci` FAILS on the pure branch with 14
`Missing … from lock file` entries (puppeteer/proxy-agent deps newly required by `lighthouse@13.4.0`
→ `puppeteer-core@25.2.0`). **`ci.yml` runs `npm ci`, so merging as-is breaks CI.**
- **Fix:** `npm install` reconciles it (**+228 / −48** lockfile lines), after which `npm ci` PASSES.
  Equivalent alternative: comment `@dependabot recreate` on the PR.

### Per-dependency findings (all inapplicable / safe for this repo)
- **sharp 0.35** — build-time only; every 0.35.0 breaking change (Node-18 drop, AVIF retune, removed
  APIs, `limitInputChannels`) is inapplicable (Node 22; WebP/PNG only; uses only `.resize/.blur/.webp/.png/.toFile/.toBuffer`).
  Nested `sharp-cli` keeps its own pinned 0.34.2 copy; the CI path gets 0.35.2. **Local build regenerated valid WebP.**
- **esbuild 0.28.1** — changes **7 of 16 shipped JS bundles**. Proven safe: the ONLY diff in
  `home.min.js` is an 87→173B region (offset 734) where esbuild's `__esm`/`__commonJS` lazy-init
  helpers gain `try{…}catch{throw}` to re-throw module-init errors (esbuild fix #4461/#4467).
  **142KB+ of your app code byte-identical.** No behavioral change for modules that init successfully.
- **cssnano 8.0.2** — pulls security fix `postcss-selector-parser` 7.1.4 (CVE-2026-9358, low ReDoS).
  **CSS output byte-identical** in local build. eslint/autoprefixer/globals: no enabled rules/paths affected.
- **markdownlint-cli 0.49** — `commander` 15 needs Node ≥22.12 (satisfied); 0.41 rule tweaks reduce false
  positives. **`test:md` still PASSES locally** (no new failures).
- **lighthouse 13.4** — dev-only, not in build/test path. **caniuse-api 3→4** co-bumped with its
  postcss consumers (resolves cleanly to ^4); could shift minified CSS but local CSS is byte-identical.
- **Transitive sweep** — no yanked/deprecated/malware pkgs; `js-yaml` 4.2.0 + `markdown-it` 14.2.0 are net security fixes.

### Post-fix local validation (merge into current main + `npm install` reconcile)
`npm ci` PASS · build PASS · test:js/css/md PASS · validate:data PASS (0 errors) ·
CSS byte-identical · 7 JS bundles changed (safe esbuild helper) · sample WebP valid.

### Verdict: MERGE after (1) reconciling the lockfile and (2) regenerating + committing `dist/`
Note: `dist/` is force-tracked and `sharp` (a runtime dep) moves here, so regenerating the 7
changed bundles + images and committing them is consistent with your established practice.

---

## OUTCOME (executed 2026-06-24)
- ✅ **#100** merged → `4ecb5e6` · ✅ **#98** merged → `fb9ced1` · ✅ **#99** merged → `c4a08c9`
- ✅ **#102** lockfile reconciled (`af341c7`, `npm ci` now PASS in CI) and **merged (squash)** → `4a3957c`
- All four PRs resolved. `main` fast-forwarded locally to the merged state; validation worktree removed.
- Note: merging #98/#99/#100 in ~30s caused transient GitHub Pages *deploy* collisions (test jobs all
  passed); a `gh run rerun --failed` then hit the "multiple github-pages artifacts" quirk. The #102 merge
  triggers a fresh single deploy that heals it. Live site `www.sastamps.org` was `built`/current throughout
  (these PRs change no site output).
- Follow-ups (out of scope): fix `optimize:*` scripts (`sharp-cli`→`sharp`), clear `test:html`
  trailing-whitespace, add `concurrency:{group:pages}` to the deploy job, triage 9 GitHub security alerts.

## Recommended merge order
1. #100 (CI YAML — independent), #98, #99 (lockfile-only, no `package.json`) — any order, safe as-is.
2. #102 LAST, after reconciling its lockfile against the then-current `main` (so it rebases cleanly
   over #98/#99's lockfile changes) and regenerating `dist/`.
