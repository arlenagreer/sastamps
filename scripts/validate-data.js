#!/usr/bin/env node
/**
 * validate:data — schema-validate the SAPA data files against their JSON Schemas.
 *
 * Added after the 2026-Q3 /philatex-update rehearsal found that NO npm script
 * validated data/*.json against data/schemas/*.schema.json (test:quick is
 * html/js/css only), so a bad enum or missing required field could ship silently.
 * This is the automated green bar for the /philatex-update acceptance contract.
 *
 * Two kinds of leniency, both deliberate:
 *
 * 1. Known-convention exceptions (always downgraded to WARN) — intentional data
 *    patterns the schema is simply too strict to express, which we will NOT "fix"
 *    by editing the off-limits schema files or rewriting history:
 *      - BOG meetings carry `time.bogStart` ("7:15 PM"); schema `time` is
 *        additionalProperties:false.
 *      - Cancelled/holiday meetings use "N/A" time strings, which fail the
 *        H:MM AM/PM time pattern.
 *
 * 2. Scope (the green-bar mechanism): set VALIDATE_NEW_IDS to a comma-separated
 *    list of the ids this run adds/changes. Only those entries hard-FAIL on a
 *    real violation; pre-existing violations in untouched entries are reported as
 *    [pre-existing] baseline warnings. With no VALIDATE_NEW_IDS set, the script
 *    runs in full-audit mode (every real violation is a hard error) — useful for
 *    surfacing the historical backlog, not as a gate.
 *
 * Exit 1 if any in-scope hard error; otherwise 0.
 */
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const root = path.resolve(__dirname, '..');
const ajv = new Ajv({ allErrors: true });
const load = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const NEW_IDS = (process.env.VALIDATE_NEW_IDS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
const scoped = NEW_IDS.length > 0;

const datasets = [
  { name: 'meetings', file: 'data/meetings/meetings.json', key: 'meetings',
    schema: 'data/schemas/meeting.schema.json' },
  { name: 'newsletters', file: 'data/newsletters/newsletters.json', key: 'newsletters',
    schema: 'data/schemas/newsletter.schema.json' },
];

// (err, item) -> true means "intentional convention, downgrade to WARN".
const KNOWN_EXCEPTIONS = [
  (e) => e.keyword === 'additionalProperties'
      && e.params && e.params.additionalProperty === 'bogStart'
      && /\.time$/.test(e.dataPath || ''),
  (e, item) => item && item.cancelled === true
      && /^\.time\b/.test(e.dataPath || '')
      && (e.keyword === 'pattern' || e.keyword === 'required'),
];

let hardErrors = 0;
let exceptions = 0;
let baseline = 0;

for (const ds of datasets) {
  const validate = ajv.compile(load(ds.schema));
  const arr = load(ds.file)[ds.key] || [];
  for (const item of arr) {
    if (validate(item)) continue;
    for (const err of validate.errors) {
      const extra = err.params && err.params.additionalProperty
        ? ` (+${err.params.additionalProperty})` : '';
      const msg = `${ds.name}[${item.id || '?'}]${err.dataPath} ${err.message}${extra}`;
      if (KNOWN_EXCEPTIONS.some((fn) => fn(err, item))) {
        console.warn(`  WARN  ${msg} [known convention]`);
        exceptions++;
      } else if (scoped && !NEW_IDS.includes(item.id)) {
        console.warn(`  base  ${msg} [pre-existing]`);
        baseline++;
      } else {
        console.error(`  FAIL  ${msg}`);
        hardErrors++;
      }
    }
  }
  console.log(`${ds.name}: ${arr.length} entries checked`);
}

console.log(
  `\nvalidate:data — mode: ${scoped ? `scoped to ${NEW_IDS.length} new id(s)` : 'full audit'} | ` +
  `${hardErrors} error(s), ${exceptions} convention-warning(s), ${baseline} pre-existing`,
);
process.exit(hardErrors > 0 ? 1 : 0);
