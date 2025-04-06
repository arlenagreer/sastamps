const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

async function getFileSize(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return stats.size;
    } catch (err) {
        return 0;
    }
}

async function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function analyzeImage(filename) {
    const originalPath = path.join('images', filename);
    const webpPath = path.join('dist/images', path.parse(filename).name + '.webp');
    const originalSize = await getFileSize(originalPath);
    const webpSize = await getFileSize(webpPath);
    const savings = originalSize - webpSize;
    const savingsPercent = ((savings / originalSize) * 100).toFixed(2);

    return {
        filename,
        originalSize: await formatBytes(originalSize),
        webpSize: await formatBytes(webpSize),
        savings: await formatBytes(savings),
        savingsPercent: savingsPercent
    };
}

async function generateReport() {
    try {
        const files = await fs.readdir('images');
        const pngFiles = files.filter(file => file.toLowerCase().endsWith('.png'));
        
        console.log('\nImage Optimization Report\n' + '='.repeat(50));
        console.log('\nAnalyzing', pngFiles.length, 'images...\n');

        let totalOriginalSize = 0;
        let totalOptimizedSize = 0;

        for (const file of pngFiles) {
            const originalPath = path.join('images', file);
            const webpPath = path.join('dist/images', path.parse(file).name + '.webp');
            
            const originalSize = await getFileSize(originalPath);
            const webpSize = await getFileSize(webpPath);
            
            totalOriginalSize += originalSize;
            totalOptimizedSize += webpSize;

            const result = await analyzeImage(file);
            console.log(`${result.filename}:`);
            console.log(`  Original: ${result.originalSize}`);
            console.log(`  Optimized (WebP): ${result.webpSize}`);
            console.log(`  Savings: ${result.savings} (${result.savingsPercent}%)\n`);
        }

        const totalSavings = totalOriginalSize - totalOptimizedSize;
        const totalSavingsPercent = ((totalSavings / totalOriginalSize) * 100).toFixed(2);

        console.log('='.repeat(50));
        console.log('\nTotal Savings:');
        console.log(`Original Size: ${await formatBytes(totalOriginalSize)}`);
        console.log(`Optimized Size: ${await formatBytes(totalOptimizedSize)}`);
        console.log(`Total Savings: ${await formatBytes(totalSavings)} (${totalSavingsPercent}%)`);

    } catch (err) {
        console.error('Error generating report:', err);
        process.exit(1);
    }
}

generateReport(); 