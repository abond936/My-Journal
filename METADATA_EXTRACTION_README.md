# Image Metadata Extraction

This document explains how to use the metadata extraction scripts that extract metadata from image files and save it as JSON files. Used for pre-processing images before mass import.

## Files

### Scripts
- `extract-image-metadata-enhanced.js` - **Main script** – extracts EXIF/IPTC/XMP to JSON
- `test-libraries.js` - Verifies Sharp and exif-reader are installed

### Batch File
- `extract-metadata-improved.bat` - **Recommended launcher** – finds project, tests libraries, runs extraction

## Quick Start

### Option 1: Use the Improved Batch File (Recommended)

1. Place the batch file in a directory with your images
2. Double-click `extract-metadata-improved.bat`
3. Follow the prompts

### Option 2: Use the Script Directly

```bash
# From the project directory
node extract-image-metadata-enhanced.js "path/to/your/images"
```

### Option 3: Test Libraries First

```bash
# Test that all libraries are working
node test-libraries.js
```

## What It Does

The script will:

1. **Scan** the specified directory for image files
2. **Extract** metadata from each image:
   - Title, Subject, Tags, Comments
   - DateTime, Camera, Dimensions, FileSize
   - GPS coordinates (if available)
3. **Create** a JSON file for each image with:
   - Extracted metadata
   - Manual entry fields (Who, What, When, Where, Story)
   - Processing timestamp

## Supported Image Formats

- JPG/JPEG
- PNG
- GIF
- BMP
- TIFF/TIF
- WebP

## Requirements

- Node.js installed
- Sharp library: `npm install sharp`
- Exif-reader library: `npm install exif-reader` (optional, for better EXIF parsing)

## Output Format

Each JSON file will have this structure:

```json
{
  "filename": "image.jpg",
  "extracted": {
    "Title": "Extracted title",
    "Subject": "Extracted subject",
    "Tags": [],
    "Comments": "Extracted comments",
    "DateTime": "2023:01:01 12:00:00",
    "Camera": "Canon EOS 5D",
    "Dimensions": "1920x1080",
    "FileSize": 1234567
  },
  "manual": {
    "Who": "",
    "What": "",
    "When": "",
    "Where": "",
    "Story": ""
  },
  "processedAt": "2024-01-01T12:00:00.000Z"
}
```

## Troubleshooting

### Common Issues

1. **"Sharp library is not installed"**
   - Run: `npm install sharp`

2. **"No JSON files were created"**
   - Check that images are in supported formats
   - Verify write permissions in the directory
   - Run `node test-libraries.js` to verify Sharp/exif-reader work

3. **"Script execution failed"**
   - Check the console output for specific error messages
   - Verify all dependencies are installed

### Testing

Use the test script to verify everything is working:

```bash
node test-libraries.js
```

This will test:
- Sharp library functionality
- Exif-reader library (optional)
- File system operations
- Path operations

## Integration with app import (captions)

The journal app’s **`readMetadataCaption`** (see `src/lib/services/images/imageImportService.ts`) looks for a **sidecar JSON** next to each image file (same base name as the image), then falls back to embedded EXIF. That matches the JSON written by **`normalize-images`** / extraction scripts when files sit on the path under **`ONEDRIVE_ROOT_FOLDER`**.

- After editing metadata in **digiKam** or similar, **regenerate** sidecars if you rely on JSON rather than embedded fields.
- **Folder import** in admin only ingests files whose names end with **`__X`** before the extension (e.g. `photo__X.jpg`). Captions and keywords come from **embedded metadata** (ExifTool), not these JSON sidecars. See **`docs/IMPORT-REFERENCE.md`**.

## Next Steps

After extraction:

1. **Review** the generated JSON files
2. **Complete** the manual entry fields (Who, What, When, Where, Story)
3. **Use** the JSON files when uploading images to your system (or run **folder import** with `__X`-marked files and sidecars beside them)

## Related Scripts

- `create-photo-folders.bat` - Optional legacy layout (xNormalized, yEdited, zOriginals)
- `normalize-images.bat` / `normalize-images-README.md` - WebP + JSON sidecars; optional `--card-export-only` for `__X`-marked files only
- `docs/IMPORT-REFERENCE.md` - `__X` marker, in-memory app import, cardseed vs `seedCards.ts`