# Image Lifecycle & Architecture

This document describes how images flow through the application, from storage to display. Use it as the reference before mass import or architectural changes.

## Overview

```
[Source] → [Import] → [Firebase Storage + Firestore] → [API Hydration] → [Client Display]
```

## 1. Source & Import

**Entry points:**
- `imageImportService.ts` – central import (PhotoPicker paste/drop, local drive)
- Creates Media doc in Firestore, uploads file to Firebase Storage
- Uses signed URLs (long expiry) for `storageUrl`

**Media schema** (`src/lib/types/photo.ts`):
- `docId`, `filename`, `width`, `height`, `storageUrl`, `storagePath`
- `source`: 'local' | 'paste'
- `status`: 'temporary' | 'active'

## 2. Storage

- **Firebase Storage:** `images/{docId}-{filename}`
- **Firestore `media` collection:** One doc per image with metadata
- **Canonical URL:** `storageUrl` (v4 signed, 7-day max). Fresh URLs are injected during card hydration—stored URLs are not used for display.

## 3. Card References

Cards reference media by ID only (no embedded URLs):

- `coverImageId` → cover image
- `galleryMedia[]` → `{ mediaId, caption, order, objectPosition }`
- `contentMedia[]` → media IDs from rich-text content

## 4. API Hydration

**Two modes** (see `cardService.ts`):

| Mode | Hydrates | Use case |
|------|----------|----------|
| `full` | coverImage, galleryMedia[].media, contentMedia | Content feed, search, card detail |
| `cover-only` | coverImage only | Admin list (thumbnails) |

**Rule:** Use `full` for views that show galleries or content images; use `cover-only` for admin lists.

**Bug (fixed):** CardProvider used `cover-only` for admin on all paths. Content feed at `/view` needs `full` for gallery cards. Fix: path-based hydration (`/view`, `/search` → full; `/admin/card-admin` → cover-only).

## 5. Client Display

**Components:**
- `JournalImage` – wrapper around `next/image` with `unoptimized` (avoids 403 from Firebase)
- `getDisplayUrl(photo)` – returns `storageUrl` → `url` → transparent pixel fallback

**Cover image aspect ratios:**
| Context | Ratio | Notes |
|---------|-------|-------|
| Edit preview (CoverPhotoContainer) | 4:3 | Matches view; user sets focal point here |
| View page (CardDetailPage) | 4:3 | Same framing as edit preview |
| Feed (V2ContentCard) | 1:1 | Thumbnail crop |

**Focal point:** Stored as pixel coords `{x, y}` in original image space. Default: center (50% 50%). Converted to `object-position` per target aspect ratio via `getObjectPositionForAspectRatio`.

**Display paths:**
- `V2ContentCard` – main feed (story, gallery, etc.)
- `CardDetailPage` – card detail view
- `CoverPhotoContainer` – admin cover picker (4:3 preview)
- `GalleryManager` – admin gallery
- `MediaAdminRow` – media admin thumbnails

## 6. Pre-Import Scripts (Local Filesystem)

For preparing images before import:

- `create-photo-folders.bat` – creates xNormalized, yEdited, zOriginals
- `normalize-images.bat` → `npm run normalize:images` – optimizes, extracts metadata to JSON
- `extract-metadata-improved.bat` → `extract-image-metadata-enhanced.js` – metadata only

See `METADATA_EXTRACTION_README.md` and `normalize-images-README.md`.

## 7. Checklist for Mass Import

Before building mass import:

- [ ] Media schema is stable; all Media docs have `storageUrl`
- [ ] Hydration is correct for each view (full vs cover-only)
- [ ] `getDisplayUrl` handles missing/invalid URLs (transparent pixel)
- [ ] Local/API image paths (e.g. `/api/images/local/file`) work if used
- [ ] Existing media backfill: `npm run backfill:media-metadata`

## 8. Media-Card Reconciliation

When cards and media get out of sync (e.g. card with empty gallery but media exists), use the reconciliation scripts. See **[MediaCardReconciliation.md](./MediaCardReconciliation.md)** for diagnostics, fixes, and safeguards.

## 9. Known Gaps

- **Legacy media:** Older docs may use `url` instead of `storageUrl`; `getDisplayUrl` falls back
- **Signed URL:** v4, 7-day max. Injected fresh during card hydration (server-side); no regeneration script needed.
- **Content images:** Hydrated via `hydrateContentImageSrc`; TipTap content uses media IDs in HTML
