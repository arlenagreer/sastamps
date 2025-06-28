const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

async function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        console.log(`Running: ${command} ${args.join(' ')}`);
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

async function buildJavaScript() {
    try {
        console.log('Building JavaScript with Lunr.js...');

        // Build main script bundle
        await runCommand('npx', [
            'esbuild',
            'js/script.js',
            '--bundle',
            '--minify',
            '--format=iife',
            '--global-name=SAPA',
            '--outfile=dist/js/script.min.js',
            '--external:lunr'
        ]);

        // Build search module separately with Lunr
        await runCommand('npx', [
            'esbuild',
            'js/modules/search-engine.js',
            '--bundle',
            '--minify',
            '--format=iife',
            '--global-name=SAPASearch', 
            '--outfile=dist/js/search.min.js'
        ]);

        // Build data modules bundle
        await runCommand('npx', [
            'esbuild',
            'js/modules/data-loader.js',
            'js/modules/template-engine.js',
            'js/modules/pagination.js',
            '--bundle',
            '--minify',
            '--format=esm',
            '--outfile=dist/js/modules.min.js'
        ]);

        console.log('✅ JavaScript build completed successfully');

    } catch (error) {
        console.error('❌ JavaScript build failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    buildJavaScript().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { buildJavaScript };