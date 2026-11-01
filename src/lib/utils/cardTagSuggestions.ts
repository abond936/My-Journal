import type { Tag } from '@/lib/types/tag';
import { buildResolvedTagDimensionMap, buildTagByIdMap, getTagPathDisplay } from '@/lib/utils/tagDimensionResolve';
import { DIMENSION_ORDER, type TagDimension } from '@/lib/utils/tagDisplay';

export type CardTagSuggestion = {
  tagId: string;
  name: string;
  pathLabel: string;
  dimension: TagDimension;
  evidence: 'title' | 'story text';
};

function searchableText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function containsPhrase(text: string, phrase: string): boolean {
  return Boolean(text && phrase && ` ${text} `.includes(` ${phrase} `));
}

export function suggestExistingCardTags(args: {
  title: string;
  subtitle?: string | null;
  content?: string | null;
  allTags: Tag[];
  selectedTagIds?: string[];
  limitPerDimension?: number;
}): CardTagSuggestion[] {
  const titleText = searchableText(`${args.title} ${args.subtitle ?? ''}`);
  const storyText = searchableText(`${args.title} ${args.subtitle ?? ''} ${args.content ?? ''}`);
  const selected = new Set(args.selectedTagIds ?? []);
  const resolvedDimension = buildResolvedTagDimensionMap(args.allTags);
  const tagById = buildTagByIdMap(args.allTags);
  const limit = Math.max(1, Math.min(args.limitPerDimension ?? 4, 8));
  const candidates: Array<CardTagSuggestion & { titleMatch: boolean; phraseLength: number }> = [];

  for (const tag of args.allTags) {
    if (!tag.docId || selected.has(tag.docId)) continue;
    const phrase = searchableText(tag.name);
    if (phrase.length < 3 || !containsPhrase(storyText, phrase)) continue;
    const dimension = resolvedDimension.get(tag.docId);
    if (!dimension) continue;
    const titleMatch = containsPhrase(titleText, phrase);
    candidates.push({
      tagId: tag.docId,
      name: tag.name,
      pathLabel: getTagPathDisplay(tag, tagById),
      dimension,
      evidence: titleMatch ? 'title' : 'story text',
      titleMatch,
      phraseLength: phrase.length,
    });
  }

  candidates.sort((a, b) => {
    if (a.titleMatch !== b.titleMatch) return a.titleMatch ? -1 : 1;
    if (a.phraseLength !== b.phraseLength) return b.phraseLength - a.phraseLength;
    return a.pathLabel.localeCompare(b.pathLabel);
  });

  const counts = new Map<TagDimension, number>();
  const output: CardTagSuggestion[] = [];
  for (const candidate of candidates) {
    const count = counts.get(candidate.dimension) ?? 0;
    if (count >= limit) continue;
    counts.set(candidate.dimension, count + 1);
    output.push({
      tagId: candidate.tagId,
      name: candidate.name,
      pathLabel: candidate.pathLabel,
      dimension: candidate.dimension,
      evidence: candidate.evidence,
    });
  }

  return output.sort((a, b) => {
    const dimensionOrder = DIMENSION_ORDER.indexOf(a.dimension) - DIMENSION_ORDER.indexOf(b.dimension);
    if (dimensionOrder) return dimensionOrder;
    if (a.evidence !== b.evidence) return a.evidence === 'title' ? -1 : 1;
    return a.pathLabel.localeCompare(b.pathLabel);
  });
}
