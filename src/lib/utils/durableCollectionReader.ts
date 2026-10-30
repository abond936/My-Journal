import type { Card } from '@/lib/types/card';
import type { Collection, CollectionPlacement } from '@/lib/types/collection';
import {
  buildReaderCollectionProjection,
  flattenReaderCollectionProjection,
  type ReaderCollectionPlacementNode,
} from '@/lib/utils/collectionPlacementProjection';

export type DurableCollectionStructure = {
  collection: Collection;
  placements: CollectionPlacement[];
  cards: Card[];
};

export type DurableCollectionReaderSelection = {
  title: string;
  breadcrumbs: ReaderCollectionPlacementNode[];
  introductionCard: Card | null;
  entries: Array<{ placementId: string; card: Card }>;
};

export function buildDurableCollectionReaderSelection(
  structure: DurableCollectionStructure,
  selectedPlacementId?: string | null
): DurableCollectionReaderSelection {
  const projection = buildReaderCollectionProjection(structure);
  const selected = selectedPlacementId
    ? projection.nodesByPlacementId.get(selectedPlacementId) ?? null
    : null;
  const breadcrumbs: ReaderCollectionPlacementNode[] = [];
  if (selected) {
    let current: ReaderCollectionPlacementNode | undefined = selected;
    const seen = new Set<string>();
    while (current && !seen.has(current.placementId)) {
      seen.add(current.placementId);
      breadcrumbs.unshift(current);
      current = current.parentPlacementId
        ? projection.nodesByPlacementId.get(current.parentPlacementId)
        : undefined;
    }
  }
  const nodes = flattenReaderCollectionProjection(selected ? [selected] : projection.roots);
  return {
    title: selected?.card.title || selected?.card.subtitle || structure.collection.title,
    breadcrumbs,
    introductionCard: selected?.card ?? projection.introductionCard,
    entries: nodes
      .filter((node) => node.role === 'card')
      .map((node) => ({ placementId: node.placementId, card: node.card })),
  };
}
