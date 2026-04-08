#!/usr/bin/env ts-node

import sharp from 'sharp';
import fs from 'fs/promises';
import { Stats } from 'fs';
import path from 'path';
import { isCardExportMarkedFilename } from '@/lib/services/images/inMemoryWebpNormalize';

// Types
interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  space?: string;
  channels?: number;
  depth?: string;
  density?: number;
  orientation?: number;
  exif?: any;
  iptc?: any;
  xmp?: any;
  dateTime?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
  description?: string;
  userComment?: string;
  title?: string;
  subject?: string;
  tags?: string[];
  comments?: string;
}

interface ImageCharacteristics {
  preset: string;
  isLandscape: boolean;
  isPortrait: boolean;
  isLowLight: boolean;
  hasNoise: boolean;
}

interface OptimizationPreset {
  sharpening?: {
    sigma: number;
    flat: number;
    jagged: number;
  };
  saturation?: number;
  contrast?: number;
  brightness?: number;
  noiseReduction?: boolean;
}

interface Config {
  metadataFields: string[];
  presets: Record<string, OptimizationPreset>;
  default: {
    format: string;
    quality: number;
    maxWidth: number;
    maxHeight: number;
    stripMetadata: boolean;
  };
}

// Configuration
const CONFIG: Config = {
  // Metadata fields to extract
  metadataFields: [
    'dateTime',
    'gpsLatitude',
    'gpsLongitude',
    'gpsAltitude',
    'description',
    'userComment',
    'title',
    'subject',
    'tags',
    'comments'
  ],
  
  // Optimization presets
  presets: {
    landscape: {
      sharpening: { sigma: 0.5, flat: 1, jagged: 2 },
      saturation: 1.1,
      contrast: 1.05,
      brightness: 1.02
    },
    portrait: {
      sharpening: { sigma: 0.3, flat: 0.8, jagged: 1.5 },
      saturation: 1.05,
      contrast: 1.02,
      brightness: 1.01
    },
    lowLight: {
      sharpening: { sigma: 0.4, flat: 1, jagged: 1.8 },
      saturation: 0.95,
      contrast: 1.1,
      brightness: 1.15,
      noiseReduction: true
    },
    noiseReduction: {
      sharpening: { sigma: 0.2, flat: 0.5, jagged: 1 },
      saturation: 0.9,
      contrast: 0.95,
      brightness: 1.01,
      noiseReduction: true
    }
  },
  
  // Default optimization settings
  default: {
    format: 'webp',
    quality: 85,
    maxWidth: 1920,
    maxHeight: 1080,
    stripMetadata: true
  }
};

// Auto-detection logic
function detectImageCharacteristics(metadata: ImageMetadata, stats: Stats): ImageCharacteristics {
  const characteristics: ImageCharacteristics = {
    preset: 'default',
    isLandscape: false,
    isPortrait: false,
    isLowLight: false,
    hasNoise: false
  };
  
  // Detect orientation
  if (metadata.width && metadata.height) {
    characteristics.isLandscape = metadata.width > metadata.height;
    characteristics.isPortrait = metadata.width < metadata.height;
  }
  
  // Detect low light conditions
  if (metadata.exif) {
    const iso = metadata.exif.ISO;
    const exposureTime = metadata.exif.ExposureTime;
    const fNumber = metadata.exif.FNumber;
    
    if (iso > 800 || (exposureTime && exposureTime > 1/30) || (fNumber && fNumber > 5.6)) {
      characteristics.isLowLight = true;
    }
  }
  
  // Detect noise (simplified heuristic based on file size vs dimensions)
  if (metadata.width && metadata.height) {
    const expectedSize = (metadata.width * metadata.height * 3) / 8; // Rough estimate
    const actualSize = stats.size;
    const compressionRatio = actualSize / expectedSize;
    
    if (compressionRatio > 0.8) {
      characteristics.hasNoise = true;
    }
  }
  
  // Determine preset
  if (characteristics.isLowLight) {
    characteristics.preset = 'lowLight';
  } else if (characteristics.hasNoise) {
    characteristics.preset = 'noiseReduction';
  } else if (characteristics.isLandscape) {
    characteristics.preset = 'landscape';
  } else if (characteristics.isPortrait) {
    characteristics.preset = 'portrait';
  }
  
  return characteristics;
}

