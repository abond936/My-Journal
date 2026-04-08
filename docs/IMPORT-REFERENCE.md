# Import & normalization (technical reference)

Product rules, backlog, and digiKam workflow live in **`docs/Project.md`** (Authoring pipeline, Media Management, TECHNICAL → Import Folder as Card). This page summarizes **implementation-facing** details that are easy to miss elsewhere.

## Folder import in the app (`ImportFolderModal` / `importFolderAsCard`)

- **`ONEDRIVE_ROOT_FOLDER`** (`.env`) must point at the server-visible root of your image tree.
- Only files whose **basename** ends with **`__X`** immediately before the extension are imported, e.g. `IMG_0001__X.jpg`. Use **two underscores** and an **uppercase X** (`__X`), not `__x`.
- Images are **WebP-optimized in memory** and uploaded to **Firebase Storage**; the app **does not** write an `xNormalized` folder on disk during import.
- **`sourcePath`** on each `media` document still refers to the **original** file path (the `__X` file) for duplicate detection and caption sidecars.
- **`IMPORT_FOLDER_MAX_IMAGES`** (default `50`) applies to the **count of `__X` files** per folder.
- Read paths (legacy still supported): images directly in a leaf folder, or under a child **`yEdited`** or **`xNormalized`** folder—**only `__X`-marked** files are read from that directory.

## Local CLI: `normalize-images` (`npm run normalize:images`)

- Writes **WebP + JSON** sidecars next to outputs in the **destination** folder (optional local pipeline; not required for app import if you rely on in-memory normalize only).
- Optional flag: **`--card-export-only`** — process only filenames that match the **`__X`** marker (same rule as the app).

```bash
npm run normalize:images "C:\path\to\source" "C:\path\to\out" -- --card-export-only
```

See **`normalize-images-README.md`** for full CLI behavior.

## Captions and metadata on import

- **`readMetadataCaption`** (`imageImportService`) prefers a **`.json` sidecar** next to the image (from `normalize-images` or `extract-image-metadata-enhanced.js`), then embedded EXIF. Regenerate sidecars after changing metadata in external tools if the app should pick up new captions.

## Cardseed (XMP keywords)

- **Not** the same as `src/lib/scripts/seedCards.ts` (that script wipes and seeds demo cards—avoid on production data).
- **Cardseed** in your workflow is typically **exiftool** keywords such as `cardseed|…` / `cardseed/…` written into files; see **`tools/_exif_args_tmp.txt`** for an example. Re-run your batch after folder/tag renames.

## Related npm scripts

See **`docs/NPM-SCRIPTS.md`**. For media/card integrity after bulk work: `npm run reconcile:media-cards -- --diagnose`.
