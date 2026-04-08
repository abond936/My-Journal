# Image Normalization Script

This script processes images from a **source** folder, optimizes them, and writes **WebP** plus **JSON metadata** files to a **destination** folder. Implementation: `src/lib/scripts/normalize-images.ts`.

**App import note:** When you use **Import folder as card** in the admin UI, the server **does not** require this script for basic import—it reads `__X`-marked files, optimizes **in memory**, and uploads to Firebase. Use this CLI when you still want **local** WebP + JSON artifacts (e.g. backup, inspection, or captions before upload).

## Usage

### Option 1: Batch file

`normalize-images.bat` lives in the **project root**. Run from the folder that contains your **source** subfolder (often your album directory):

```batch
normalize-images.bat yEdited xNormalized
```

Or explicit folders:

```batch
normalize-images.bat "My Photos" "Optimized Photos"
```

Optional third argument — only files with the **`__X`** export marker (same as app import):

```batch
normalize-images.bat "My Photos" "Optimized Photos" --card-export-only
```

### Option 2: npm script

From the **project root**:

```bash
npm run normalize:images <source-folder> <destination-folder>
```

Optional: **`--card-export-only`** (must appear **after** `--` so npm forwards it):

```bash
npm run normalize:images "C:\path\to\source" "C:\path\to\out" -- --card-export-only
```

### `__X` marker (card export only mode)

Filenames must end with **`__X`** immediately before the extension—e.g. `vacation-01__X.jpg`. Two underscores, **uppercase X**. With `--card-export-only`, all other images in the source folder are skipped.

## What it does

1. **Scans** the source folder for images (jpg, jpeg, png, gif, bmp, tiff, tif, webp)—optionally restricted to `__X` files.
2. **Extracts metadata** (EXIF, IPTC, XMP) per file.
3. **Auto-detects** characteristics (orientation, low-light heuristics, noise heuristics).
4. **Applies** an optimization preset and **converts to WebP**.
5. **Writes** optimized images and **JSON** sidecars into the destination folder.

## Output

For each input `photo.jpg`:

- `photo.webp` — optimized WebP  
- `photo.json` — extracted metadata (used by the app’s caption reader when present next to the source file; see `readMetadataCaption` in `imageImportService.ts`)

## Features

- Auto-detection presets: landscape, portrait, low-light, noise reduction  
- Max dimension cap (1920×1080, fit inside)  
- **`--card-export-only`** aligns with **folder import** rules in the app (`docs/IMPORT-REFERENCE.md`)

## Requirements

- Node.js  
- Sharp (project dependency)

## Related

- **`docs/IMPORT-REFERENCE.md`** — `__X` rule, env vars, cardseed vs `seedCards.ts`  
- **`docs/Project.md`** — product workflow, `IMPORT_FOLDER_MAX_IMAGES`, digiKam pipeline  
- **`docs/NPM-SCRIPTS.md`** — script index  
- **`METADATA_EXTRACTION_README.md`** — metadata-only extraction (no WebP)  
- **`create-photo-folders.bat`** — optional z/y/x layout (legacy); many workflows now use a **single folder** + `__X` naming  
