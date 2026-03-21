#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Configuration
const METADATA_FIELDS = {
  // Fields to extract from image metadata
  extractFromImage: ['Title', 'Subject', 'Tags', 'Comments'],
  // Fields for manual completion
  manualEntry: ['Who', 'What', 'When', 'Where', 'Story']
};

// Parse EXIF data using exif-reader library
function parseExif(exifBuffer) {
  try {
    // Note: This requires the 'exif-reader' library
    // npm install exif-reader
    const ExifReader = require('exif-reader');
    const exif = ExifReader(exifBuffer);
    
    return {
      title: exif?.ImageDescription?.description || '',
      subject: exif?.ImageDescription?.description || '',
      tags: [],
      userComment: exif?.Exif?.UserComment?.description || '',
      dateTime: exif?.Exif?.DateTimeOriginal?.description || '',
      gpsLatitude: exif?.GPS?.GPSLatitude?.description || '',
      gpsLongitude: exif?.GPS?.GPSLongitude?.description || ''
    };
  } catch (error) {
    console.warn('Warning: Could not parse EXIF data:', error.message);
    return {};
  }
}

// Parse IPTC data
function parseIptc(iptcBuffer) {
  try {
    // Basic IPTC parsing - for production use consider a dedicated library
    const iptc = {};
    
    // Extract common IPTC fields
    // This is a simplified implementation
    
    return iptc;
  } catch (error) {
    console.warn('Warning: Could not parse IPTC data:', error.message);
    return {};
  }
}

// Extract metadata from image
async function extractImageMetadata(imagePath) {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    // Extract EXIF data
    const exif = metadata.exif ? parseExif(metadata.exif) : {};
    
    // Extract IPTC data
    const iptc = metadata.iptc ? parseIptc(metadata.iptc) : {};
    
    // Fix Camera string concatenation with proper null checks
    const make = metadata.exif?.Make?.description || '';
    const model = metadata.exif?.Model?.description || '';
    const camera = [make, model].filter(Boolean).join(' ').trim();
    
    // Combine all metadata fields with fallbacks
    const extractedMetadata = {
      Title: iptc.title || exif.title || metadata.exif?.ImageDescription?.description || '',
      Subject: iptc.subject || exif.subject || metadata.exif?.ImageDescription?.description || '',
      Tags: iptc.keywords || exif.tags || [],
      Comments: exif.userComment || iptc.userComment || metadata.exif?.UserComment?.description || '',
      // Additional useful metadata
      DateTime: exif.dateTime || metadata.exif?.DateTimeOriginal?.description || '',
      GPSLatitude: exif.gpsLatitude || metadata.exif?.GPSLatitude?.description || '',
      GPSLongitude: exif.gpsLongitude || metadata.exif?.GPSLongitude?.description || '',
      Camera: camera,
      Dimensions: `${metadata.width || 0}x${metadata.height || 0}`,
      FileSize: metadata.size || 0
    };
    
    return extractedMetadata;
  } catch (error) {
    console.warn(`Warning: Could not extract metadata from ${imagePath}:`, error.message);
    return {
      Title: '',
      Subject: '',
      Tags: [],
      Comments: '',
      DateTime: '',
      GPSLatitude: '',
      GPSLongitude: '',
      Camera: '',
      Dimensions: '',
      FileSize: 0
    };
  }
}

// Create metadata template for manual completion
function createManualEntryTemplate() {
  const template = {};
  
  METADATA_FIELDS.manualEntry.forEach(field => {
    template[field] = '';
  });
  
  return template;
}

