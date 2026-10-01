---
slug: ajv-8-migration
status: complete
completed: 2026-07-07
repo: sastamps
pr: 117
merge_commit: 1c394a9
supersedes: 112
---

# Summary: Migrate ajv 6 → 8 (dev tooling)

## Outcome — DONE

Migrated `ajv` 6.15.0 → 8.20.0 by hand off a healthy `origin/main` (worktree
`deps/ajv-8-migration`), not by merging Dependabot #112 (whose branch ships a broken
lockfile: `npm ci` → `Missing: proxy-agent@8.0.2`). Opened **PR #117**, verified, squash-merged
to `main` (`1c394a9`). **Closed #112 as superseded.**

## What ajv 8 broke, and the fix (3 changes + lockfile)

| # | Breakage | Fix | File |
|---|----------|-----|------|
| 1 | Built-in `format` validators removed → `ajv.compile()` throws `unknown format "date"` under strict mode | `npm i -D ajv-formats`; `addFormats(ajv)` | `scripts/validate-data.js`, `package.json` |
| 2 | `err.dataPath` renamed to `err.instancePath` + switched to JSON Pointer (`/time` vs `.time`) → `KNOWN_EXCEPTIONS` predicates silently stop matching (BOG/cancelled conventions become false FAILs) | Normalize `instancePath` → dot-path (no-op on ajv 6) | `scripts/validate-data.js` |
| 3 | Non-standard `"example"` keyword → strict-mode unknown-keyword throw | `"example"` → `"examples": [...]` | `data/schemas/newsletter.schema.json` |

No `ajv` pin in `package.json` `overrides` (only `glob`) — nothing to bump there.

## Verification (Node 22.22.0 / npm 10.9.4)

- **Before** (raw ajv 8, unpatched): `Error: unknown format "date" ... at ajv.compile()`.
- **After**: `npm run validate:data` → `0 error(s), 36 convention-warning(s), 0 pre-existing`,
  exit 0 (conventions correctly stay WARN — proves the instancePath normalization).
- All 5 `data/schemas/*.json` compile under ajv 8 + ajv-formats (script exercises 2).
- `npm ci --dry-run` → clean, **no EUSAGE**.
- CI on #117: CodeQL ×2, Run Tests, Validate PR, GitGuardian, CodeRabbit — all pass; merged CLEAN.

## Notes

- Scope: dev tooling only (static Pages site); only `npm run validate:data` affected.
- The active `deps/benign-dev-bumps` branch was never disturbed (all work in a worktree).
