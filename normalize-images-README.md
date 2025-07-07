# Image Normalization Script

This script processes images from a source folder, optimizes them, and saves them to a destination folder with extracted metadata.

## Features

- **Auto-detection**: Automatically detects image characteristics and applies appropriate optimization presets
- **Metadata extraction**: Extracts EXIF, IPTC, and XMP metadata including:
  - Date/time
  - GPS coordinates (latitude, longitude, altitude)
  - Description, user comments, title, subject
  - Tags and keywords
- **Optimization presets**:
  - **Landscape**: Enhanced sharpening, slight saturation boost
  - **Portrait**: Gentle sharpening, subtle color adjustments
  - **Low-light**: Brightness boost, noise reduction, adjusted contrast
  - **Noise reduction**: Aggressive noise reduction for noisy images
- **Format conversion**: Converts all images to WebP format for better compression
- **Size optimization**: Resizes large images to reasonable dimensions (max 1920x1080)
- **Metadata preservation**: Saves extracted metadata as JSON files alongside images

## Usage

```bash
node normalize-images.js <source-folder> <destination-folder>
```

### Example

```bash
# Process images from yEdited folder to xNormalized folder
node normalize-images.js yEdited xNormalized
```

## What it does

1. **Scans source folder** for image files (jpg, jpeg, png, gif, bmp, tiff, tif, webp)
2. **Extracts metadata** from each image
3. **Auto-detects characteristics**:
   - Orientation (landscape/portrait)
   - Low-light conditions (high ISO, slow shutter, wide aperture)
   - Noise levels (based on file size vs dimensions)
4. **Applies optimization preset** based on detected characteristics
5. **Converts to WebP** with quality settings
6. **Saves optimized image** to destination folder
7. **Saves metadata** as JSON file with same name

## Output

For each input image `photo.jpg`, you'll get:
- `photo.webp` - Optimized WebP image
- `photo.json` - Extracted metadata

## Configuration

The script includes configurable settings in the `CONFIG` object:

- **Metadata fields** to extract
- **Optimization presets** with sharpening, color, and noise reduction settings
- **Default settings** for format, quality, max dimensions, etc.

## Requirements

- Node.js
- Sharp library (already installed in this project)

## Example Output

```
Processing: DSC_001.jpg
  Detected preset: landscape
  Original size: 8.45 MB
  Dimensions: 4000x3000
  dateTime: 2023:10:15 14:30:22
  gpsLatitude: 40.7128
  gpsLongitude: -74.0060
  Optimized size: 1.23 MB
  Compression: 85.4% reduction
  Saved to: xNormalized/DSC_001.webp
  Metadata saved to: xNormalized/DSC_001.json

==================================================
PROCESSING COMPLETE
==================================================
Total files: 25
Successful: 25
Failed: 0
Success rate: 100.0%
```

## Notes

- The script creates the destination folder if it doesn't exist
- All images are converted to WebP format for optimal compression
- Metadata is stripped from the final images but saved separately as JSON
- The script handles errors gracefully and continues processing other images
- Auto-detection uses heuristics based on EXIF data and file characteristics 