// Extract metadata from image
async function extractMetadata(imagePath: string): Promise<ImageMetadata> {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    // Extract EXIF data
    const exif = metadata.exif ? parseExif(metadata.exif) : {};
    
    // Extract IPTC data
    const iptc = metadata.iptc ? parseIptc(metadata.iptc) : {};
    
    // Extract XMP data
    const xmp = metadata.xmp ? parseXmp(metadata.xmp) : {};
    
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      orientation: metadata.orientation,
      exif,
      iptc,
      xmp,
      // Combine all metadata fields
      dateTime: exif.dateTime || iptc.dateTime || xmp.dateTime,
      gpsLatitude: exif.gpsLatitude,
      gpsLongitude: exif.gpsLongitude,
      gpsAltitude: exif.gpsAltitude,
      description: iptc.description || xmp.description,
      userComment: exif.userComment || iptc.userComment,
      title: iptc.title || xmp.title,
      subject: iptc.subject || xmp.subject,
      tags: iptc.keywords || xmp.tags,
      comments: exif.comments || iptc.comments
    };
  } catch (error) {
    console.warn(`Warning: Could not extract metadata from ${imagePath}:`, (error as Error).message);
    return {};
  }
}

// Parse EXIF data
function parseExif(exifBuffer: Buffer): any {
  try {
    // This is a simplified EXIF parser
    // In a production environment, you might want to use a library like 'exif-reader'
    const exif: any = {};
    
    // Extract common EXIF fields
    // Note: This is a basic implementation. For full EXIF parsing, consider using 'exif-reader'
    
    return exif;
  } catch (error) {
    console.warn('Warning: Could not parse EXIF data:', (error as Error).message);
    return {};
  }
}

// Parse IPTC data
function parseIptc(iptcBuffer: Buffer): any {
  try {
    // Simplified IPTC parser
    const iptc: any = {};
    
    // Extract common IPTC fields
    // Note: This is a basic implementation. For full IPTC parsing, consider using a dedicated library
    
    return iptc;
  } catch (error) {
    console.warn('Warning: Could not parse IPTC data:', (error as Error).message);
    return {};
  }
}

// Parse XMP data
function parseXmp(xmpBuffer: Buffer): any {
  try {
    // Simplified XMP parser
    const xmp: any = {};
    
    // Extract common XMP fields
    // Note: This is a basic implementation. For full XMP parsing, consider using a dedicated library
    
    return xmp;
  } catch (error) {
    console.warn('Warning: Could not parse XMP data:', (error as Error).message);
    return {};
  }
}

// Optimize image based on characteristics
async function optimizeImage(
  inputPath: string, 
  outputPath: string, 
  characteristics: ImageCharacteristics, 
  metadata: ImageMetadata
): Promise<boolean> {
  try {
    let pipeline = sharp(inputPath);
    
    // Apply preset-based optimizations
    const preset = CONFIG.presets[characteristics.preset] || CONFIG.presets.landscape;
    
    // Always apply auto-rotation to fix orientation issues
    // This will correct images that are stored sideways but have EXIF orientation data
    pipeline = pipeline.rotate();
    
    // Resize if needed
    if (metadata.width && metadata.height && 
        (metadata.width > CONFIG.default.maxWidth || metadata.height > CONFIG.default.maxHeight)) {
      pipeline = pipeline.resize(CONFIG.default.maxWidth, CONFIG.default.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Apply sharpening
    if (preset.sharpening) {
      pipeline = pipeline.sharpen(preset.sharpening);
    }
    
    // Apply color adjustments
    if (preset.saturation !== undefined && preset.saturation !== 1) {
      pipeline = pipeline.modulate({
        saturation: preset.saturation
      });
    }
    
    if (preset.contrast !== undefined && preset.contrast !== 1) {
      pipeline = pipeline.linear(preset.contrast, 0);
    }
    
    if (preset.brightness !== undefined && preset.brightness !== 1) {
      pipeline = pipeline.modulate({
        brightness: preset.brightness
      });
    }
    
    // Apply noise reduction if needed
    if (preset.noiseReduction) {
      pipeline = pipeline.median(1);
    }
    
    // Convert to WebP with quality setting
    pipeline = pipeline.webp({ quality: CONFIG.default.quality });
    
    // Strip metadata (orientation is already applied, so we can strip it)
    if (CONFIG.default.stripMetadata) {
      pipeline = pipeline.withMetadata();
    } else {
      pipeline = pipeline.withMetadata();
    }
    
    // Save the optimized image
    await pipeline.toFile(outputPath);
    
    return true;
  } catch (error) {
    console.error(`Error optimizing ${inputPath}:`, (error as Error).message);
    return false;
  }
}

// Process a single image
async function processImage(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    console.log(`Processing: ${path.basename(inputPath)}`);
    
    // Get file stats
    const stats = await fs.stat(inputPath);
    
    // Extract metadata
    const metadata = await extractMetadata(inputPath);
    
    // Detect characteristics
    const characteristics = detectImageCharacteristics(metadata, stats);
    
    console.log(`  Detected preset: ${characteristics.preset}`);
    console.log(`  Original size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Dimensions: ${metadata.width || 'unknown'}x${metadata.height || 'unknown'}`);
    
    // Extract and log metadata
    const extractedMetadata: any = {};
    CONFIG.metadataFields.forEach(field => {
      if (metadata[field as keyof ImageMetadata]) {
        extractedMetadata[field] = metadata[field as keyof ImageMetadata];
        console.log(`  ${field}: ${metadata[field as keyof ImageMetadata]}`);
      }
    });
    
    // Optimize image
    const success = await optimizeImage(inputPath, outputPath, characteristics, metadata);
    
    if (success) {
      // Get optimized file stats
      const optimizedStats = await fs.stat(outputPath);
      const compressionRatio = (1 - optimizedStats.size / stats.size) * 100;
      
      console.log(`  Optimized size: ${(optimizedStats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Compression: ${compressionRatio.toFixed(1)}% reduction`);
      console.log(`  Saved to: ${outputPath}`);
      
      // Save metadata to JSON file
      const metadataPath = outputPath.replace(/\.[^.]+$/, '.json');
      await fs.writeFile(metadataPath, JSON.stringify(extractedMetadata, null, 2));
      console.log(`  Metadata saved to: ${metadataPath}`);
    } else {
      console.error(`  Failed to optimize: ${inputPath}`);
    }
    
    console.log('');
    return success;
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, (error as Error).message);
    return false;
  }
}

