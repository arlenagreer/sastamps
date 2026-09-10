const fs = require('fs').promises;

const htmlFiles = [
    'index.html',
    'about.html',
    'contact.html',
    'meetings.html',
    'membership.html',
    'newsletter.html'
];

const fontConfig = {
    'Open Sans': {
        weights: [400, 600, 700],
        display: 'swap'
    },
    'Merriweather': {
        weights: [400, 700],
        display: 'swap'
    }
};

async function generateFontPreloadTags() {
    // Font preload tags removed — Google Fonts uses versioned, hashed URLs
    // that cannot be predicted. The fonts load correctly via the CSS link.
    return '';
}

async function generateFontFaceObserver() {
    return `
    <script>
        // Font Face Observer script
        (function() {
            class FontFaceObserver {
                constructor(family, options = {}) {
                    this.family = family;
                    this.options = options;
                }
                
                async load() {
                    try {
                        await document.fonts.load(\`1em \${this.family}\`, this.options.text || 'BESbswy');
                        return true;
                    } catch (e) {
                        return false;
                    }
                }
            }

            // Load fonts and mark as loaded
            async function loadFonts() {
                document.documentElement.classList.add('fonts-loading');
                
                const fontLoaders = [
                    ${Object.entries(fontConfig).map(([family, config]) => 
                        config.weights.map(weight => 
                            `new FontFaceObserver('${family}', { weight: ${weight} }).load()`
                        ).join(',\n                    ')
                    ).join(',\n                    ')}
                ];

                try {
                    await Promise.all(fontLoaders);
                    document.documentElement.classList.remove('fonts-loading');
                    document.documentElement.classList.add('fonts-loaded');
                    localStorage.setItem('fonts-loaded', 'true');
                } catch (err) {
                    document.documentElement.classList.remove('fonts-loading');
                    document.documentElement.classList.add('fonts-failed');
                }
            }

            // Check if fonts were previously loaded
            if (localStorage.getItem('fonts-loaded')) {
                document.documentElement.classList.add('fonts-loaded');
            } else {
                loadFonts();
            }
        })();
    </script>`;
}

async function generateFontStyles() {
    return `
    <style>
        /* Font loading states */
        .fonts-loading body {
            opacity: 0.8;
        }
        
        .fonts-loaded body {
            opacity: 1;
            transition: opacity 0.3s ease;
        }

        /* Font fallbacks */
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        
        .fonts-loaded body {
            font-family: 'Open Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        h1, h2, h3, h4, h5, h6 {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, serif;
        }
        
        .fonts-loaded h1, 
        .fonts-loaded h2, 
        .fonts-loaded h3, 
        .fonts-loaded h4, 
        .fonts-loaded h5, 
        .fonts-loaded h6 {
            font-family: 'Merriweather', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, serif;
        }
    </style>`;
}

async function updateHTMLWithFontOptimizations(filename) {
    console.log(`Processing ${filename}...`);
    let content = await fs.readFile(filename, 'utf8');

    const preloadTags = await generateFontPreloadTags();
    const fontStyles = await generateFontStyles();
    const fontObserver = await generateFontFaceObserver();

    // Add font preload tags
    // NOTE: no literal leading "    " prefix here -- fontStyles/fontObserver
    // below are template literals that already open with their own leading
    // newline + indentation (see generateFontStyles():85, generateFontFaceObserver():31).
    // A bare four-space prefix in front of that leading newline produced a
    // blank line containing ONLY four trailing spaces, which is exactly the
    // no-trailing-whitespace defect `npm run test:html` caught (18 errors,
    // 3 per file, across these six root-level HTML files). These six files
    // are this script's generated output -- test:html is what keeps them
    // clean on every re-run of this script, not a one-time hand edit.
    content = content.replace('</head>', `${preloadTags}\n</head>`);

    // Add font styles
    content = content.replace('</head>', `${fontStyles}\n</head>`);

    // Add font observer script
    content = content.replace('</body>', `${fontObserver}\n</body>`);

    // Update Google Fonts link to include display=swap
    content = content.replace(
        /(https:\/\/fonts\.googleapis\.com\/css2\?[^"']+)/g,
        '$1&display=swap'
    );

    await fs.writeFile(filename, content, 'utf8');
    console.log(`Updated ${filename}`);
}

async function optimizeFonts() {
    try {
        await Promise.all(htmlFiles.map(updateHTMLWithFontOptimizations));
        console.log('Font optimization complete!');
    } catch (err) {
        console.error('Error optimizing fonts:', err);
        process.exit(1);
    }
}

optimizeFonts(); 