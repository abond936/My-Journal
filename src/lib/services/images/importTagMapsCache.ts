import { getAllTags } from '@/lib/firebase/tagService';
import { buildTagNameLookupMaps } from '@/lib/services/images/embeddedMetadataForImport';
import type { ImportTagNameMaps } from '@/lib/services/images/imageImportService';

const TTL_MS = 120_000;

let cache: { maps: ImportTagNameMaps; expiresAt: number } | null = null;

/** For tests or admin flows that must see tag renames immediately after a tag edit. */
export function clearImportTagNameMapsCache(): void {
  cache = null;
}

/**
 * One Firestore `getAllTags` + map build per TTL window — matches `importFolderAsCard` batch behavior
 * and avoids O(images × full tag catalog) on `/api/images/local/import`.
 */
export async function getCachedTagNameMaps(): Promise<ImportTagNameMaps> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.maps;
  }
  const maps = buildTagNameLookupMaps(await getAllTags());
  cache = { maps, expiresAt: now + TTL_MS };
  return maps;
}
