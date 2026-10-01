---
slug: ajv-8-migration
created: 2026-07-07
repo: sastamps
type: quick
---

# Quick Task: Migrate ajv 6 → 8 (dev tooling: `npm run validate:data`)

## Problem

Dependabot PR #112 bumps `ajv` 6.15.0 → 8.20.0 (devDependency, major, skips v7). Held
because ajv 8 breaks `scripts/validate-data.js`. Dependabot also ships a broken lockfile on
this repo (`npm ci` fails: `Missing: proxy-agent@8.0.2` via @puppeteer/browsers), so the
upgrade is done by hand off a healthy `origin/main`, not by merging #112.

Scope: dev tooling only (static Pages site). Only `npm run validate:data` is at stake.

## Environment

- Node 22.22.0 / npm 10.9.4, real npm (not Dependabot).
- Feature branch `deps/ajv-8-migration` in a git worktree off `origin/main` (e8a17f2),
  so the active `deps/benign-dev-bumps` branch is not disturbed.

## Known breakages (ajv 8)

1. Strict mode ON → unknown keyword `"example"` in `newsletter.schema.json:15` throws at
   compile. Fix: rename to standard `"examples": [ ... ]` (array) — a legitimate schema fix.
2. `format` validators no longer built in → add via `ajv-formats` (`addFormats(ajv)`).
   Schemas use `date`, `email`, `date-time`, `uri` — all standard, all covered by ajv-formats.
3. `err.dataPath` (dot-notation) renamed to `err.instancePath` (JSON Pointer). Used by the
   `KNOWN_EXCEPTIONS` predicates and the message builder. Normalize instancePath → dot-path
   so the BOG-`bogStart` and cancelled-meeting `N/A`-time conventions stay WARN, not FAIL.

## Steps

1. [reproduce] `npm ci` baseline (proves main lockfile healthy) → `npm install ajv@8.20.0`
   → `npm run validate:data` → capture the RAW ajv-8 failure. **Show user.**
2. [migrate] `npm install ajv-formats`; edit `scripts/validate-data.js`
   (`addFormats(ajv)` + instancePath normalization); edit `newsletter.schema.json`
   (`example` → `examples`). Handle any additional strict-mode complaint the real error shows.
3. [overrides] Check package.json overrides/resolutions for an `ajv` v6 pin (currently only
   pins `glob` — expected no-op, confirm).
4. [validate] `npm run validate:data` passes (both meetings + newsletters datasets; conventions
   stay WARN). Bonus: confirm the other 3 schemas (glossary/resource/archived-newsletter) still
   compile under ajv 8. **Show user the passing run.**
5. [lockfile] `npm ci --dry-run` shows no EUSAGE.
6. [ship] Commit (validate-data.js, newsletter.schema.json, package.json, package-lock.json),
   push, open PR against main, close #112 as superseded, merge once validated.

## Done when

- `npm run validate:data` passes cleanly under ajv 8.
- `npm ci --dry-run` shows no EUSAGE.
- PR opened + merged; #112 closed as superseded.
- ajv-8 failure (before) and passing run (after) shown to user.