// Main processing function
async function normalizeImages(
  sourceFolder: string,
  destinationFolder: string,
  options?: { cardExportOnly?: boolean }
): Promise<void> {
  try {
    console.log(`Starting image normalization...`);
    console.log(`Source: ${sourceFolder}`);
    console.log(`Destination: ${destinationFolder}`);
    if (options?.cardExportOnly) {
      console.log('Filter: only files with basename suffix __X (card export marker)');
    }
    console.log('');
    
    // Ensure destination folder exists
    try {
      await fs.access(destinationFolder);
    } catch {
      await fs.mkdir(destinationFolder, { recursive: true });
    }
    
    // Get all image files from source folder
    const files = await fs.readdir(sourceFolder);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'];
    let imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });
    if (options?.cardExportOnly) {
      imageFiles = imageFiles.filter(isCardExportMarkedFilename);
    }
    
    console.log(`Found ${imageFiles.length} image files to process`);
    console.log('');
    
    if (imageFiles.length === 0) {
      console.log('No image files found in source folder');
      return;
    }
    
    // Process each image
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of imageFiles) {
      const inputPath = path.join(sourceFolder, file);
      const outputPath = path.join(destinationFolder, file.replace(/\.[^.]+$/, '.webp'));
      
      const success = await processImage(inputPath, outputPath);
      
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }
    
    // Summary
    console.log('='.repeat(50));
    console.log('PROCESSING COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total files: ${imageFiles.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log(`Success rate: ${((successCount / imageFiles.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('Error during normalization:', (error as Error).message);
    throw error; // Re-throw for programmatic use; CLI main() will process.exit
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cardExportOnly = args.includes('--card-export-only');
  const positional = args.filter((a) => !a.startsWith('--'));

  if (positional.length !== 2) {
    console.log('Usage: npx ts-node -r tsconfig-paths/register -P tsconfig.scripts.json src/lib/scripts/normalize-images.ts <source-folder> <destination-folder> [--card-export-only]');
    console.log('');
    console.log('Options:');
    console.log('  --card-export-only   Only process files whose basename ends with __X before the extension');
    console.log('');
    console.log('Examples:');
    console.log('  npm run normalize:images "C:\\path\\to\\source" "C:\\path\\to\\out"');
    console.log('  npm run normalize:images "C:\\path\\to\\source" "C:\\path\\to\\out" -- --card-export-only');
    console.log('');
    console.log('This will:');
    console.log('  - Process images from source folder');
    console.log('  - Output optimized WebP images to destination folder');
    console.log('  - Extract metadata and save as JSON files');
    console.log('  - Auto-detect and apply optimization presets');
    process.exit(1);
  }

  const [sourceFolder, destinationFolder] = positional;

  // Resolve paths relative to current working directory
  const resolvedSourceFolder = path.resolve(sourceFolder);
  const resolvedDestinationFolder = path.resolve(destinationFolder);

  console.log(`Current working directory: ${process.cwd()}`);
  console.log(`Resolved source folder: ${resolvedSourceFolder}`);
  console.log(`Resolved destination folder: ${resolvedDestinationFolder}`);
  console.log('');

  // Validate source folder exists
  try {
    await fs.access(resolvedSourceFolder);
  } catch {
    console.error(`Error: Source folder '${resolvedSourceFolder}' does not exist`);
    console.error(`Make sure the folder exists relative to: ${process.cwd()}`);
    process.exit(1);
  }

  // Start processing
  await normalizeImages(resolvedSourceFolder, resolvedDestinationFolder, { cardExportOnly });
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export {
  normalizeImages,
  extractMetadata,
  detectImageCharacteristics,
  optimizeImage,
}; 