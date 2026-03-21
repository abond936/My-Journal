# Image Normalization Script

This script processes images from a source folder, optimizes them, and saves them to a destination folder with extracted metadata. The implementation lives in `src/lib/scripts/normalize-images.ts`.

## Usage

### Option 1: Batch file (recommended when working in a photo folder)

Place `normalize-images.bat` in your project root. Run from your album folder (the folder containing `yEdited` and `xNormalized`):

```batch
normalize-images.bat yEdited xNormalized
```

Or with explicit paths:
```batch
normalize-images.bat "My Photos" "Optimized Photos"
```

### Option 2: npm script

From the project directory:

```bash
npm run normalize:images <source-folder> <destination-folder>
```

### Example

```bash
# From project directory with full paths
npm run normalize:images "C:\path\to\yEdited" "C:\path\to\xNormalized"

# From folder containing yEdited/xNormalized subfolders (using batch file)
normalize-images.bat yEdited xNormalized
```

## What it does

1. **Scans source folder** for image files (jpg, jpeg, png, gif, bmp, tiff, tif, webp)
2. **Extracts metadata** from each image (EXIF, IPTC, XMP)
3. **Auto-detects characteristics**:
   - Orientation (landscape/portrait)
   - Low-light conditions (high ISO, slow shutter, wide aperture)
   - Noise levels (based on file size vs dimensions)
4. **Applies optimization preset** based on detected characteristics
5. **Converts to WebP** with quality settings
6. **Saves optimized image** to destination folder
7. **Saves metadata** as JSON file alongside each image

## Output

For each input image `photo.jpg`, you'll get:
- `photo.webp` - Optimized WebP image
- `photo.json` - Extracted metadata

## Features

- **Auto-detection**: Automatically detects image characteristics and applies appropriate optimization presets
- **Metadata extraction**: Date/time, GPS, description, comments, title, subject, tags
- **Optimization presets**: Landscape, portrait, low-light, noise reduction
- **Format conversion**: All images converted to WebP for better compression
- **Size optimization**: Resizes large images (max 1920x1080)

## Requirements

- Node.js
- Sharp library (already installed in this project)

## Related

- `create-photo-folders.bat` - Creates xNormalized, yEdited, zOriginals folder structure
- `extract-metadata-improved.bat` - Extract metadata only (no optimization); see METADATA_EXTRACTION_README.md
