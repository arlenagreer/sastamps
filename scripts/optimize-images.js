const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const inputDir = 'images';
const outputDir = 'dist/images';
const sizes = {
    sm: 400,
    md: 800,
    lg: 1200
};

async function ensureDir(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

async function optimizeImage(inputPath, filename) {
    const name = path.parse(filename).name;
    
    // Ensure output directories exist
    await Promise.all([
        ensureDir(outputDir),
        ...Object.keys(sizes).map(size => ensureDir(path.join(outputDir, size)))
    ]);

    // No blur-up placeholders: their only reader (update-image-tags.js, which
    // rewrote committed pages) is retired, and writing one shared
    // placeholders.json from parallel image jobs raced into invalid JSON.

    // Create WebP versions in different sizes
    await Promise.all(Object.entries(sizes).map(async ([size, width]) => {
        await sharp(inputPath)
            .resize(width, null, { withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(path.join(outputDir, size, `${name}.webp`));
    }));

    // Create optimized PNG as fallback
    await sharp(inputPath)
        .png({ quality: 80 })
        .toFile(path.join(outputDir, `${name}.png`));

    // Create WebP version as fallback
    await sharp(inputPath)
        .webp({ quality: 80 })
        .toFile(path.join(outputDir, `${name}.webp`));
}

async function processImages() {
    try {
        const files = await fs.readdir(inputDir);
        const pngFiles = files.filter(file => file.toLowerCase().endsWith('.png'));
        
        console.log(`Found ${pngFiles.length} PNG files to process...`);
        
        await Promise.all(pngFiles.map(async file => {
            const inputPath = path.join(inputDir, file);
            console.log(`Processing ${file}...`);
            await optimizeImage(inputPath, file);
        }));
        
        console.log('Image optimization complete!');
    } catch (err) {
        console.error('Error processing images:', err);
        process.exit(1);
    }
}

processImages(); 