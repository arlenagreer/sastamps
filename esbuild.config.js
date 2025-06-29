/**
 * ESBuild Configuration with Tree Shaking Optimization
 * Automatically removes unused code and splits bundles by page
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Page-specific entry points for optimal tree shaking
const entryPoints = {
  // Core bundle - used on all pages
  'js/core.min.js': 'js/core-bundle.js',
  
  // Page-specific bundles
  'js/home.min.js': 'js/pages/home.js',
  'js/meetings.min.js': 'js/pages/meetings.js',
  'js/newsletter.min.js': 'js/pages/newsletter.js',
  'js/contact.min.js': 'js/pages/contact.js',
  'js/search.min.js': 'js/pages/search.js',
  'js/resources.min.js': 'js/pages/resources.js',
  'js/glossary.min.js': 'js/pages/glossary.js',
  
  // Modules bundle (for dynamic imports)
  'js/modules.min.js': 'js/modules/index.js'
};

// Shared configuration
const baseConfig = {
  bundle: true,
  minify: true,
  treeShaking: true,
  platform: 'browser',
  target: ['es2020'],
  format: 'iife',
  sourcemap: process.env.NODE_ENV === 'development',
  define: {
    'process.env.NODE_ENV': `"${process.env.NODE_ENV || 'production'}"`,
  },
  // Aggressive tree shaking
  ignoreAnnotations: false,
  keepNames: false,
  mangleProps: /^_/,
  // External dependencies for CDN loading
  external: ['vanilla-calendar-pro'],
  // Bundle analysis
  metafile: true,
};

// Build function with tree shaking analysis
async function buildWithTreeShaking() {
  const results = [];
  
  console.log('🌳 Starting tree-shaking optimized build...\n');
  
  // Ensure output directory exists
  await fs.promises.mkdir('dist/js', { recursive: true });
  
  // Build each entry point
  for (const [outfile, entryPoint] of Object.entries(entryPoints)) {
    console.log(`📦 Building: ${entryPoint} → dist/${outfile}`);
    
    try {
      const result = await esbuild.build({
        ...baseConfig,
        entryPoints: [entryPoint],
        outfile: `dist/${outfile}`,
        globalName: `SAPA_${path.basename(outfile, '.min.js').toUpperCase()}`,
      });
      
      results.push({ outfile, result });
      
      if (result.warnings.length > 0) {
        console.warn(`⚠️  Warnings for ${outfile}:`, result.warnings);
      }
      
    } catch (error) {
      console.error(`❌ Failed to build ${entryPoint}:`, error);
      throw error;
    }
  }
  
  // Generate bundle analysis
  await generateBundleAnalysis(results);
  
  console.log('\n✅ Tree-shaking build completed successfully!');
  return results;
}

// Generate detailed bundle analysis
async function generateBundleAnalysis(results) {
  const analysis = {
    buildDate: new Date().toISOString(),
    totalSize: 0,
    bundles: [],
    treeshakingStats: {
      modulesAnalyzed: 0,
      deadCodeEliminated: 0,
      bundleCount: results.length
    }
  };
  
  for (const { outfile, result } of results) {
    const filePath = `dist/${outfile}`;
    
    // Get file size
    let size = 0;
    try {
      const stats = await fs.promises.stat(filePath);
      size = stats.size;
      analysis.totalSize += size;
    } catch (error) {
      console.warn(`Could not get size for ${filePath}`);
    }
    
    // Extract metafile information if available
    let imports = [];
    let exports = [];
    if (result.metafile) {
      const outputs = result.metafile.outputs;
      const outputKey = Object.keys(outputs)[0];
      if (outputs[outputKey]) {
        imports = Object.keys(outputs[outputKey].imports || {});
        exports = outputs[outputKey].exports || [];
        analysis.treeshakingStats.modulesAnalyzed += imports.length;
      }
    }
    
    analysis.bundles.push({
      name: outfile,
      size,
      sizeFormatted: formatBytes(size),
      imports: imports.length,
      exports: exports.length,
      compressionRatio: size > 0 ? (size / (size * 1.3)).toFixed(2) : 'N/A'
    });
  }
  
  // Save analysis
  await fs.promises.writeFile(
    'dist/bundle-analysis.json',
    JSON.stringify(analysis, null, 2)
  );
  
  // Print summary
  console.log('\n📊 Bundle Analysis:');
  console.log(`Total size: ${formatBytes(analysis.totalSize)}`);
  console.log(`Bundles created: ${analysis.bundles.length}`);
  
  analysis.bundles.forEach(bundle => {
    console.log(`  ${bundle.name}: ${bundle.sizeFormatted} (${bundle.imports} imports)`);
  });
}

// Utility function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export for use in other scripts
module.exports = {
  buildWithTreeShaking,
  baseConfig,
  entryPoints
};

// Run if called directly
if (require.main === module) {
  buildWithTreeShaking().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}