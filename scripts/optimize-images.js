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

async function generatePlaceholder(inputPath, outputPath) {
    // Generate a tiny placeholder (20px wide)
    const placeholder = await sharp(inputPath)
        .resize(20, null, { withoutEnlargement: true })
        .blur(10) // Add slight blur for smoother upscaling
        .webp({ quality: 20 })
        .toBuffer();

    // Convert to base64
    const base64Placeholder = placeholder.toString('base64');
    return `data:image/webp;base64,${base64Placeholder}`;
}

async function optimizeImage(inputPath, filename) {
    const name = path.parse(filename).name;
    
    // Ensure output directories exist
    await Promise.all([
        ensureDir(outputDir),
        ...Object.keys(sizes).map(size => ensureDir(path.join(outputDir, size)))
    ]);

    // Generate placeholder and save to JSON
    const placeholder = await generatePlaceholder(inputPath, path.join(outputDir, `${name}-placeholder.webp`));
    const placeholdersPath = path.join(outputDir, 'placeholders.json');
    let placeholders = {};
    try {
        const existing = await fs.readFile(placeholdersPath, 'utf8');
        placeholders = JSON.parse(existing);
    } catch (err) {
        // File doesn't exist yet, that's fine
    }
    placeholders[name] = placeholder;
    await fs.writeFile(placeholdersPath, JSON.stringify(placeholders, null, 2));

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