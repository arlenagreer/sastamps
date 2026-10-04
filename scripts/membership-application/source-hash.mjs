/**
 * The hash of the sources of downloads/SAPA_membership_application.pdf: the
 * template and the build script. The build records it in the PDF's Subject,
 * and tests/membership-application.test.mjs fails when it no longer matches,
 * so an edit to either without a rebuild is caught.
 *
 * Package versions (puppeteer, pdf-lib, @fontsource) are deliberately NOT in
 * it: Dependabot bumps them weekly, and a hash over them would fail every one
 * of those PRs until someone rebuilt the PDF by hand. After a bump that
 * should change the output, rebuild on purpose.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const SOURCES = ['scripts/membership-application/application.html', 'scripts/build-membership-application.mjs'];

export function sourceHash(root) {
  const hash = crypto.createHash('sha256');
  for (const rel of SOURCES) {hash.update(`${rel}\0`).update(fs.readFileSync(path.join(root, rel))).update('\0');}
  return hash.digest('hex');
}
