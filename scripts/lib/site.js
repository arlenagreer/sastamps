/**
 * What belongs in the deployed site. Shared by the build (scripts/build.js)
 * and its check (scripts/check-site-build.js), so the two can never disagree
 * about which pages deploy.
 */
const { execFileSync } = require('child_process');

// Root *.html files that are not site pages.
const NOT_PAGES = /^(test-.*|q4_update)\.html$/;

const isSitePage = (name) => name.endsWith('.html') && !NOT_PAGES.test(name);

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

module.exports = { NOT_PAGES, isSitePage, deployableFiles };
