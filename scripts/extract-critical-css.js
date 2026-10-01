const fs = require('fs').promises;
const { upsertRegion } = require('./lib/html-region');

const htmlFiles = require('./lib/pages');

// The first stylesheet reference to the full CSS, used only on a page's first
// build. After that the page carries a build:critical-css region (which holds
// the stylesheet link itself) and the region is replaced in place.
const STYLESHEET_LINK = /<link[^>]*href=["']dist\/css\/styles\.min\.css["'][^>]*>/;

// css/critical.css is the hand-maintained above-the-fold stylesheet: balanced,
// and the only file that defines the :root custom properties the rest of the
// CSS uses. It replaces an earlier split-on-'}' extract of the full stylesheet,
// which left 26 @media blocks unclosed, defined no variables, and copied the
// stylesheet's trailing inline source map (~110 KB) into every page.
async function readCriticalCSS() {
    const css = await fs.readFile('css/critical.css', 'utf8');
    // Comments carry nothing the browser needs, and a sourceMappingURL comment
    // must never be inlined. (Naive: fine while critical.css has no '/*' inside
    // a string or url(); the brace check below catches a damaged result.)
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n(\s*\n)+/g, '\n').trim();
    const outsideStrings = stripped.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
    const open = (outsideStrings.match(/{/g) || []).length;
    const close = (outsideStrings.match(/}/g) || []).length;
    if (open !== close) {
        throw new Error(`css/critical.css: unbalanced braces after stripping comments (${open} open, ${close} close)`);
    }
    if (/<\/style/i.test(stripped)) {
        throw new Error('css/critical.css contains "</style", which would end the inline <style> early');
    }
    return stripped;
}

// critical.css is inlined (it defines the :root variables everything else
// uses), and the full stylesheet is a normal render-blocking link: the page's
// first paint is fully styled, as it was when the stylesheet was inlined.
function renderPage(filename, content, criticalCSS) {
    const refs = (content.match(/dist\/css\/styles\.min\.css/g) || []).length;
    if (!content.includes('<!-- build:critical-css -->') && refs !== 1) {
        // A page still on an old pattern (preload + noscript, possibly more
        // copies) has no single safe insertion point; the first match could
        // even sit inside <noscript>. Fail rather than guess.
        throw new Error(`${filename}: first build needs exactly one reference to dist/css/styles.min.css, found ${refs}`);
    }
    if (!content.includes('<!-- build:critical-css -->') && /<noscript>[^<]*<link[^>]*dist\/css\/styles\.min\.css/.test(content)) {
        throw new Error(`${filename}: the only stylesheet reference is inside <noscript>; not a safe insertion point`);
    }
    const block = `
    <style id="critical-css">
${criticalCSS}
    </style>
    <link rel="stylesheet" href="dist/css/styles.min.css">`;
    return upsertRegion(content, 'critical-css', block, STYLESHEET_LINK, filename);
}

async function optimizeCSS() {
    try {
        const criticalCSS = await readCriticalCSS();
        // Render every page before writing any, so a failure on one page never
        // leaves the others half-updated.
        const pages = await Promise.all(htmlFiles.map(async (file) => {
            console.log(`Processing ${file}...`);
            return [file, renderPage(file, await fs.readFile(file, 'utf8'), criticalCSS)];
        }));
        for (const [file, html] of pages) {
            await fs.writeFile(file, html, 'utf8');
            console.log(`Updated ${file}`);
        }

        console.log('Critical CSS optimization complete!');
    } catch (err) {
        console.error('Error optimizing CSS:', err);
        process.exit(1);
    }
}

optimizeCSS();
