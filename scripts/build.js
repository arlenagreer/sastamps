/**
 * Build the deployable site into _site/.
 *
 * The build never writes a tracked file. Generated assets go to the
 * untracked dist/ and css/*.min.css; the site itself is assembled in _site/
 * from an explicit allowlist, and _site/ is exactly what the Pages deploy
 * uploads (scripts/check-site-build.js verifies all of this).
 *
 * Before this, the build rewrote committed pages and dist/ in place, every
 * local build dirtied the checkout, and steps that appended instead of
 * replacing grew the main pages to 300-490 KB.
 */
const { spawn } = require('child_process');
const { constants } = require('fs');
const fs = require('fs').promises;
const path = require('path');
const { SITE_DIRS, SITE_FILES, sitePages, isPrivate, deployableFiles } = require('./lib/site');
const { STYLESHEETS } = require('./build-css');

const VERSION = '1.0.0';
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = path.join(ROOT, '_site');


async function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { stdio: 'inherit', cwd: ROOT });
        proc.on('close', code => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`${args.join(' ')} failed with code ${code}`));
            }
        });
    });
}

async function generateBuildInfo() {
    const buildInfo = {
        version: VERSION,
        buildDate: new Date().toISOString(),
        optimizations: [
            'Tree-shaking enabled with page-specific bundles',
            'JavaScript code splitting for optimal loading',
            'Stylesheets minified (css/*.min.css), loaded as plain links',
            'Images optimized and converted to WebP',
            'Font loading with system-font fallbacks (dist/js/font-loading.min.js)',
            'Site assembled in _site/; sources are never rewritten'
        ]
    };
    await fs.writeFile(path.join(DIST, 'build-info.json'), JSON.stringify(buildInfo, null, 2));
}

// Copy-on-write clone where the file system supports it (APFS, Btrfs, XFS),
// a plain copy elsewhere: public/ alone is several hundred MB of PDFs.
const CLONE = constants.COPYFILE_FICLONE;

function isGenerated(rel) {
    return rel === 'dist' || rel.startsWith('dist/') || STYLESHEETS.some((name) => rel === `css/${name}.min.css`);
}

async function assembleSite() {
    await fs.mkdir(SITE, { recursive: true });
    // Only files git tracks or would track are deployed (plus the build's own
    // output), so a local build never ships ignored local files.
    const deployable = deployableFiles(ROOT);
    const pages = sitePages(ROOT, deployable);
    for (const page of pages) {
        await fs.copyFile(path.join(ROOT, page), path.join(SITE, page), CLONE);
    }
    for (const dir of SITE_DIRS) {
        await fs.cp(path.join(ROOT, dir), path.join(SITE, dir), {
            recursive: true,
            mode: CLONE,
            filter: async (src) => {
                const rel = path.relative(ROOT, src).split(path.sep).join('/');
                if (isPrivate(rel)) return false;
                if (isGenerated(rel)) return true;
                if ((await fs.stat(src)).isDirectory()) return true;
                return deployable.has(rel);
            },
        });
    }
    for (const file of SITE_FILES) {
        await fs.copyFile(path.join(ROOT, file), path.join(SITE, file), CLONE);
    }
    console.log(`Assembled _site/: ${pages.length} pages, ${SITE_DIRS.join('/, ')}/`);
}

async function build() {
    try {
        console.log('\nStarting build process...\n');

        // Start clean, so nothing stale from an earlier build reaches _site/.
        // (A css/*.min.css whose stylesheet was dropped stays on disk but is
        // kept out: isGenerated names only the current STYLESHEETS, and
        // .gitignore keeps it out of deployableFiles.)
        for (const dir of [DIST, SITE]) {
            await fs.rm(dir, { recursive: true, force: true });
        }
        await fs.mkdir(path.join(DIST, 'js'), { recursive: true });

        console.log('1. Minifying CSS and bundling the font-loading script...');
        await runCommand('node', ['scripts/build-css.js']);

        console.log('\n2. Optimizing images...');
        await runCommand('node', ['scripts/optimize-images.js']);

        console.log('\n3. Building search index...');
        await runCommand('node', ['scripts/build-search-index.js']);

        console.log('\n4. Building JavaScript with tree shaking...');
        await runCommand('node', ['esbuild.config.js']);

        console.log('\n5. Running performance analysis...');
        await runCommand('node', ['scripts/analyze-image-savings.js']);

        console.log('\n6. Generating build info...');
        await generateBuildInfo();

        console.log('\n7. Assembling _site/...');
        await assembleSite();

        console.log('\nBuild completed successfully: _site/ is ready to deploy.');
    } catch (err) {
        console.error('\nBuild failed:', err.stack || err);
        process.exit(1);
    }
}

build();
