/**
 * What belongs in the deployed site. Shared by the build (scripts/build.js)
 * and its check (scripts/check-site-build.js), so the two can never disagree
 * about which pages deploy.
 */
const { execFileSync } = require('child_process');

// What the live site serves: root site pages plus these directories and
// files. Anything else is not deployed: notably *.php (Pages would serve the
// source text), data/*.db, scripts/, js/ sources, sw.js (retired) and docs.
const SITE_DIRS = ['css', 'dist', 'images', 'public', 'downloads', 'showcase', 'data'];
// sitemap.xml is not here: the build generates it in _site/ (build-sitemap.js).
const SITE_FILES = ['favicon.ico', 'site.webmanifest', 'robots.txt'];

// Never public, wherever it sits: the build leaves these out and the check
// fails if one reaches _site/. robots.txt is the one .txt that deploys.
const isPrivate = (rel) => /\.(php|db|env|md)$/i.test(rel)
    || (/\.txt$/i.test(rel) && rel !== 'robots.txt')
    || /(^|\/)\./.test(rel); // dotfiles: the Pages artifact upload drops them anyway

// Root *.html files that are not site pages.
const NOT_PAGES = /^(test-.*|q4_update)\.html$/;

const isSitePage = (name) => name.endsWith('.html') && !NOT_PAGES.test(name);

// The root pages that deploy, given deployableFiles(root).
const sitePages = (root, deployable) => require('fs').readdirSync(root)
    .filter((f) => isSitePage(f) && deployable.has(f));

// Files git tracks, plus new files it would track (untracked and not
// ignored). New files count so that content added but not yet committed,
// such as a newsletter run's PDF and .ics files, is in the local build that
// bin/ci and the browser UAT check. Ignored files (local junk, .DS_Store,
// generated output) never are. CI checks out tracked files only, so there
// the two sets are the same.
function deployableFiles(root) {
    return new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
        .split('\0').filter(Boolean));
}

module.exports = { SITE_DIRS, SITE_FILES, NOT_PAGES, isSitePage, sitePages, isPrivate, deployableFiles };
