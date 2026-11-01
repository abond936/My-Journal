import {
  evaluateCollectionPublicationAttention,
  evaluateCollectionPublicationAttentionDetails,
} from '@/lib/services/publicationReadinessService';

const completeReview = {
  who: { reviewed: true },
  what: { reviewed: true },
  when: { reviewed: true },
  where: { reviewed: true },
};

describe('publicationReadinessService', () => {
  it('reports overlapping Collection publication work without changing draft validity', () => {
    const result = evaluateCollectionPublicationAttention({
      structure: {
        collection: {
          docId: 'collection-1',
          title: 'Family Stories',
          lifecycle: 'draft',
          recordState: 'active',
          introductionCardId: 'card-a',
          structureRevision: 0,
          authorityRevision: 1,
          order: 0,
          createdAt: 1,
          updatedAt: 1,
        },
        placements: [
          {
            docId: 'placement-a',
            collectionId: 'collection-1',
            cardId: 'card-a',
            role: 'chapter',
            order: 0,
            createdAt: 1,
            updatedAt: 1,
          },
          {
            docId: 'placement-b',
            collectionId: 'collection-1',
            cardId: 'card-b',
            role: 'card',
            parentPlacementId: 'placement-a',
            order: 0,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        cards: [
          {
            docId: 'card-a',
            title: 'Introduction',
            status: 'draft',
            coverImageId: 'media-a',
            galleryMedia: [{ mediaId: 'media-missing', order: 0 }],
            contentMedia: ['media-a'],
            dimensionReview: { who: { reviewed: true } },
            what: [],
          },
          {
            docId: 'card-b',
            title: 'Ready story',
            status: 'published',
            galleryMedia: [{ mediaId: 'media-b', order: 0 }],
            dimensionReview: completeReview,
            what: ['what-1'],
          },
        ],
      } as never,
      media: [
        {
          docId: 'media-a',
          dimensionReview: { who: { reviewed: true } },
        },
        {
          docId: 'media-b',
          dimensionReview: completeReview,
          readiness: { overall: 'ready' },
        },
      ] as never,
    });

    expect(result).toEqual({
      collectionId: 'collection-1',
      title: 'Family Stories',
      lifecycle: 'draft',
      requiredCards: 2,
      missingRequiredCards: 0,
      draftCards: 1,
      cardsNeedingDimensionReview: 1,
      cardsMissingMeaningfulWhat: 1,
      referencedMedia: 3,
      missingMedia: 1,
      mediaNeedingDimensionReview: 1,
      mediaReadiness: { ready: 1, pending: 0, failed: 0, unassessed: 1 },
      audienceSelectionState: 'legacy_all_enabled',
    });
  });

  it.each([
    [{ allContacts: true, groupIds: [], contactIds: [] }, 'all_enabled'],
    [{ allContacts: false, groupIds: ['family'], contactIds: [] }, 'selected'],
    [{ allContacts: false, groupIds: [], contactIds: [] }, 'none'],
  ] as const)('reports the authored Collection audience state for %j', (audience, expected) => {
    const result = evaluateCollectionPublicationAttention({
      structure: {
        collection: {
          docId: 'collection-1', title: 'Family Stories', lifecycle: 'draft', recordState: 'active',
          structureRevision: 0, authorityRevision: 0, order: 0, createdAt: 1, updatedAt: 1, audience,
        },
        placements: [],
        cards: [],
      },
      media: [],
    });
    expect(result.audienceSelectionState).toBe(expected);
  });

  it('counts Unknown and Not applicable as completed dimensional review', () => {
    const result = evaluateCollectionPublicationAttention({
      structure: {
        collection: {
          docId: 'collection-1',
          title: 'Family Stories',
          lifecycle: 'draft',
          recordState: 'active',
          structureRevision: 0,
          authorityRevision: 0,
          order: 0,
          createdAt: 1,
          updatedAt: 1,
        },
        placements: [{
          docId: 'placement-a',
          collectionId: 'collection-1',
          cardId: 'card-a',
          role: 'card',
          order: 0,
          createdAt: 1,
          updatedAt: 1,
        }],
        cards: [{
          docId: 'card-a',
          title: 'Resolved story',
          status: 'draft',
          what: ['what-1'],
          dimensionReview: {
            who: { reviewed: false, resolution: 'unknown' },
            what: { reviewed: true },
            when: { reviewed: false, resolution: 'not_applicable' },
            where: { reviewed: false, resolution: 'unknown' },
          },
        }],
      } as never,
      media: [],
    });

    expect(result.cardsNeedingDimensionReview).toBe(0);
    expect(result.cardsMissingMeaningfulWhat).toBe(0);
  });

  it('does not report optional classification as required Collection attention', () => {
    const result = evaluateCollectionPublicationAttention({
      structure: {
        collection: {
          docId: 'collection-1',
          title: 'Family Stories',
          lifecycle: 'draft',
          recordState: 'active',
          structureRevision: 0,
          authorityRevision: 0,
          order: 0,
          createdAt: 1,
          updatedAt: 1,
        },
        placements: [{
          docId: 'placement-a',
          collectionId: 'collection-1',
          cardId: 'card-a',
          role: 'card',
          order: 0,
          createdAt: 1,
          updatedAt: 1,
        }],
        cards: [{
          docId: 'card-a',
          title: 'Unclassified story',
          status: 'draft',
          what: [],
          coverImageId: 'media-a',
        }],
      } as never,
      media: [{ docId: 'media-a', readiness: { overall: 'ready' } }] as never,
      classificationRequirements: { media: false, cards: false },
    });

    expect(result.cardsNeedingDimensionReview).toBe(0);
    expect(result.cardsMissingMeaningfulWhat).toBe(0);
    expect(result.mediaNeedingDimensionReview).toBe(0);
  });

  it('produces exact read-only exception queues with owning Card and Media references', () => {
    const details = evaluateCollectionPublicationAttentionDetails({
      structure: {
        collection: {
          docId: 'collection-1', title: 'Family Stories', lifecycle: 'draft', recordState: 'active',
          introductionCardId: 'card-missing', structureRevision: 0, authorityRevision: 0,
          order: 0, createdAt: 1, updatedAt: 1,
        },
        placements: [{
          docId: 'placement-a', collectionId: 'collection-1', cardId: 'card-a', role: 'card',
          order: 0, createdAt: 1, updatedAt: 1,
        }],
        cards: [{
          docId: 'card-a', title: 'A day at the beach', status: 'draft', what: [],
          coverImageId: 'media-a', contentMedia: ['media-missing'],
          dimensionReview: { who: { reviewed: true } },
        }],
      } as never,
      media: [{
        docId: 'media-a', filename: 'beach.jpg',
        dimensionReview: { who: { reviewed: true } },
        readiness: { overall: 'failed' },
      }] as never,
    });

    expect(details.missingRequiredCardIds).toEqual(['card-missing']);
    expect(details.draftCards).toEqual([expect.objectContaining({ cardId: 'card-a' })]);
    expect(details.cardsNeedingDimensionReview[0]).toEqual(expect.objectContaining({
      cardId: 'card-a',
      incompleteDimensions: ['what', 'when', 'where'],
    }));
    expect(details.cardsMissingMeaningfulWhat).toHaveLength(1);
    expect(details.missingMedia).toEqual([{
      mediaId: 'media-missing',
      referencedByCards: [{ cardId: 'card-a', title: 'A day at the beach' }],
    }]);
    expect(details.mediaNeedingDimensionReview[0]).toEqual(expect.objectContaining({
      mediaId: 'media-a',
      label: 'beach.jpg',
      incompleteDimensions: ['what', 'when', 'where'],
    }));
    expect(details.mediaReadinessAttention[0]).toEqual(expect.objectContaining({
      mediaId: 'media-a',
      readiness: 'failed',
    }));
  });
});
