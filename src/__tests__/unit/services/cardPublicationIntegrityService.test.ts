import {
  assertCardPublicationIntegrity,
  evaluateCardPublicationIntegrity,
} from '@/lib/services/cards/cardPublicationIntegrityService';
import { ErrorCode, getStatusCodeForError } from '@/lib/types/error';
import type { Card } from '@/lib/types/card';
import type { Media } from '@/lib/types/photo';

const completeReview = {
  who: { reviewed: true },
  what: { reviewed: true },
  when: { reviewed: true },
  where: { reviewed: true },
};

const readyCard = {
  docId: 'card-1',
  status: 'draft',
  what: ['what-family'],
  dimensionReview: completeReview,
} as Card;

describe('cardPublicationIntegrityService', () => {
  it('allows a fully reviewed Card without Media', () => {
    expect(evaluateCardPublicationIntegrity(readyCard, new Map())).toEqual({
      ready: true,
      issues: [],
    });
  });

  it('counts Unknown and Not applicable as completed review', () => {
    const card = {
      ...readyCard,
      dimensionReview: {
        who: { reviewed: false, resolution: 'unknown' },
        what: { reviewed: true },
        when: { reviewed: false, resolution: 'not_applicable' },
        where: { reviewed: false, resolution: 'unknown' },
      },
    } as Card;

    expect(evaluateCardPublicationIntegrity(card, new Map()).ready).toBe(true);
  });

  it('reports overlapping Card and deduplicated Media work', () => {
    const card = {
      ...readyCard,
      what: [],
      dimensionReview: { who: { reviewed: true } },
      coverImageId: 'media-missing',
      galleryMedia: [
        { mediaId: 'media-review', order: 0 },
        { mediaId: 'media-review', order: 1 },
      ],
      contentMedia: ['media-failed'],
    } as Card;
    const mediaById = new Map<string, Media>([
      [
        'media-review',
        {
          docId: 'media-review',
          dimensionReview: { who: { reviewed: true } },
          readiness: { overall: 'pending' },
        } as Media,
      ],
      [
        'media-failed',
        {
          docId: 'media-failed',
          dimensionReview: completeReview,
          readiness: { overall: 'failed' },
        } as Media,
      ],
    ]);

    expect(evaluateCardPublicationIntegrity(card, mediaById)).toEqual({
      ready: false,
      issues: [
        { code: 'card-dimension-review', dimensions: ['what', 'when', 'where'] },
        { code: 'card-meaningful-what' },
        { code: 'media-missing', mediaIds: ['media-missing'] },
        {
          code: 'media-dimension-review',
          media: [{ mediaId: 'media-review', dimensions: ['what', 'when', 'where'] }],
        },
        {
          code: 'media-readiness',
          media: [
            { mediaId: 'media-review', status: 'pending' },
            { mediaId: 'media-failed', status: 'failed' },
          ],
        },
      ],
    });
  });

  it('allows unclassified Cards when Card classification is not required', () => {
    const card = { ...readyCard, what: [], dimensionReview: undefined } as Card;

    expect(
      evaluateCardPublicationIntegrity(card, new Map(), { media: true, cards: false })
    ).toEqual({ ready: true, issues: [] });
  });

  it('allows unreviewed referenced Media when Media classification is not required', () => {
    const card = { ...readyCard, coverImageId: 'media-1' } as Card;
    const mediaById = new Map<string, Media>([
      ['media-1', { docId: 'media-1', readiness: { overall: 'ready' } } as Media],
    ]);

    expect(
      evaluateCardPublicationIntegrity(card, mediaById, { media: false, cards: true })
    ).toEqual({ ready: true, issues: [] });
  });

  it('always enforces Media existence and readiness', () => {
    const card = {
      ...readyCard,
      what: [],
      dimensionReview: undefined,
      coverImageId: 'media-missing',
      contentMedia: ['media-pending'],
    } as Card;
    const mediaById = new Map<string, Media>([
      ['media-pending', { docId: 'media-pending', readiness: { overall: 'pending' } } as Media],
    ]);

    expect(
      evaluateCardPublicationIntegrity(card, mediaById, { media: false, cards: false })
    ).toEqual({
      ready: false,
      issues: [
        { code: 'media-missing', mediaIds: ['media-missing'] },
        {
          code: 'media-readiness',
          media: [{ mediaId: 'media-pending', status: 'pending' }],
        },
      ],
    });
  });

  it('throws a stable conflict with structured issue details', () => {
    try {
      assertCardPublicationIntegrity({ ...readyCard, what: [] }, new Map());
      throw new Error('Expected publication integrity to block the Card.');
    } catch (error) {
      expect(error).toMatchObject({
        code: ErrorCode.CARD_PUBLICATION_INTEGRITY,
        details: { issues: [{ code: 'card-meaningful-what' }] },
      });
      expect(getStatusCodeForError((error as { code: ErrorCode }).code)).toBe(409);
    }
  });
});
