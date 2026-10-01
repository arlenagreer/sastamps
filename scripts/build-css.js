#!/usr/bin/env node
/**
 * Minify the site stylesheets and bundle the font-loading script.
 *
 * - css/{styles,critical,font-loading}.css -> css/*.min.css, next to their
 *   sources, so relative url(../images/...) paths resolve to the same files
 *   as the sources do. No --bundle (it fails on the PNG url()s). The browser
 *   target keeps the output readable by older Safari/Chrome: with no target
 *   esbuild assumes the newest syntax and collapses top/right/bottom/left
 *   into `inset`, which Safari < 14.1 ignores (the hero overlays vanish).
 * - js/font-loading.js -> dist/js/font-loading.min.js, a self-contained IIFE
 *   loaded as a plain <script> in <head> (see the file for why).
 *
 * Usage: node scripts/build-css.js
 */
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const STYLESHEETS = ['styles', 'critical', 'font-loading'];
const TARGET = ['chrome80', 'firefox78', 'safari13', 'edge80'];

const builds = [
    ...STYLESHEETS.map((name) => ({
        entryPoints: [path.join(ROOT, 'css', `${name}.css`)],
        outfile: path.join(ROOT, 'css', `${name}.min.css`),
        minify: true,
        target: TARGET,
        logLevel: 'warning',
    })),
    {
        entryPoints: [path.join(ROOT, 'js/font-loading.js')],
        outfile: path.join(ROOT, 'dist/js/font-loading.min.js'),
        bundle: true,
        format: 'iife',
        minify: true,
        target: TARGET,
        logLevel: 'warning',
    },
];

async function main() {
    for (const options of builds) {
        await esbuild.build(options);
        console.log(`Built ${path.relative(ROOT, options.outfile)}`);
    }
}

// Compile one output in memory with exactly the build's options (used by the
// checks so they test the bytes that ship, without writing anything).
function compile(options) {
    const { outfile, ...inMemory } = options;
    return esbuild.buildSync({ ...inMemory, write: false, logLevel: 'silent' }).outputFiles[0].text;
}

module.exports = { builds, STYLESHEETS, compile };

if (require.main === module) {
    main().catch((err) => {
        console.error('CSS build failed:', err.message);
        process.exit(1);
    });
}
