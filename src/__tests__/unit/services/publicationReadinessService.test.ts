import { evaluateCollectionPublicationAttention } from '@/lib/services/publicationReadinessService';

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
      audienceSelectionAvailable: false,
    });
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
});
