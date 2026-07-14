import { TAG_SET_0_GENERIC_SEED } from '@/data/tagSets/tagSet0GenericSeed';
import { TAG_SET_0_ID } from '@/lib/constants/tagSet0';
import { createTag, deleteTag, getAllTags } from '@/lib/firebase/tagService';
import { getAuthorSettings, updateTagSet0Status } from '@/lib/services/authorSettingsService';
import type { TagSet0Status } from '@/lib/types/authorSettings';
import type { Tag } from '@/lib/types/tag';
import type { TagSet0SeedNode } from '@/data/tagSets/tagSet0GenericSeed';
import { isTagTreeSlotTaken, previewTagSet0Install } from '@/lib/utils/tagSet0Install';

type CanonicalDimension = 'who' | 'what' | 'when' | 'where';

function normalizeDimension(value: unknown): CanonicalDimension | undefined {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'who' || raw === 'what' || raw === 'when' || raw === 'where') return raw;
  return undefined;
}

function tagsForSet(allTags: Tag[]): Tag[] {
  return allTags.filter((tag) => tag.tagSetId === TAG_SET_0_ID);
}

export async function getTagSet0Status(): Promise<TagSet0Status> {
  const settings = await getAuthorSettings();
  const allTags = await getAllTags();
  const installedTags = tagsForSet(allTags);

  if (installedTags.length > 0) {
    return {
      installed: true,
      tagCount: installedTags.length,
      installedAt: settings.tagSet0?.installedAt,
    };
  }

  return settings.tagSet0 ?? { installed: false, tagCount: 0 };
}

export type InstallTagSet0Result = {
  alreadyInstalled: boolean;
  createdCount: number;
  skippedCount: number;
  tagCount: number;
};

async function createSeedNodes(
  nodes: TagSet0SeedNode[],
  allTags: Tag[],
  parentId: string | undefined,
  inheritedDimension: CanonicalDimension | undefined
): Promise<{ createdCount: number; skippedCount: number; createdTags: Tag[] }> {
  let createdCount = 0;
  let skippedCount = 0;
  const createdTags: Tag[] = [];

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

    const created = await createTag({
      name: node.name,
      dimension,
      parentId,
      defaultExpanded: node.defaultExpanded,
      tagSetId: TAG_SET_0_ID,
    });

    allTags.push(created);
    createdTags.push(created);
    createdCount += 1;

    if (node.children?.length) {
      const childResult = await createSeedNodes(
        node.children,
        allTags,
        created.docId,
        dimension
      );
      createdCount += childResult.createdCount;
      skippedCount += childResult.skippedCount;
      createdTags.push(...childResult.createdTags);
    }
  }

  return { createdCount, skippedCount, createdTags };
}

function countSeedSubtree(node: TagSet0SeedNode): number {
  let count = 1;
  for (const child of node.children ?? []) {
    count += countSeedSubtree(child);
  }
  return count;
}

/**
 * Add Tag Set 0 tags alongside the existing library. Never deletes or overwrites existing tags.
 */
export async function installTagSet0Generic(): Promise<InstallTagSet0Result> {
  const allTags = await getAllTags();
  const existingSetTags = tagsForSet(allTags);
  if (existingSetTags.length > 0) {
    return {
      alreadyInstalled: true,
      createdCount: 0,
      skippedCount: 0,
      tagCount: existingSetTags.length,
    };
  }

  const preview = previewTagSet0Install(TAG_SET_0_GENERIC_SEED, allTags);
  if (preview.createCount === 0) {
    return {
      alreadyInstalled: false,
      createdCount: 0,
      skippedCount: preview.skippedCount,
      tagCount: 0,
    };
  }

  const workingTags = [...allTags];
  const { createdCount, skippedCount, createdTags } = await createSeedNodes(
    TAG_SET_0_GENERIC_SEED,
    workingTags,
    undefined,
    undefined
  );

  const installedAt = new Date().toISOString();
  await updateTagSet0Status({
    installed: createdTags.length > 0,
    tagCount: createdTags.length,
    installedAt,
  });

  return {
    alreadyInstalled: false,
    createdCount,
    skippedCount,
    tagCount: createdTags.length,
  };
}

export type RemoveTagSet0Result = {
  removedCount: number;
};

/**
 * Remove only tags created by Tag Set 0 install. Existing author tags are untouched.
 */
export async function removeTagSet0Generic(): Promise<RemoveTagSet0Result> {
  const allTags = await getAllTags();
  const setTags = tagsForSet(allTags);
  if (setTags.length === 0) {
    await updateTagSet0Status({ installed: false, tagCount: 0 });
    return { removedCount: 0 };
  }

  const setIds = new Set(
    setTags.map((tag) => tag.docId).filter((id): id is string => typeof id === 'string' && id.length > 0)
  );
  const roots = setTags.filter((tag) => {
    const parentId = tag.parentId ?? '';
    return !parentId || !setIds.has(parentId);
  });

  for (const root of roots) {
    if (root.docId) {
      await deleteTag(root.docId);
    }
  }

  await updateTagSet0Status({ installed: false, tagCount: 0 });
  return { removedCount: setTags.length };
}
