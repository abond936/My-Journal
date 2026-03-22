# Media-Card Reconciliation & Safeguards

This document describes how to diagnose and repair inconsistencies between cards and media, and how to keep data in sync.

## Problem Scenarios

| Scenario | Description | Example |
|----------|-------------|---------|
| **Card with empty gallery** | Card has `importedFromFolder` but `galleryMedia` is empty or missing | American Adventures: media exists in media admin, card shows no images |
| **Orphaned media** | Media docs exist but no card references them | Images uploaded but never linked to a card |
| **Orphaned references** | Card references `mediaId` that doesn't exist | coverImageId or galleryMedia points to deleted media |
| **Missing storage** | Media doc exists but file is missing from Firebase Storage | storagePath invalid or file deleted |

## Root Causes

- **Expiring storage URLs:** Signed URLs expire (7-day max); hydration refreshes them. Stale URLs in display are a client cache issue, not a data inconsistency.
- **Partial import failure:** Folder import created media but card creation/update failed or was interrupted.
- **Manual deletion:** Media or storage file deleted outside the app.
- **Cover revert bug:** (Fixed) Cover image reverting when saving tags—see cover fix in `cardUtils` and `cardService`.
- **Legacy migration:** Old data formats (e.g. galleryMedia with full objects) not fully migrated.

## Diagnostic Script

Run diagnostics to identify issues:

```bash
# Full diagnosis (all cards and media)
npm run reconcile:media-cards -- --diagnose

# Filter by card title
npm run reconcile:media-cards -- --diagnose --card="American Adventures"

# Include storage file existence check (slower)
npm run reconcile:media-cards -- --diagnose --check-storage
```

**Output:** Report of cards with empty galleries, orphaned media, orphaned references, and media with missing storage.

## Reconciliation (Fix) Script

Apply fixes after reviewing the diagnostic report:

```bash
# Dry run - show what would be fixed, no changes
npm run reconcile:media-cards -- --fix --dry-run

# Apply fixes
npm run reconcile:media-cards -- --fix
```

**What it fixes:**
1. **Re-link media to cards:** For cards with `importedFromFolder` but empty `galleryMedia`, finds media whose `sourcePath` matches the folder and repopulates the gallery. Sets cover to first image.
2. **Remove orphaned references:** Clears `coverImageId` and removes invalid `galleryMedia` items when the referenced media doc doesn't exist.

**What it does NOT fix:**
- Orphaned media (media not referenced)—use `cleanup:media` for status/activation.
- Content media in HTML—use `cleanup:media` for content HTML cleaning.
- Missing storage files—no automatic fix; investigate manually.

## Related Scripts

| Script | Purpose |
|--------|---------|
| `npm run reconcile:media-cards -- --diagnose` | Diagnose card-media inconsistencies |
| `npm run reconcile:media-cards -- --fix` | Re-link galleries, remove orphaned refs |
| `npm run cleanup:media` | Reset media status, validate refs, activate referenced media |
| `npm run diagnose:cover` | Diagnose cover image for a card by title |

## Recommended Safeguards

### 1. Periodic Reconciliation

Run diagnostics monthly or after bulk imports:

```bash
npm run reconcile:media-cards -- --diagnose
```

If issues are found, run fix with dry-run first, then apply.

### 2. Post-Import Verification

After folder import, verify the card has gallery images. If the card shows empty, run:

```bash
npm run reconcile:media-cards -- --diagnose --card="<card title>"
npm run reconcile:media-cards -- --fix --dry-run
npm run reconcile:media-cards -- --fix
```

### 3. Cleanup Media (Status & Orphans)

`cleanup:media` resets all media to temporary, then re-activates only media referenced by cards. Run when:

- Many orphaned media docs exist
- Media status is inconsistent

```bash
npm run cleanup:media -- --dry-run
npm run cleanup:media
```

### 4. Save Flow Safeguards (Already in Place)

- `dehydrateCardForSave` always includes `coverImageId` when present
- `updateCard` preserves existing `coverImageId` when `galleryMedia` is updated but `coverImageId` is omitted
- `CardFormProvider` explicitly preserves `coverImageId`/`coverImage` when merging `initialCard`

### 5. Avoid Manual Firestore Edits

Editing cards or media directly in the Firebase Console can introduce orphaned references. Prefer the app UI or scripts.

## Tests

Unit tests for reconciliation logic:

```bash
npm test -- reconcile-media-cards
```

Tests cover:
- `normalizePath` (path normalization)
- `mediaBelongsToCard` (matching media to card by sourcePath/importedFromFolder)
