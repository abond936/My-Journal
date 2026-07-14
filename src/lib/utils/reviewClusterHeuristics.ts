import type { Media } from '@/lib/types/photo';
import type { ProvisionalCluster, ReviewLens, SuggestedTagIdsByDimension } from '@/lib/types/provisionalCluster';
import type { Tag } from '@/lib/types/tag';

export type ClusterDraft = Pick<
  ProvisionalCluster,
  'lens' | 'title' | 'reason' | 'occasionLabel' | 'memberMediaIds' | 'suggestedTagIds' | 'coverageNote'
>;

type MediaSlice = Pick<
  Media,
  'docId' | 'createdAt' | 'sourcePath' | 'hasWho' | 'who' | 'tags'
>;

export const MAX_REVIEW_PILE_SIZE = 40;

export function dayKeyFromTimestamp(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDayTitle(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function folderLabelFromSourcePath(sourcePath: string): string | undefined {
  const normalized = sourcePath.replace(/\\/g, '/').trim();
  if (!normalized) return undefined;
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length < 2) return undefined;
  return parts[parts.length - 2];
}

function suggestWhenTagIds(members: MediaSlice[], allTags: Tag[]): string[] {
  const years = new Set<number>();
  for (const item of members) {
    if (item.createdAt) years.add(new Date(item.createdAt).getFullYear());
  }
  const ids: string[] = [];
  for (const year of years) {
    const match = allTags.find(
      (tag) =>
        tag.dimension === 'when' &&
        (tag.name === String(year) || tag.name?.trim() === String(year))
    );
    if (match?.docId) ids.push(match.docId);
  }
  return ids;
}

function buildCoverageNote(members: MediaSlice[], oversized = false): string {
  const withWho = members.filter((m) => m.hasWho || (m.who?.length ?? 0) > 0).length;
  const scenery = members.length - withWho;
  let note = '';
  if (withWho === 0) {
    note = `${members.length} photos — Who optional (scenery or not yet named)`;
  } else if (scenery === 0) {
    note = `${withWho} photos with people tags — review Who if needed`;
  } else {
    note = `${scenery} scenery (Who optional) · ${withWho} with people tags`;
  }
  if (oversized) {
    note += ` · Large group — split or switch to Folder lens`;
  }
  return note;
}

function finalizeDraft(
  draft: ClusterDraft,
  members: MediaSlice[],
  allTags: Tag[],
  oversized = false
): ClusterDraft {
  const whenIds = suggestWhenTagIds(members, allTags);
  return {
    ...draft,
    suggestedTagIds: {
      ...draft.suggestedTagIds,
      when: whenIds.length > 0 ? whenIds : draft.suggestedTagIds.when,
    },
    coverageNote: buildCoverageNote(members, oversized),
  };
}

function groupByDay(members: MediaSlice[]): Map<string, MediaSlice[]> {
  const map = new Map<string, MediaSlice[]>();
  for (const item of members) {
    const key = item.createdAt ? dayKeyFromTimestamp(item.createdAt) : 'unknown-date';
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function groupByDayAndFolder(members: MediaSlice[]): Map<string, MediaSlice[]> {
  const map = new Map<string, MediaSlice[]>();
  for (const item of members) {
    const day = item.createdAt ? dayKeyFromTimestamp(item.createdAt) : 'unknown-date';
    const folder = folderLabelFromSourcePath(item.sourcePath ?? '') ?? 'unknown-folder';
    const key = `${day}\u001e${folder}`;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function groupByFolder(members: MediaSlice[]): Map<string, MediaSlice[]> {
  const map = new Map<string, MediaSlice[]>();
  for (const item of members) {
    const folder = folderLabelFromSourcePath(item.sourcePath ?? '') ?? 'Unknown folder';
    const list = map.get(folder) ?? [];
    list.push(item);
    map.set(folder, list);
  }
  return map;
}

function groupByWhoBucket(members: MediaSlice[]): Map<string, MediaSlice[]> {
  const map = new Map<string, MediaSlice[]>();
  for (const item of members) {
    const whoIds = [...(item.who ?? [])].sort();
    const key = whoIds.length > 0 ? whoIds.join(',') : 'no-who';
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function splitWhenDayPile(dayKey: string, members: MediaSlice[]): Map<string, MediaSlice[]> {
  if (members.length <= MAX_REVIEW_PILE_SIZE) {
    return new Map([[dayKey, members]]);
  }
  return groupByFolder(members);
}

export function buildReviewClustersForLens(
  lens: ReviewLens,
  mediaItems: MediaSlice[],
  allTags: Tag[]
): ClusterDraft[] {
  if (mediaItems.length === 0) return [];

  const drafts: ClusterDraft[] = [];

  if (lens === 'suggested') {
    for (const [key, members] of groupByDayAndFolder(mediaItems)) {
      if (members.length === 0) continue;
      const [dayKey, folderKey] = key.split('\u001e');
      const sample = members[0]!;
      const folder = folderKey !== 'unknown-folder' ? folderKey : undefined;
      const dayTitle =
        dayKey === 'unknown-date' ? 'Unknown date' : formatDayTitle(sample.createdAt ?? Date.now());
      const title = folder ? `${folder} · ${dayTitle}` : dayTitle;
      const reason = folder
        ? `Same import folder “${folder}” and capture day`
        : `Same capture day (${dayKey}) — folder unknown`;
      const oversized = members.length > MAX_REVIEW_PILE_SIZE;

      drafts.push(
        finalizeDraft(
          {
            lens,
            title,
            reason,
            occasionLabel: folder,
            memberMediaIds: members.map((m) => m.docId),
            suggestedTagIds: {},
          },
          members,
          allTags,
          oversized
        )
      );
    }
    return drafts.sort((a, b) => b.memberMediaIds.length - a.memberMediaIds.length);
  }

  if (lens === 'when') {
    for (const [dayKey, dayMembers] of groupByDay(mediaItems)) {
      const splitGroups = splitWhenDayPile(dayKey, dayMembers);
      for (const [, members] of splitGroups) {
        if (members.length === 0) continue;
        const sample = members[0]!;
        const folder = folderLabelFromSourcePath(sample.sourcePath ?? '');
        const dayTitle =
          dayKey === 'unknown-date' ? 'Unknown date' : formatDayTitle(sample.createdAt ?? Date.now());
        const splitByFolder = dayMembers.length > MAX_REVIEW_PILE_SIZE && folder;
        const title = splitByFolder && folder ? `${dayTitle} · ${folder}` : dayTitle;
        const reason = splitByFolder
          ? `Capture day ${dayKey}, split by folder “${folder}” (day group was too large)`
          : `Grouped by capture day (${dayKey})`;
        const oversized = members.length > MAX_REVIEW_PILE_SIZE;

        drafts.push(
          finalizeDraft(
            {
              lens,
              title,
              reason,
              occasionLabel: folder,
              memberMediaIds: members.map((m) => m.docId),
              suggestedTagIds: {},
            },
            members,
            allTags,
            oversized
          )
        );
      }
    }
    return drafts.sort((a, b) => b.memberMediaIds.length - a.memberMediaIds.length);
  }

  if (lens === 'where' || lens === 'what') {
    for (const [folder, members] of groupByFolder(mediaItems)) {
      const oversized = members.length > MAX_REVIEW_PILE_SIZE;
      drafts.push(
        finalizeDraft(
          {
            lens,
            title: lens === 'what' ? folder : `Folder · ${folder}`,
            reason: `Import path folder “${folder}”`,
            occasionLabel: lens === 'what' ? folder : undefined,
            memberMediaIds: members.map((m) => m.docId),
            suggestedTagIds: {},
          },
          members,
          allTags,
          oversized
        )
      );
    }
    return drafts.sort((a, b) => b.memberMediaIds.length - a.memberMediaIds.length);
  }

  if (lens === 'who') {
    for (const [bucket, members] of groupByWhoBucket(mediaItems)) {
      drafts.push(
        finalizeDraft(
          {
            lens,
            title: bucket === 'no-who' ? 'No Who tags yet' : 'Shared Who tags',
            reason:
              bucket === 'no-who'
                ? 'Photos without confirmed Who tags'
                : 'Photos sharing the same Who assignment set',
            memberMediaIds: members.map((m) => m.docId),
            suggestedTagIds:
              bucket === 'no-who'
                ? {}
                : { who: bucket.split(',').filter(Boolean) },
          },
          members,
          allTags
        )
      );
    }
    return drafts.sort((a, b) => b.memberMediaIds.length - a.memberMediaIds.length);
  }

  return drafts;
}

export function tagIdsFromFlatList(
  tagIds: string[],
  allTags: Tag[]
): SuggestedTagIdsByDimension {
  const tagMap = new Map(allTags.map((t) => [t.docId!, t]));
  const result: SuggestedTagIdsByDimension = {};
  for (const id of tagIds) {
    const tag = tagMap.get(id);
    const dim = tag?.dimension;
    if (!dim) continue;
    const list = result[dim] ?? [];
    if (!list.includes(id)) list.push(id);
    result[dim] = list;
  }
  return result;
}
