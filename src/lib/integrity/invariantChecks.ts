type Dimension = 'who' | 'what' | 'when' | 'where' | 'reflection';

export type IntegrityTag = {
  docId: string;
  dimension?: Dimension;
  parentId?: string;
  path?: string[];
};

export type IntegrityCard = {
  docId: string;
  status?: 'draft' | 'published';
  coverImageId?: string | null;
  galleryMedia?: Array<{ mediaId?: string }>;
  contentMedia?: string[];
  tags?: string[];
  filterTags?: Record<string, boolean>;
  who?: string[];
  what?: string[];
  when?: string[];
  where?: string[];
};

export type IntegrityMedia = {
  docId: string;
  referencedByCardIds?: string[];
};

export type CardMediaViolation = {
  cardId: string;
  mediaId: string;
  field: 'coverImageId' | 'galleryMedia' | 'contentMedia';
};

export type MediaBackrefViolation = {
  mediaId: string;
  cardId: string;
  reason: 'missing-card' | 'card-missing-reference';
};

export type DerivedFieldViolation = {
  cardId: string;
  field: 'filterTags' | 'who' | 'what' | 'when' | 'where';
  expected: string[];
  actual: string[];
};

function normalizeDimension(dim: Dimension | undefined): 'who' | 'what' | 'when' | 'where' | undefined {
  if (!dim) return undefined;
  if (dim === 'reflection') return 'what';
  return dim;
}

function unique(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v))));
}

export function collectCardMediaReferences(card: IntegrityCard): Array<{ mediaId: string; field: CardMediaViolation['field'] }> {
  const refs: Array<{ mediaId: string; field: CardMediaViolation['field'] }> = [];
  if (card.coverImageId) refs.push({ mediaId: card.coverImageId, field: 'coverImageId' });
  for (const item of card.galleryMedia || []) {
    if (item?.mediaId) refs.push({ mediaId: item.mediaId, field: 'galleryMedia' });
  }
  for (const mediaId of card.contentMedia || []) {
    if (mediaId) refs.push({ mediaId, field: 'contentMedia' });
  }
  return refs;
}

export function findDanglingCardMediaReferences(cards: IntegrityCard[], media: IntegrityMedia[]): CardMediaViolation[] {
  const mediaIds = new Set(media.map((m) => m.docId));
  const violations: CardMediaViolation[] = [];

  for (const card of cards) {
    for (const ref of collectCardMediaReferences(card)) {
      if (!mediaIds.has(ref.mediaId)) {
        violations.push({ cardId: card.docId, mediaId: ref.mediaId, field: ref.field });
      }
    }
  }

  return violations;
}

export function findBrokenMediaBackReferences(cards: IntegrityCard[], media: IntegrityMedia[]): MediaBackrefViolation[] {
  const cardMap = new Map(cards.map((c) => [c.docId, c]));
  const violations: MediaBackrefViolation[] = [];

  for (const m of media) {
    for (const cardId of m.referencedByCardIds || []) {
      const card = cardMap.get(cardId);
      if (!card) {
        violations.push({ mediaId: m.docId, cardId, reason: 'missing-card' });
        continue;
      }
      const cardRefIds = new Set(collectCardMediaReferences(card).map((r) => r.mediaId));
      if (!cardRefIds.has(m.docId)) {
        violations.push({ mediaId: m.docId, cardId, reason: 'card-missing-reference' });
      }
    }
  }

  return violations;
}

export function computeExpectedDerivedFromTags(
  directTagIds: string[],
  tagLookup: Map<string, IntegrityTag>
): { filterTagIds: string[]; who: string[]; what: string[]; when: string[]; where: string[] } {
  const expanded = new Set<string>();

  const enqueueAncestors = (tagId: string) => {
    const tag = tagLookup.get(tagId);
    if (!tag) return;
    if (Array.isArray(tag.path) && tag.path.length > 0) {
      for (const ancestorId of tag.path) expanded.add(ancestorId);
      return;
    }

    let cur: IntegrityTag | undefined = tag;
    const seen = new Set<string>();
    while (cur && cur.parentId && !seen.has(cur.parentId)) {
      seen.add(cur.parentId);
      expanded.add(cur.parentId);
      cur = tagLookup.get(cur.parentId);
    }
  };

  for (const id of directTagIds) {
    if (!id) continue;
    expanded.add(id);
    enqueueAncestors(id);
  }

  const byDim: Record<'who' | 'what' | 'when' | 'where', string[]> = {
    who: [],
    what: [],
    when: [],
    where: [],
  };

  for (const id of expanded) {
    const dim = normalizeDimension(tagLookup.get(id)?.dimension);
    if (!dim) continue;
    byDim[dim].push(id);
  }

  return {
    filterTagIds: Array.from(expanded),
    who: unique(byDim.who),
    what: unique(byDim.what),
    when: unique(byDim.when),
    where: unique(byDim.where),
  };
}

function sorted(values: string[] | undefined): string[] {
  return [...(values || [])].sort((a, b) => a.localeCompare(b));
}

export function findDerivedFieldViolations(card: IntegrityCard, tagLookup: Map<string, IntegrityTag>): DerivedFieldViolation[] {
  const expected = computeExpectedDerivedFromTags(card.tags || [], tagLookup);
  const actualFilterIds = Object.entries(card.filterTags || {})
    .filter(([, enabled]) => enabled === true)
    .map(([id]) => id);

  const violations: DerivedFieldViolation[] = [];
  const pushIfDifferent = (
    field: DerivedFieldViolation['field'],
    expectedValues: string[],
    actualValues: string[]
  ) => {
    const exp = sorted(expectedValues);
    const act = sorted(actualValues);
    if (exp.length !== act.length || exp.some((v, i) => v !== act[i])) {
      violations.push({ cardId: card.docId, field, expected: exp, actual: act });
    }
  };

  pushIfDifferent('filterTags', expected.filterTagIds, actualFilterIds);
  pushIfDifferent('who', expected.who, card.who || []);
  pushIfDifferent('what', expected.what, card.what || []);
  pushIfDifferent('when', expected.when, card.when || []);
  pushIfDifferent('where', expected.where, card.where || []);

  return violations;
}
