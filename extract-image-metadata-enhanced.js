#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const METADATA_FIELDS = {
  extractFromImage: ['Title', 'Subject', 'Tags', 'Comments'],
  manualEntry: ['Who', 'What', 'When', 'Where', 'Story'],
};

function parseExif(exifBuffer) {
  try {
    const ExifReader = require('exif-reader');
    const exif = ExifReader(exifBuffer);

    return {
      title: exif?.ImageDescription?.description || '',
      subject: exif?.ImageDescription?.description || '',
      tags: [],
      userComment: exif?.Exif?.UserComment?.description || '',
      dateTime: exif?.Exif?.DateTimeOriginal?.description || '',
      gpsLatitude: exif?.GPS?.GPSLatitude?.description || '',
      gpsLongitude: exif?.GPS?.GPSLongitude?.description || '',
    };
  } catch (error) {
    console.warn('Warning: Could not parse EXIF data:', error.message);
    return {};
  }
}

function parseIptc() {
  try {
    return {};
  } catch (error) {
    console.warn('Warning: Could not parse IPTC data:', error.message);
    return {};
  }
}

async function extractImageMetadata(imagePath) {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    const exif = metadata.exif ? parseExif(metadata.exif) : {};
    const iptc = metadata.iptc ? parseIptc(metadata.iptc) : {};

    const make = metadata.exif?.Make?.description || '';
    const model = metadata.exif?.Model?.description || '';
    const camera = [make, model].filter(Boolean).join(' ').trim();

    return {
      Title: iptc.title || exif.title || metadata.exif?.ImageDescription?.description || '',
      Subject: iptc.subject || exif.subject || metadata.exif?.ImageDescription?.description || '',
      Tags: iptc.keywords || exif.tags || [],
      Comments: exif.userComment || iptc.userComment || metadata.exif?.UserComment?.description || '',
      DateTime: exif.dateTime || metadata.exif?.DateTimeOriginal?.description || '',
      GPSLatitude: exif.gpsLatitude || metadata.exif?.GPSLatitude?.description || '',
      GPSLongitude: exif.gpsLongitude || metadata.exif?.GPSLongitude?.description || '',
      Camera: camera,
      Dimensions: `${metadata.width || 0}x${metadata.height || 0}`,
      FileSize: metadata.size || 0,
    };
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
      FileSize: 0,
    };
  }
}

function createManualEntryTemplate() {
  const template = {};
  METADATA_FIELDS.manualEntry.forEach((field) => {
    template[field] = '';
  });
  return template;
}

async function processImage(imagePath) {
  try {
    console.log(`Processing: ${path.basename(imagePath)}`);

    const extractedMetadata = await extractImageMetadata(imagePath);
    const manualEntry = createManualEntryTemplate();

    const metadata = {
      filename: path.basename(imagePath),
      extracted: extractedMetadata,
      manual: manualEntry,
      processedAt: new Date().toISOString(),
    };

    const jsonFilename = `${path.basename(imagePath, path.extname(imagePath))}.json`;
    const jsonPath = path.join(path.dirname(imagePath), jsonFilename);
    await fs.writeFile(jsonPath, JSON.stringify(metadata, null, 2));

    console.log(`  Metadata saved to: ${jsonPath}`);
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

async function extractMetadataFromDirectory(directoryPath) {
  try {
    console.log(`Extracting metadata from directory: ${directoryPath}`);
    console.log('');

    const files = await fs.readdir(directoryPath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'];
    const imageFiles = files.filter((file) => imageExtensions.includes(path.extname(file).toLowerCase()));

    console.log(`Found ${imageFiles.length} image files to process`);
    console.log('');

    if (imageFiles.length === 0) {
      console.log('No image files found in directory');
      return;
    }

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

      console.log('');
    }

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

  if (!fsSync.existsSync(directoryPath)) {
    console.error(`Error: Directory '${directoryPath}' does not exist`);
    process.exit(1);
  }

  try {
    require('sharp');
  } catch {
    console.error('Error: Sharp library is not installed');
    console.log('Please install it with: npm install sharp');
    process.exit(1);
  }

  try {
    require('exif-reader');
    console.log('Exif-reader library found - enhanced EXIF parsing enabled');
  } catch {
    console.log('Exif-reader library not found - using basic EXIF parsing');
    console.log('  Install with: npm install exif-reader (optional)');
  }

  console.log('');
  extractMetadataFromDirectory(directoryPath);
}

main();
