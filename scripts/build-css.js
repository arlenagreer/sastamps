#!/usr/bin/env node
/**
 * Minify the site stylesheets and bundle the font-loading script.
 *
 * - css/{styles,critical,font-loading}.css -> css/*.min.css, next to their
 *   sources, so relative url(../images/...) paths resolve to the same files
 *   as the sources do. No --bundle (it fails on the PNG url()s) and no
 *   browser target (it would rewrite the range media queries).
 * - js/font-loading.js -> dist/js/font-loading.min.js, a self-contained IIFE
 *   loaded as a plain <script> in <head> (see the file for why).
 *
 * Usage: node scripts/build-css.js [--watch]
 */
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const STYLESHEETS = ['styles', 'critical', 'font-loading'];

const builds = [
    ...STYLESHEETS.map((name) => ({
        entryPoints: [path.join(ROOT, 'css', `${name}.css`)],
        outfile: path.join(ROOT, 'css', `${name}.min.css`),
        minify: true,
        logLevel: 'warning',
    })),
    {
        entryPoints: [path.join(ROOT, 'js/font-loading.js')],
        outfile: path.join(ROOT, 'dist/js/font-loading.min.js'),
        bundle: true,
        format: 'iife',
        minify: true,
        logLevel: 'warning',
    },
];

async function main() {
    if (process.argv.includes('--watch')) {
        for (const options of builds) {
            const ctx = await esbuild.context(options);
            await ctx.watch();
        }
        console.log('Watching css/*.css and js/font-loading.js...');
        return;
    }
    for (const options of builds) {
        await esbuild.build(options);
        console.log(`Built ${path.relative(ROOT, options.outfile)}`);
    }
}

main().catch((err) => {
    console.error('CSS build failed:', err.message);
    process.exit(1);
});
