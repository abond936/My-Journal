import type { EmbeddedReplacementMetadataEvidence } from '@/lib/services/images/embeddedMetadataForImport';
import type { Media } from '@/lib/types/photo';
import type { Tag } from '@/lib/types/tag';
import { formatTemporalValueLong } from '@/lib/utils/temporalValue';

export type ReplacementMetadataConflict = {
  field: 'caption' | 'when' | 'who' | 'what' | 'where';
  label: string;
  confirmedValue: string;
  replacementEvidence: string;
};

export type ReplacementMetadataReview = {
  evidence: {
    caption?: string;
    capturedAt?: EmbeddedReplacementMetadataEvidence['capturedAt'];
    gps?: EmbeddedReplacementMetadataEvidence['gps'];
    keywords: string[];
  };
  matchedTags: Array<{
    keyword: string;
    tagId: string;
    name: string;
    dimension?: Tag['dimension'];
  }>;
  unmatchedKeywords: string[];
  conflicts: ReplacementMetadataConflict[];
  readIssue?: string;
};

function keywordVariants(keyword: string): string[] {
  const variants = new Set([keyword.trim()]);
  if (keyword.includes('|')) variants.add(keyword.split('|').pop()!.trim());
  if (keyword.includes('/')) variants.add(keyword.split('/').pop()!.trim());
  return [...variants].filter(Boolean);
}

function tagsAreRelated(left: Tag, right: Tag): boolean {
  if (!left.docId || !right.docId) return false;
  return (
    left.docId === right.docId ||
    (left.path ?? []).includes(right.docId) ||
    (right.path ?? []).includes(left.docId)
  );
}

function capturedDateMatchesTemporal(
  capturedAt: NonNullable<EmbeddedReplacementMetadataEvidence['capturedAt']>,
  temporal: NonNullable<Media['temporal']>
): boolean {
  if (temporal.status !== 'known') return false;
  if (temporal.precision === 'decade') {
    return Math.floor(capturedAt.year / 10) * 10 === temporal.year;
  }
  if (capturedAt.year !== temporal.year) return false;
  if (temporal.precision === 'year') return true;
  if (capturedAt.month !== temporal.month) return false;
  if (temporal.precision === 'month') return true;
  if (capturedAt.day !== temporal.day) return false;
  if (temporal.precision === 'day') return true;
  if (capturedAt.hour !== temporal.hour) return false;
  if (temporal.precision === 'hour') return true;
  return capturedAt.minute === temporal.minute;
}

function formatCapturedAt(
  capturedAt: NonNullable<EmbeddedReplacementMetadataEvidence['capturedAt']>
): string {
  const date = [capturedAt.year, capturedAt.month, capturedAt.day]
    .filter((value) => value !== undefined)
    .map((value, index) => (index === 0 ? String(value) : String(value).padStart(2, '0')))
    .join('-');
  if (capturedAt.hour === undefined) return date;
  return `${date} ${String(capturedAt.hour).padStart(2, '0')}:${String(capturedAt.minute ?? 0).padStart(2, '0')}`;
}

export function buildReplacementMetadataReview(
  media: Media,
  evidence: EmbeddedReplacementMetadataEvidence,
  allTags: Tag[]
): ReplacementMetadataReview {
  const tagById = new Map(
    allTags.filter((tag): tag is Tag & { docId: string } => Boolean(tag.docId)).map((tag) => [tag.docId, tag])
  );
  const tagByName = new Map<string, Tag>();
  for (const tag of [...allTags].sort((a, b) => (a.docId ?? '').localeCompare(b.docId ?? ''))) {
    const name = tag.name.trim().toLowerCase();
    if (name && !tagByName.has(name)) tagByName.set(name, tag);
  }

  const matchedTags: ReplacementMetadataReview['matchedTags'] = [];
  const unmatchedKeywords: string[] = [];
  for (const keyword of evidence.keywordStrings) {
    let matched: Tag | undefined;
    for (const variant of keywordVariants(keyword)) {
      matched = tagByName.get(variant.toLowerCase());
      if (matched) break;
    }
    if (matched?.docId) {
      matchedTags.push({
        keyword,
        tagId: matched.docId,
        name: matched.name,
        dimension: matched.dimension,
      });
    } else {
      unmatchedKeywords.push(keyword);
    }
  }

  const conflicts: ReplacementMetadataConflict[] = [];
  const caption = evidence.caption.trim();
  const confirmedCaption = media.caption?.trim() ?? '';
  if (caption && confirmedCaption && caption !== confirmedCaption) {
    conflicts.push({
      field: 'caption',
      label: 'Caption differs',
      confirmedValue: confirmedCaption,
      replacementEvidence: caption,
    });
  }

  if (
    evidence.capturedAt &&
    media.dimensionReview?.when?.reviewed &&
    media.temporal &&
    !capturedDateMatchesTemporal(evidence.capturedAt, media.temporal)
  ) {
    conflicts.push({
      field: 'when',
      label: 'Embedded date differs from confirmed When',
      confirmedValue: formatTemporalValueLong(media.temporal),
      replacementEvidence: formatCapturedAt(evidence.capturedAt),
    });
  }

  const assignedTags = new Set(media.tags ?? []);
  for (const dimension of ['who', 'what', 'when', 'where'] as const) {
    const review = media.dimensionReview?.[dimension];
    if (!review?.reviewed) continue;
    const incoming = matchedTags
      .filter((match) => match.dimension === dimension)
      .flatMap((match) => {
        const tag = tagById.get(match.tagId);
        return tag ? [tag] : [];
      });
    if (incoming.length === 0) continue;
    const current = [...assignedTags]
      .flatMap((id) => {
        const tag = tagById.get(id);
        return tag?.dimension === dimension ? [tag] : [];
      });
    const materiallyDifferent = incoming.filter(
      (candidate) => !current.some((existing) => tagsAreRelated(candidate, existing))
    );
    if (materiallyDifferent.length === 0) continue;
    if (current.length === 0 && !review.resolution) continue;
    conflicts.push({
      field: dimension,
      label: `Embedded keyword differs from confirmed ${dimension[0].toUpperCase() + dimension.slice(1)}`,
      confirmedValue: review.resolution
        ? review.resolution === 'not_applicable' ? 'Not applicable' : 'Unknown'
        : current.map((tag) => tag.name).join(', '),
      replacementEvidence: materiallyDifferent.map((tag) => tag.name).join(', '),
    });
  }

  return {
    evidence: {
      ...(caption ? { caption } : {}),
      ...(evidence.capturedAt ? { capturedAt: evidence.capturedAt } : {}),
      ...(evidence.gps ? { gps: evidence.gps } : {}),
      keywords: evidence.keywordStrings,
    },
    matchedTags,
    unmatchedKeywords,
    conflicts,
    ...(evidence.infrastructureError ? { readIssue: evidence.infrastructureError } : {}),
  };
}
