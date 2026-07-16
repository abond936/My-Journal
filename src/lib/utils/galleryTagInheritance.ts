import type { Tag } from '@/lib/types/tag';
import type { GalleryTagInheritanceToggles } from '@/lib/types/authorSettings';
import { DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import { buildResolvedTagDimensionMap } from '@/lib/utils/tagDimensionResolve';

export type GalleryMediaTagSource = {
  tags?: string[];
};

export type GalleryDimensionRollup = {
  status: 'empty' | 'reviewed' | 'unreviewed';
  tagIds: string[];
  implicitSubjectTagIds: string[];
};

export type GalleryTagRollupStatus = GalleryDimensionRollup['status'];
export type GalleryTagRollupStatuses = Record<TagDimension, GalleryTagRollupStatus>;

export function protectExistingCardInheritance(): GalleryTagInheritanceToggles {
  return { who: true, what: true, when: true, where: true };
}

export function newCardInheritanceOverrides(settings: {
  galleryTagInheritance?: GalleryTagInheritanceToggles;
  galleryTagInheritanceConfigured?: boolean;
}): GalleryTagInheritanceToggles {
  if (!settings.galleryTagInheritanceConfigured) return protectExistingCardInheritance();
  const toggles = { who: false, what: false, when: false, where: false, ...settings.galleryTagInheritance };
  return {
    who: !toggles.who,
    what: !toggles.what,
    when: !toggles.when,
    where: !toggles.where,
  };
}

export function resolveNewCardInheritanceOverrides(
  settings: {
    galleryTagInheritance?: GalleryTagInheritanceToggles;
    galleryTagInheritanceConfigured?: boolean;
  },
  requestedOverrides?: GalleryTagInheritanceToggles
): GalleryTagInheritanceToggles {
  const defaults = newCardInheritanceOverrides(settings);
  if (!requestedOverrides || !settings.galleryTagInheritanceConfigured) return defaults;

  return {
    who: defaults.who || requestedOverrides.who,
    what: defaults.what || requestedOverrides.what,
    when: defaults.when || requestedOverrides.when,
    where: defaults.where || requestedOverrides.where,
  };
}

export function effectiveGalleryInheritanceToggles(
  settings: GalleryTagInheritanceToggles,
  overrides: GalleryTagInheritanceToggles | undefined
): GalleryTagInheritanceToggles {
  const protectedDimensions = overrides ?? protectExistingCardInheritance();
  return {
    who: settings.who && !protectedDimensions.who,
    what: settings.what && !protectedDimensions.what,
    when: settings.when && !protectedDimensions.when,
    where: settings.where && !protectedDimensions.where,
  };
}

function tagsForDimension(
  tagIds: string[],
  dimension: TagDimension,
  resolved: Map<string, TagDimension | undefined>
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of tagIds) {
    if (!id || seen.has(id)) continue;
    if (resolved.get(id) !== dimension) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * For one dimension, collect the deduped union of confirmed tags on gallery media (frame truth).
 */
export function computeGalleryDimensionTagUnion(
  galleryMedia: GalleryMediaTagSource[],
  dimension: TagDimension,
  resolved: Map<string, TagDimension | undefined>
): string[] {
  const union = new Set<string>();
  for (const media of galleryMedia) {
    for (const tagId of tagsForDimension(media.tags ?? [], dimension, resolved)) {
      union.add(tagId);
    }
  }
  return Array.from(union).sort((a, b) => a.localeCompare(b));
}

export function computeGalleryDimensionRollup(
  galleryMedia: GalleryMediaTagSource[],
  dimension: TagDimension,
  resolved: Map<string, TagDimension | undefined>
): GalleryDimensionRollup {
  if (galleryMedia.length === 0) {
    return { status: 'empty', tagIds: [], implicitSubjectTagIds: [] };
  }
  if (galleryMedia.some((media) => tagsForDimension(media.tags ?? [], dimension, resolved).length === 0)) {
    return { status: 'unreviewed', tagIds: [], implicitSubjectTagIds: [] };
  }
  const tagIds = computeGalleryDimensionTagUnion(galleryMedia, dimension, resolved);
  return {
    status: 'reviewed',
    tagIds,
    implicitSubjectTagIds: tagIds.length === 1 ? tagIds : [],
  };
}

/**
 * Merge gallery→card inheritance into card `tags[]` for enabled dimensions.
 * Disabled dimensions leave existing card assignments unchanged.
 */
export function mergeGalleryInheritedCardTags(
  currentTags: string[],
  galleryMedia: GalleryMediaTagSource[],
  toggles: GalleryTagInheritanceToggles,
  allTags: Tag[]
): string[] {
  const resolved = buildResolvedTagDimensionMap(allTags);
  const next = new Set(currentTags);

  for (const dimension of DIMENSION_ORDER) {
    if (!toggles[dimension]) continue;

    for (const id of currentTags) {
      if (resolved.get(id) === dimension) {
        next.delete(id);
      }
    }

    for (const id of computeGalleryDimensionTagUnion(galleryMedia, dimension, resolved)) {
      next.add(id);
    }
  }

  return Array.from(next).sort((a, b) => a.localeCompare(b));
}

export function computeGalleryInheritanceResult(
  currentTags: string[],
  galleryMedia: GalleryMediaTagSource[],
  toggles: GalleryTagInheritanceToggles,
  allTags: Tag[],
  currentStatuses?: Partial<GalleryTagRollupStatuses>
): { tags: string[]; statuses: GalleryTagRollupStatuses; implicitSubjectTagIds: string[] } {
  const resolved = buildResolvedTagDimensionMap(allTags);
  const next = new Set(currentTags);
  const statuses: GalleryTagRollupStatuses = {
    who: currentStatuses?.who ?? 'empty',
    what: currentStatuses?.what ?? 'empty',
    when: currentStatuses?.when ?? 'empty',
    where: currentStatuses?.where ?? 'empty',
  };
  const implicitSubjectTagIds: string[] = [];

  for (const dimension of DIMENSION_ORDER) {
    if (!toggles[dimension]) continue;
    const rollup = computeGalleryDimensionRollup(galleryMedia, dimension, resolved);
    statuses[dimension] = rollup.status;
    implicitSubjectTagIds.push(...rollup.implicitSubjectTagIds);

    for (const id of currentTags) {
      if (resolved.get(id) === dimension) next.delete(id);
    }
    for (const id of rollup.tagIds) next.add(id);
  }

  return {
    tags: Array.from(next).sort((a, b) => a.localeCompare(b)),
    statuses,
    implicitSubjectTagIds,
  };
}

export function galleryInheritanceTogglesActive(toggles: GalleryTagInheritanceToggles): boolean {
  return DIMENSION_ORDER.some((dimension) => toggles[dimension]);
}

export function cardTagsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x.localeCompare(y));
  const sortedB = [...b].sort((x, y) => x.localeCompare(y));
  return sortedA.every((id, index) => id === sortedB[index]);
}
