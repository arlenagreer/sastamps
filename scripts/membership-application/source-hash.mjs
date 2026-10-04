/**
 * The hash of everything that shapes downloads/SAPA_membership_application.pdf:
 * the template, the build script, and the pinned versions of the packages
 * that print it (puppeteer), fill it in (pdf-lib) and set its type
 * (@fontsource). The build records it in the PDF's Subject, and
 * tests/membership-application.test.mjs fails when it no longer matches, so a
 * change to any of them without a rebuild is caught.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const PACKAGES = ['puppeteer', 'pdf-lib', '@fontsource/merriweather', '@fontsource/open-sans'];
export const SOURCES = ['scripts/membership-application/application.html', 'scripts/build-membership-application.mjs'];

export function sourceHash(root) {
  const { devDependencies = {} } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const hash = crypto.createHash('sha256');
  for (const rel of SOURCES) {hash.update(`${rel}\0`).update(fs.readFileSync(path.join(root, rel))).update('\0');}
  for (const name of PACKAGES) {hash.update(`${name}@${devDependencies[name]}\0`);}
  return hash.digest('hex');
}
