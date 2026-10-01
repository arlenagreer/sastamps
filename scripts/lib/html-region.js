/**
 * Idempotent writes into committed HTML.
 *
 * The build rewrites the committed root pages in place, and the Pages deploy
 * builds from them, so every generated insert must REPLACE its previous copy.
 * Appending instead stacked one more copy per build (see
 * scripts/check-build-idempotent.js). Each generated block lives between
 * `<!-- build:NAME -->` and `<!-- /build:NAME -->` and is replaced in place.
 */

function regionPattern(name) {
  return new RegExp(`<!-- build:${name} -->[\\s\\S]*?<!-- /build:${name} -->`);
}

function renderRegion(name, block) {
  // Generated lines carry no trailing whitespace, so the committed pages pass
  // `npm run test:html` and fix-html-validation.js has nothing to change.
  const body = block.split('\n').map((line) => line.trimEnd()).join('\n');
  return `<!-- build:${name} -->${body}\n    <!-- /build:${name} -->`;
}

/**
 * Replace region NAME with BLOCK, or, when the page has no such region yet,
 * insert it in place of the first match of ANCHOR (a RegExp) or immediately
 * before ANCHOR (a string). Throws when neither exists, so a page that lost
 * its anchor fails the build instead of silently shipping without the block.
 */
function upsertRegion(html, name, block, anchor, filename) {
  const opens = html.split(`<!-- build:${name} -->`).length - 1;
  const closes = html.split(`<!-- /build:${name} -->`).length - 1;
  const misordered = opens === 1 && html.indexOf(`<!-- /build:${name} -->`) < html.indexOf(`<!-- build:${name} -->`);
  if (opens !== closes || opens > 1 || misordered) {
    // A half-deleted or duplicated region would otherwise be nested or
    // stacked silently; make the build fail instead.
    throw new Error(`${filename}: build:${name} markers are broken (${opens} open, ${closes} close${misordered ? ', close before open' : ''})`);
  }
  const region = renderRegion(name, block);
  const existing = regionPattern(name);
  if (existing.test(html)) {
    return html.replace(existing, () => region);
  }
  if (anchor instanceof RegExp) {
    if (!anchor.test(html)) {
      throw new Error(`${filename}: no build:${name} region and no anchor ${anchor}`);
    }
    return html.replace(anchor, () => region);
  }
  if (!html.includes(anchor)) {
    throw new Error(`${filename}: no build:${name} region and no anchor ${anchor}`);
  }
  return html.replace(anchor, () => `    ${region}\n${anchor}`);
}

module.exports = { upsertRegion };
