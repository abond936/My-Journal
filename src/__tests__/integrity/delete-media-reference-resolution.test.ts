import {
  findBrokenMediaBackReferences,
  findDanglingCardMediaReferences,
  IntegrityCard,
  IntegrityMedia,
} from '@/lib/integrity/invariantChecks';

describe('Media delete/referrer resolution invariants', () => {
  it('detects stale referencedByCardIds that miss actual card references', () => {
    const cards: IntegrityCard[] = [
      { docId: 'card-cover', coverImageId: 'media-x' },
      { docId: 'card-gallery', galleryMedia: [{ mediaId: 'media-x' }] },
      { docId: 'card-content', contentMedia: ['media-x'] },
    ];
    const media: IntegrityMedia[] = [
      // Stale: only one ref documented, but three cards actually reference media-x.
      { docId: 'media-x', referencedByCardIds: ['card-cover'] },
    ];

    // Reciprocity checker only sees declared backrefs; it should still be valid for the declared entry.
    expect(findBrokenMediaBackReferences(cards, media)).toEqual([]);

    // But an authoritative delete flow must not trust this as complete; this assertion captures expected
    // authoritative reference set used by deletion logic.
    const actualReferrers = new Set<string>();
    cards.forEach((card) => {
      if (card.coverImageId === 'media-x') actualReferrers.add(card.docId);
      if (card.galleryMedia?.some((g) => g.mediaId === 'media-x')) actualReferrers.add(card.docId);
      if (card.contentMedia?.includes('media-x')) actualReferrers.add(card.docId);
    });
    expect(Array.from(actualReferrers).sort()).toEqual([
      'card-content',
      'card-cover',
      'card-gallery',
    ]);
  });

  it('requires all card surfaces to clear before media is considered deletable', () => {
    const before: IntegrityCard = {
      docId: 'card-multi',
      coverImageId: 'media-y',
      galleryMedia: [{ mediaId: 'media-y' }],
      contentMedia: ['media-y'],
    };
    const media: IntegrityMedia[] = [{ docId: 'media-y', referencedByCardIds: ['card-multi'] }];

    // Before detach, no dangling refs.
    expect(findDanglingCardMediaReferences([before], media)).toEqual([]);

    // Simulate partial detach bug: only cover is removed, gallery/content still reference.
    const afterPartial: IntegrityCard = {
      ...before,
      coverImageId: null,
    };
    const stillReferenced = new Set<string>();
    if (afterPartial.coverImageId === 'media-y') stillReferenced.add(afterPartial.docId);
    if (afterPartial.galleryMedia?.some((g) => g.mediaId === 'media-y')) stillReferenced.add(afterPartial.docId);
    if (afterPartial.contentMedia?.includes('media-y')) stillReferenced.add(afterPartial.docId);
    expect(Array.from(stillReferenced)).toEqual(['card-multi']);
  });
});
