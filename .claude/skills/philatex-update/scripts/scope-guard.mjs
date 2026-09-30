#!/usr/bin/env node
// scope-guard.mjs — PreToolUse hook for philatex-newsletter-agent.
//
// Blocks Edit/Write/MultiEdit/NotebookEdit on any file outside the /philatex-update
// permitted-file scope (SKILL.md "Permitted-File Scope Boundary"). Allowed targets:
//   - site files inside a run worktree (.claude/worktrees/philatex-*);
//   - the proofreading report in the MAIN checkout's .planning/reviews/ (run bookkeeping
//     lives there, outside the worktree, so it survives worktree removal and is never
//     linted by bin/ci). The contract, QC ledger and snapshots are never agent-writable.
// It is wired in the agent's frontmatter, so it applies only while the extractor/fixer
// runs, never to ordinary development.
//
// Limits, by design: it sees file-editing tools only. A shell command (`cp`, `sed -i`,
// an npm build) is not intercepted — the diff-safety review dimension remains the
// backstop for those. Build outputs (search.html, dist/**) are written by npm
// scripts through Bash, so they never reach this hook.
//
// The repo root is taken from the TARGET file's location, not the session's cwd: the
// session usually starts in the main checkout while the agent edits the run's worktree.
// Edits inside the main checkout itself are refused — every run writes in its own
// linked worktree (SKILL.md Phase 4b, Rule 14).
//
// Input: hook JSON on stdin ({ cwd, tool_name, tool_input: { file_path | notebook_path } }).
// Exit 0 = allow; exit 2 + stderr = deny (the reason is shown to the agent).

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PERMITTED = [
  /^data\/newsletters\/newsletters\.json$/,
  /^data\/meetings\/meetings\.json$/,
  /^data\/calendar\/[^/]+\.ics$/,
  /^public\/[^/]+\.ics$/,
  /^public\/[^/]+\.pdf$/,
  /^(index|newsletter|meetings|about|contact)\.html$/,
];
// The only file the agent may write in the main checkout.
const MAIN_BOOKKEEPING = /^\.planning\/reviews\/[^/]+-newsletter-review\.md$/;

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); } // not a hook payload: stay out of the way
  const target = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
  if (!target) process.exit(0);

  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const abs = path.resolve(cwd, target);
  const deny = (why) => {
    process.stderr.write(`philatex scope-guard: ${why} Do not modify it. Report the needed change under "Out-of-Scope Observations" instead (SKILL.md, Permitted-File Scope Boundary).\n`);
    process.exit(2);
  };

  // Nearest existing ancestor → the git work tree that owns the target.
  let dir = path.dirname(abs);
  while (!fs.existsSync(dir) && dir !== path.dirname(dir)) dir = path.dirname(dir);
  const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  let root, gitDir, commonDir;
  try {
    root = git('rev-parse', '--show-toplevel');
    gitDir = path.resolve(dir, git('rev-parse', '--git-dir'));
    commonDir = path.resolve(dir, git('rev-parse', '--git-common-dir'));
  } catch { deny(`${abs} is not inside a git work tree.`); }

  const rel = path.relative(root, abs).split(path.sep).join('/');
  if (gitDir === commonDir) {
    if (MAIN_BOOKKEEPING.test(rel)) process.exit(0);
    deny(`${abs} is in the main checkout; a /philatex-update run writes site files only in its own worktree (.claude/worktrees/philatex-*), and bookkeeping only as .planning/reviews/{EDITION_ID}-newsletter-review.md.`);
  }
  if (!/(^|\/)\.claude\/worktrees\/philatex-[^/]+$/.test(root.split(path.sep).join('/'))) deny(`${abs} is in a worktree that is not a /philatex-update run worktree (.claude/worktrees/philatex-*).`);
  if (PERMITTED.some((re) => re.test(rel))) process.exit(0);
  deny(`${rel} is outside the /philatex-update permitted-file scope.`);
});
