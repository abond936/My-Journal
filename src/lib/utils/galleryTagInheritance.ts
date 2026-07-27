import type { Tag } from '@/lib/types/tag';
import type { GalleryTagInheritanceToggles } from '@/lib/types/authorSettings';
import { DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';
import { buildResolvedTagDimensionMap } from '@/lib/utils/tagDimensionResolve';
import type { TemporalValue } from '@/lib/types/temporal';
import { temporalValuesEqual } from '@/lib/utils/temporalValue';
import type {
  DimensionResolution,
  DimensionReviewMap,
} from '@/lib/types/dimensionReview';

export type GalleryMediaTagSource = {
  tags?: string[];
  temporal?: TemporalValue | null;
  dimensionReview?: DimensionReviewMap;
};

export type GalleryTemporalRollup = {
  status: 'empty' | 'reviewed' | 'unreviewed';
  temporal: TemporalValue | null;
};

export type GalleryDimensionRollup = {
  status: 'empty' | 'reviewed' | 'unreviewed';
  tagIds: string[];
  implicitSubjectTagIds: string[];
  resolution: DimensionResolution | null;
};

export type GalleryTagRollupStatus = GalleryDimensionRollup['status'];
export type GalleryTagRollupStatuses = Record<TagDimension, GalleryTagRollupStatus>;

export function computeGalleryTemporalRollup(
  galleryMedia: GalleryMediaTagSource[],
  allTags?: Tag[]
): GalleryTemporalRollup {
  if (galleryMedia.length === 0) return { status: 'empty', temporal: null };
  const resolved = allTags ? buildResolvedTagDimensionMap(allTags) : null;
  const dated: TemporalValue[] = [];
  const resolutions: DimensionResolution[] = [];
  let legacyOnlyCount = 0;
  for (const media of galleryMedia) {
    const review = media.dimensionReview?.when;
    if (review?.reviewed !== true) {
      return { status: 'unreviewed', temporal: null };
    }
    if (media.temporal) dated.push(media.temporal);
    else if (review.resolution) resolutions.push(review.resolution);
    else if (
      resolved &&
      (media.tags ?? []).some((tagId) => resolved.get(tagId) === 'when')
    ) {
      legacyOnlyCount += 1;
    } else {
      return { status: 'unreviewed', temporal: null };
    }
  }
  if ((dated.length > 0 && (resolutions.length > 0 || legacyOnlyCount > 0)) ||
      (resolutions.length > 0 && legacyOnlyCount > 0)) {
    return { status: 'unreviewed', temporal: null };
  }
  if (dated.length === 0) {
    const uniqueResolutions = Array.from(new Set(resolutions));
    if (uniqueResolutions.length === 0) {
      return legacyOnlyCount > 0
        ? { status: 'empty', temporal: null }
        : { status: 'unreviewed', temporal: null };
    }
    if (uniqueResolutions.length > 1) return { status: 'unreviewed', temporal: null };
    return {
      status: 'reviewed',
      temporal: { status: uniqueResolutions[0], source: 'manual' },
    };
  }
  const first = dated[0]!;
  if (dated.some((value) => !temporalValuesEqual(value, first))) {
    return { status: 'unreviewed', temporal: null };
  }
  return { status: 'reviewed', temporal: first };
}

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

export function inheritedDimensionsChangedByTagEdit(
  currentTagIds: string[],
  nextTagIds: string[],
  allTags: Tag[],
  settings: GalleryTagInheritanceToggles,
  overrides: GalleryTagInheritanceToggles | undefined
): TagDimension[] {
  const effective = effectiveGalleryInheritanceToggles(settings, overrides);
  const resolved = buildResolvedTagDimensionMap(allTags);
  const current = new Set(currentTagIds);
  const next = new Set(nextTagIds);

  return DIMENSION_ORDER.filter((dimension) => {
    if (!effective[dimension]) return false;
    return [...new Set([...current, ...next])].some(
      (tagId) => resolved.get(tagId) === dimension && current.has(tagId) !== next.has(tagId)
    );
  });
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
    return { status: 'empty', tagIds: [], implicitSubjectTagIds: [], resolution: null };
  }
  const entries = galleryMedia.map((media) => ({
    tagIds: tagsForDimension(media.tags ?? [], dimension, resolved),
    review: media.dimensionReview?.[dimension],
    temporalKnown: dimension === 'when' && media.temporal?.status === 'known',
  }));
  if (entries.some(({ tagIds, review, temporalKnown }) =>
    review?.reviewed !== true ||
    (tagIds.length === 0 && !temporalKnown && !review.resolution)
  )) {
    return {
      status: 'unreviewed',
      tagIds: [],
      implicitSubjectTagIds: [],
      resolution: null,
    };
  }
  const tagIds = computeGalleryDimensionTagUnion(galleryMedia, dimension, resolved);
  const hasKnownValue = entries.some(
    (entry) => entry.tagIds.length > 0 || entry.temporalKnown
  );
  const resolutions = Array.from(new Set(
    entries
      .filter((entry) => entry.tagIds.length === 0)
      .map((entry) => entry.review?.resolution)
      .filter((resolution): resolution is DimensionResolution => Boolean(resolution))
  ));
  const resolution = !hasKnownValue && resolutions.length === 1 ? resolutions[0] : null;
  if (!hasKnownValue && resolutions.length !== 1) {
    return {
      status: 'unreviewed',
      tagIds: [],
      implicitSubjectTagIds: [],
      resolution: null,
    };
  }
  return {
    status: 'reviewed',
    tagIds,
    implicitSubjectTagIds: tagIds.length === 1 ? tagIds : [],
    resolution,
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
  currentStatuses?: Partial<GalleryTagRollupStatuses>,
  currentDimensionReview?: DimensionReviewMap
): {
  tags: string[];
  statuses: GalleryTagRollupStatuses;
  implicitSubjectTagIds: string[];
  dimensionReview: DimensionReviewMap;
} {
  const resolved = buildResolvedTagDimensionMap(allTags);
  const next = new Set(currentTags);
  const statuses: GalleryTagRollupStatuses = {
    who: currentStatuses?.who ?? 'empty',
    what: currentStatuses?.what ?? 'empty',
    when: currentStatuses?.when ?? 'empty',
    where: currentStatuses?.where ?? 'empty',
  };
  const implicitSubjectTagIds: string[] = [];
  const dimensionReview: NonNullable<DimensionReviewMap> = {
    ...(currentDimensionReview ?? {}),
  };

  for (const dimension of DIMENSION_ORDER) {
    if (!toggles[dimension]) continue;
    const rollup = computeGalleryDimensionRollup(galleryMedia, dimension, resolved);
    statuses[dimension] = rollup.status;
    implicitSubjectTagIds.push(...rollup.implicitSubjectTagIds);
    dimensionReview[dimension] = {
      reviewed: rollup.status === 'reviewed',
      resolution: rollup.resolution,
    };

    for (const id of currentTags) {
      if (resolved.get(id) === dimension) next.delete(id);
    }
    for (const id of rollup.tagIds) next.add(id);
  }

  return {
    tags: Array.from(next).sort((a, b) => a.localeCompare(b)),
    statuses,
    implicitSubjectTagIds,
    dimensionReview,
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

export function galleryMediaMembershipChanged(
  previousMediaIds: Iterable<string>,
  nextMediaIds: Iterable<string>
): boolean {
  const previous = new Set(previousMediaIds);
  const next = new Set(nextMediaIds);
  return previous.size !== next.size || [...previous].some((id) => !next.has(id));
}