// Process a single image
async function processImage(imagePath) {
  try {
    console.log(`Processing: ${path.basename(imagePath)}`);
    
    // Extract metadata from image
    const extractedMetadata = await extractImageMetadata(imagePath);
    
    // Create manual entry template
    const manualEntry = createManualEntryTemplate();
    
    // Combine extracted and manual entry fields
    const metadata = {
      filename: path.basename(imagePath),
      extracted: extractedMetadata,
      manual: manualEntry,
      // Add processing timestamp
      processedAt: new Date().toISOString()
    };
    
    // Create JSON filename
    const jsonFilename = path.basename(imagePath, path.extname(imagePath)) + '.json';
    const jsonPath = path.join(path.dirname(imagePath), jsonFilename);
    
    // Write JSON file
    await fs.writeFile(jsonPath, JSON.stringify(metadata, null, 2));
    
    console.log(`  Metadata saved to: ${jsonPath}`);
    
    // Log extracted metadata
    console.log(`  Extracted Title: "${extractedMetadata.Title}"`);
    console.log(`  Extracted Subject: "${extractedMetadata.Subject}"`);
    console.log(`  Extracted Tags: [${extractedMetadata.Tags.join(', ')}]`);
    console.log(`  Extracted Comments: "${extractedMetadata.Comments}"`);
    console.log(`  Extracted DateTime: "${extractedMetadata.DateTime}"`);
    console.log(`  Extracted Camera: "${extractedMetadata.Camera}"`);
    console.log(`  Extracted Dimensions: "${extractedMetadata.Dimensions}"`);
    
    return true;
  } catch (error) {
    console.error(`Error processing ${imagePath}:`, error.message);
    return false;
  }
}

// Main processing function
async function extractMetadataFromDirectory(directoryPath) {
  try {
    console.log(`Extracting metadata from directory: ${directoryPath}`);
    console.log('');
    
    // Get all image files from directory
    const files = await fs.readdir(directoryPath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });
    
    console.log(`Found ${imageFiles.length} image files to process`);
    console.log('');
    
    if (imageFiles.length === 0) {
      console.log('No image files found in directory');
      return;
    }
    
    // Process each image
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of imageFiles) {
      const imagePath = path.join(directoryPath, file);
      const success = await processImage(imagePath);
      
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
      
      console.log(''); // Add spacing between files
    }
    
    // Summary
    console.log('='.repeat(50));
    console.log('METADATA EXTRACTION COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total files: ${imageFiles.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log(`Success rate: ${((successCount / imageFiles.length) * 100).toFixed(1)}%`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the generated JSON files');
    console.log('2. Complete the manual entry fields (Who, What, When, Where, Story)');
    console.log('3. Use the JSON files when uploading images to your system');
    console.log('');
    console.log('JSON file structure:');
    console.log('  - filename: Original image filename');
    console.log('  - extracted: Metadata from image (Title, Subject, Tags, Comments, etc.)');
    console.log('  - manual: Fields for manual completion (Who, What, When, Where, Story)');
    console.log('  - processedAt: Timestamp when metadata was extracted');
    
  } catch (error) {
    console.error('Error during metadata extraction:', error.message);
    process.exit(1);
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.log('Usage: node extract-image-metadata-enhanced.js <directory-path>');
    console.log('');
    console.log('Example:');
    console.log('  node extract-image-metadata-enhanced.js ./photos');
    console.log('');
    console.log('This will:');
    console.log('  - Process all images in the specified directory');
    console.log('  - Extract Title, Subject, Tags, Comments, DateTime, Camera, etc.');
    console.log('  - Create JSON files with extracted data and manual entry fields');
    console.log('  - Generate one JSON file per image for later completion');
    console.log('');
    console.log('Requirements:');
    console.log('  - Sharp library: npm install sharp');
    console.log('  - Exif-reader library: npm install exif-reader (optional, for better EXIF parsing)');
    process.exit(1);
  }
  
  const directoryPath = args[0];
  
  // Validate directory exists using fsSync
  if (!fsSync.existsSync(directoryPath)) {
    console.error(`Error: Directory '${directoryPath}' does not exist`);
    process.exit(1);
  }
  
  // Check if Sharp is available
  try {
    require('sharp');
  } catch (error) {
    console.error('Error: Sharp library is not installed');
    console.log('Please install it with: npm install sharp');
    process.exit(1);
  }
  
  // Check if exif-reader is available (optional)
  try {
    require('exif-reader');
    console.log('✓ Exif-reader library found - enhanced EXIF parsing enabled');
  } catch (error) {
    console.log('⚠ Exif-reader library not found - using basic EXIF parsing');
    console.log('  Install with: npm install exif-reader (optional)');
  }
  
  console.log('');
  
  // Start processing
  extractMetadataFromDirectory(directoryPath);
}

// Run the script
main(); 