import {
  IntegrityCard,
  IntegrityMedia,
  IntegrityTag,
  computeExpectedDerivedFromTags,
  findBrokenMediaBackReferences,
  findDanglingCardMediaReferences,
  findDerivedFieldViolations,
} from '@/lib/integrity/invariantChecks';

function makeTagLookup(tags: IntegrityTag[]): Map<string, IntegrityTag> {
  return new Map(tags.map((t) => [t.docId, t]));
}

describe('Integrity gate invariants', () => {
  it('validates card -> media references resolve for cover/gallery/content', () => {
    const cards: IntegrityCard[] = [
      {
        docId: 'card-a',
        coverImageId: 'media-1',
        galleryMedia: [{ mediaId: 'media-2' }],
        contentMedia: ['media-3'],
      },
      {
        docId: 'card-b',
        coverImageId: 'missing-media',
      },
    ];
    const media: IntegrityMedia[] = [{ docId: 'media-1' }, { docId: 'media-2' }, { docId: 'media-3' }];

    const violations = findDanglingCardMediaReferences(cards, media);
    expect(violations).toEqual([
      { cardId: 'card-b', mediaId: 'missing-media', field: 'coverImageId' },
    ]);
  });

  it('validates media.referencedByCardIds reciprocity against card references', () => {
    const cards: IntegrityCard[] = [
      { docId: 'card-a', coverImageId: 'media-1' },
      { docId: 'card-b', galleryMedia: [{ mediaId: 'media-2' }] },
    ];
    const media: IntegrityMedia[] = [
      { docId: 'media-1', referencedByCardIds: ['card-a'] },
      // card-a does not reference media-2, so this should fail reciprocity.
      { docId: 'media-2', referencedByCardIds: ['card-a'] },
      // card-c does not exist, so this should fail as dangling backref.
      { docId: 'media-3', referencedByCardIds: ['card-c'] },
    ];

    const violations = findBrokenMediaBackReferences(cards, media);
    expect(violations).toEqual([
      { mediaId: 'media-2', cardId: 'card-a', reason: 'card-missing-reference' },
      { mediaId: 'media-3', cardId: 'card-c', reason: 'missing-card' },
    ]);
  });

  it('validates tag derived fields stay consistent across representative mutation flow', () => {
    const tags: IntegrityTag[] = [
      { docId: 'who-root', dimension: 'who' },
      { docId: 'who-child', dimension: 'who', parentId: 'who-root', path: ['who-root'] },
      { docId: 'what-root', dimension: 'what' },
      { docId: 'reflection-child', dimension: 'reflection', parentId: 'what-root', path: ['what-root'] },
    ];
    const tagLookup = makeTagLookup(tags);

    // Create (published with who-child)
    const createDerived = computeExpectedDerivedFromTags(['who-child'], tagLookup);
    const createdCard: IntegrityCard = {
      docId: 'card-flow',
      status: 'published',
      tags: ['who-child'],
      filterTags: Object.fromEntries(createDerived.filterTagIds.map((id) => [id, true])),
      who: createDerived.who,
      what: createDerived.what,
      when: createDerived.when,
      where: createDerived.where,
    };
    expect(findDerivedFieldViolations(createdCard, tagLookup)).toEqual([]);

    // Update (published with reflection-child, verify reflection -> what mapping)
    const updateDerived = computeExpectedDerivedFromTags(['reflection-child'], tagLookup);
    const updatedCard: IntegrityCard = {
      ...createdCard,
      tags: ['reflection-child'],
      filterTags: Object.fromEntries(updateDerived.filterTagIds.map((id) => [id, true])),
      who: updateDerived.who,
      what: updateDerived.what,
      when: updateDerived.when,
      where: updateDerived.where,
    };
    expect(findDerivedFieldViolations(updatedCard, tagLookup)).toEqual([]);

    // Negative assertion: stale derived fields are detected.
    const staleCard: IntegrityCard = {
      ...updatedCard,
      what: [],
    };
    const staleViolations = findDerivedFieldViolations(staleCard, tagLookup);
    expect(staleViolations).toEqual([
      {
        cardId: 'card-flow',
        field: 'what',
        expected: ['reflection-child', 'what-root'],
        actual: [],
      },
    ]);
  });
});
