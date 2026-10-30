import { createHash } from 'node:crypto';
import type { Card } from '@/lib/types/card';
import type { CollectionMigrationPreview } from '@/lib/utils/collectionPlacementMigration';

export function sha256Json(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function buildLegacyCollectionSourceSnapshot(cards: Card[]) {
  return cards
    .map((card) => ({
      docId: card.docId,
      title: card.title ?? '',
      status: card.status ?? null,
      isCollectionRoot: card.isCollectionRoot === true,
      childrenIds: Array.isArray(card.childrenIds) ? card.childrenIds : [],
    }))
    .sort((a, b) => a.docId.localeCompare(b.docId));
}

export function fingerprintLegacyCollectionSource(cards: Card[]): string {
  return sha256Json(buildLegacyCollectionSourceSnapshot(cards));
}

export function fingerprintCollectionMigrationPreview(preview: CollectionMigrationPreview): string {
  // Migration identity covers authored target structure, not later operational
  // concurrency/authority fields. Keeping these fields out preserves frozen
  // manifests when the runtime Collection contract gains operational metadata.
  const collection: Record<string, unknown> = { ...preview.collection };
  delete collection.structureRevision;
  delete collection.authorityRevision;
  delete collection.authorityEstablishedAt;
  return sha256Json({ ...preview, collection });
}
