const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const VERSION = '1.0.0';
const BUILD_DIR = 'dist';

async function ensureDir(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

async function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { stdio: 'inherit' });
        proc.on('close', code => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });
    });
}

async function generateBuildInfo() {
    const buildInfo = {
        version: VERSION,
        buildDate: new Date().toISOString(),
        optimizations: [
            'Critical CSS inlined',
            'Images optimized and converted to WebP',
            'Fonts optimized with preload and fallbacks',
            'Service worker configured',
            'Assets minified',
            'Performance monitoring with Google Analytics'
        ]
    };

    await fs.writeFile(
        path.join(BUILD_DIR, 'build-info.json'),
        JSON.stringify(buildInfo, null, 2)
    );
}

async function build() {
    try {
        console.log('\nStarting build process...\n');

        // Ensure build directory exists
        await ensureDir(BUILD_DIR);
        await ensureDir(path.join(BUILD_DIR, 'css'));
        await ensureDir(path.join(BUILD_DIR, 'js'));
        await ensureDir(path.join(BUILD_DIR, 'images'));

        console.log('1. Optimizing CSS...');
        await runCommand('node', ['scripts/extract-critical-css.js']);

        console.log('\n2. Optimizing images...');
        await runCommand('node', ['scripts/optimize-images.js']);
        await runCommand('node', ['scripts/update-image-tags.js']);

        console.log('\n3. Optimizing fonts...');
        await runCommand('node', ['scripts/optimize-fonts.js']);

        console.log('\n4. Building search index...');
        await runCommand('node', ['scripts/build-search-index.js']);

        console.log('\n5. Embedding search data...');
        await runCommand('node', ['scripts/build-search-embedded.js']);

        console.log('\n6. Building JavaScript...');
        await runCommand('npm', ['run', 'build:js']);

        console.log('\n7. Setting up monitoring...');
        await runCommand('node', ['scripts/setup-monitoring.js']);

        console.log('\n8. Running performance analysis...');
        await runCommand('node', ['scripts/analyze-image-savings.js']);

        console.log('\n9. Generating build info...');
        await generateBuildInfo();

        console.log('\nBuild completed successfully! 🎉');
        console.log('\nOptimizations applied:');
        console.log('- Critical CSS extraction and inlining');
        console.log('- Image optimization and WebP conversion');
        console.log('- Font optimization and preloading');
        console.log('- Full-text search with Lunr.js');
        console.log('- Embedded search data for offline functionality');
        console.log('- Service worker configuration');
        console.log('- Asset minification');
        console.log('- Performance monitoring with Google Analytics');
        
        console.log('\nNext steps:');
        console.log('1. Set up Google Analytics:');
        console.log('   - Go to https://analytics.google.com/');
        console.log('   - Create a new property if needed');
        console.log('   - Go to Admin > Data Streams > Web');
        console.log('   - Create a stream for your GitHub Pages site');
        console.log('   - Copy the Measurement ID (G-XXXXXXXXXX)');
        console.log('   - Replace MEASUREMENT_ID in your HTML files');
        console.log('2. Test the site in different browsers');
        console.log('3. Verify offline functionality');
        console.log('4. Check Core Web Vitals in Google Analytics');

    } catch (err) {
        console.error('\nBuild failed:', err);
        process.exit(1);
    }
}

// Add build script to package.json scripts
async function updatePackageJson() {
    const packageJsonPath = 'package.json';
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    packageJson.scripts = {
        ...packageJson.scripts,
        "build": "node scripts/build.js",
        "start": "npm run serve",
        "serve": "http-server . -p 3000",
        "analyze": "node scripts/analyze-image-savings.js"
    };

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

// Run the build
updatePackageJson().then(build); 