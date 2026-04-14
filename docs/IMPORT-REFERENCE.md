# Import & normalization (technical reference)

Product rules and import workflow context live in **`docs/02-Application.md`** (e.g. **Media Management**, **Administration**) and **`docs/01-Vision-Architecture.md`** (**TECHNICAL**). This page summarizes **implementation-facing** details that are easy to miss elsewhere.

## Folder import in the app (`ImportFolderModal` / `importFolderAsCard`)

- **`ONEDRIVE_ROOT_FOLDER`** (`.env`) must point at the server-visible root of your image tree.
- Only files whose **basename** ends with **`__X`** immediately before the extension are imported, e.g. `IMG_0001__X.jpg`. Use **two underscores** and an **uppercase X** (`__X`), not `__x`.
- Images are **WebP-optimized in memory** and uploaded to **Firebase Storage**; the app **does not** write an `xNormalized` folder on disk during import.
- **`sourcePath`** on each `media` document still refers to the **original** file path (the `__X` file) for duplicate detection.
- **`IMPORT_FOLDER_MAX_IMAGES`** (default `60`) applies to the **count of `__X` files** per folder.
- Read paths (legacy still supported): images directly in a leaf folder, or under a child **`yEdited`** or **`xNormalized`** folder—**only `__X`-marked** files are read from that directory.

## Local CLI: `normalize-images` (`npm run normalize:images`)

- Writes **WebP + JSON** sidecars next to outputs in the **destination** folder (optional local pipeline; not required for app import if you rely on in-memory normalize only).
- Optional flag: **`--card-export-only`** — process only filenames that match the **`__X`** marker (same rule as the app).

```bash
npm run normalize:images "C:\path\to\source" "C:\path\to\out" -- --card-export-only
```

See **`normalize-images-README.md`** for full CLI behavior.

## Captions and metadata on import

- **Local / folder import** reads **embedded metadata only** via **`exiftool-vendored`** (no `.json` sidecars). Captions are taken from common IPTC/XMP/EXIF fields (e.g. `CaptionAbstract`, `Description`, `ImageDescription`, `UserComment`, `Headline`).
- **Keywords** from the same read (`Keywords`, `Subject`, `HierarchicalSubject`, etc.) are mapped to **Firestore tag IDs** by **exact tag name**, then **case-insensitive** fallback. Labels under **`cardseed|…` / `cardseed/…`** and top-level section roots (`WHO`, `WHAT`, …) are **ignored** for media tagging.
- **Card title** on folder import remains the **imported folder name** (path basename), not cardseed keywords.
- **`npm run normalize:images`** and JSON sidecars remain a **separate local pipeline** (backup, inspection); they are **not** read during app import.

## Cardseed (XMP keywords)

- **Not** the same as `src/lib/scripts/seedCards.ts` (that script wipes and seeds demo cards—avoid on production data).
- **Optional author workflow:** exiftool keywords such as `cardseed|…` / `cardseed/…` (see **`tools/_exif_args_tmp.txt`**) are **stripped before tag mapping** on import and are **not** required if you rely on the folder name for the card title.

## Related npm scripts

See **`docs/NPM-SCRIPTS.md`**. For media/card integrity after bulk work: `npm run reconcile:media-cards -- --diagnose`.

- **`npm run import:folder -- "<path>"`** — CLI smoke test for a single folder import (same behavior as admin folder import). Requires `.env` with `ONEDRIVE_ROOT_FOLDER` and Firebase Admin vars.
