import type { Tag } from '@/lib/types/tag';
import type { TagSet0SeedNode } from '@/data/tagSets/tagSet0GenericSeed';

function normalizeTagName(name: string): string {
  return name.trim().toLowerCase();
}

type CanonicalDimension = 'who' | 'what' | 'when' | 'where';

function normalizeDimension(value: unknown): CanonicalDimension | undefined {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'who' || raw === 'what' || raw === 'when' || raw === 'where') return raw;
  return undefined;
}

/** True when an existing tag already occupies this tree slot (additive install must skip). */
export function isTagTreeSlotTaken(
  allTags: Tag[],
  opts: { name: string; parentId?: string; dimension?: Tag['dimension'] }
): boolean {
  const norm = normalizeTagName(opts.name);
  const wantParent = (opts.parentId ?? '').toString().trim();

  return allTags.some((tag) => {
    if (normalizeTagName(tag.name || '') !== norm) return false;
    const tagParent = (tag.parentId ?? '').toString().trim();
    if (!wantParent) {
      const dim = opts.dimension;
      if (!dim) return false;
      return !tagParent && tag.dimension === dim;
    }
    return tagParent === wantParent;
  });
}

function countSeedSubtree(node: TagSet0SeedNode): number {
  let count = 1;
  for (const child of node.children ?? []) {
    count += countSeedSubtree(child);
  }
  return count;
}

export type TagSet0InstallPreview = {
  createCount: number;
  skippedCount: number;
};

/** Count how many seed nodes would be created vs skipped without mutating Firestore. */
export function previewTagSet0Install(seed: TagSet0SeedNode[], allTags: Tag[]): TagSet0InstallPreview {
  let createCount = 0;
  let skippedCount = 0;

  const walk = (
    nodes: TagSet0SeedNode[],
    parentId: string | undefined,
    inheritedDimension: CanonicalDimension | undefined
  ) => {
    for (const node of nodes) {
      const dimension = normalizeDimension(node.dimension ?? inheritedDimension);
      if (!dimension) {
        skippedCount += 1;
        continue;
      }

      if (
        isTagTreeSlotTaken(allTags, {
          name: node.name,
          parentId,
          dimension,
        })
      ) {
        skippedCount += countSeedSubtree(node);
        continue;
      }

      createCount += 1;
      if (node.children?.length) {
        walk(node.children, `preview:${node.name}`, dimension);
      }
    }
  };

  walk(seed, undefined, undefined);
  return { createCount, skippedCount };
}
