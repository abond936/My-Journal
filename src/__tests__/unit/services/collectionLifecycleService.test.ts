const mockGetAuthorSettings = jest.fn();
const mockGetAttention = jest.fn();

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({ firestore: jest.fn() })),
}));
jest.mock('@/lib/services/authorSettingsService', () => ({
  getAuthorSettings: (...args: unknown[]) => mockGetAuthorSettings(...args),
}));
jest.mock('@/lib/services/publicationReadinessService', () => ({
  getCollectionPublicationAttention: (...args: unknown[]) => mockGetAttention(...args),
}));

import {
  evaluateCollectionPublicationIntegrity,
  updateCollectionLifecycle,
} from '@/lib/services/collections/collectionLifecycleService';
import { ErrorCode } from '@/lib/types/error';

const readyAttention = {
  collectionId: 'collection-1',
  title: 'Family Stories',
  lifecycle: 'draft' as const,
  requiredCards: 1,
  missingRequiredCards: 0,
  draftCards: 0,
  cardsNeedingDimensionReview: 0,
  cardsMissingMeaningfulWhat: 0,
  referencedMedia: 1,
  missingMedia: 0,
  mediaNeedingDimensionReview: 0,
  mediaReadiness: { ready: 1, pending: 0, failed: 0, unassessed: 0 },
  audienceSelectionState: 'all_enabled' as const,
};

function fakeFirestore(lifecycle: 'draft' | 'published' = 'draft') {
  let record = {
    title: 'Family Stories', lifecycle, recordState: 'active',
    structureRevision: 3, authorityRevision: 1, order: 10, createdAt: 1, updatedAt: 10,
  };
  const ref = { id: 'collection-1' };
  const snapshot = () => ({ id: ref.id, exists: true, data: () => record });
  const update = jest.fn((_target: unknown, fields: Record<string, unknown>) => {
    record = { ...record, ...fields } as typeof record;
  });
  const firestore = {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({ ...ref, get: jest.fn(async () => snapshot()) })),
    })),
    runTransaction: jest.fn(async (callback: (transaction: unknown) => unknown) => callback({
      get: jest.fn(async () => snapshot()),
      update,
    })),
  };
  return { firestore: firestore as never, update, record: () => record };
}

describe('collectionLifecycleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthorSettings.mockResolvedValue({ classificationRequirements: { media: true, cards: true } });
    mockGetAttention.mockResolvedValue(readyAttention);
  });

  it('reports every blocking publication-integrity area', () => {
    expect(evaluateCollectionPublicationIntegrity({
      ...readyAttention,
      requiredCards: 0,
      missingRequiredCards: 2,
      draftCards: 1,
      cardsNeedingDimensionReview: 1,
      cardsMissingMeaningfulWhat: 1,
      missingMedia: 1,
      mediaNeedingDimensionReview: 1,
      mediaReadiness: { ready: 0, pending: 1, failed: 1, unassessed: 1 },
      audienceSelectionState: 'legacy_all_enabled',
    })).toEqual([
      { code: 'content-empty' },
      { code: 'audience-unconfirmed' },
      { code: 'cards-missing', count: 2 },
      { code: 'cards-draft', count: 1 },
      { code: 'card-dimension-review', count: 1 },
      { code: 'card-meaningful-what', count: 1 },
      { code: 'media-missing', count: 1 },
      { code: 'media-dimension-review', count: 1 },
      { code: 'media-readiness', count: 3 },
    ]);
  });

  it('publishes a ready active Collection through the lifecycle owner', async () => {
    const fake = fakeFirestore();
    await expect(updateCollectionLifecycle({
      collectionId: 'collection-1', lifecycle: 'published', firestore: fake.firestore, now: 20,
    })).resolves.toMatchObject({ lifecycle: 'published', updatedAt: 20 });
    expect(mockGetAttention).toHaveBeenCalledWith(
      'collection-1', fake.firestore, { media: true, cards: true }
    );
    expect(fake.update).toHaveBeenCalledWith(expect.anything(), { lifecycle: 'published', updatedAt: 20 });
  });

  it('blocks publication without explicit audience confirmation', async () => {
    mockGetAttention.mockResolvedValue({ ...readyAttention, audienceSelectionState: 'legacy_all_enabled' });
    const fake = fakeFirestore();
    await expect(updateCollectionLifecycle({
      collectionId: 'collection-1', lifecycle: 'published', firestore: fake.firestore,
    })).rejects.toMatchObject({
      code: ErrorCode.COLLECTION_PUBLICATION_INTEGRITY,
      details: { issues: [{ code: 'audience-unconfirmed' }] },
    });
    expect(fake.update).not.toHaveBeenCalled();
  });

  it('returns a Published Collection to Draft without applying publication readiness', async () => {
    const fake = fakeFirestore('published');
    await expect(updateCollectionLifecycle({
      collectionId: 'collection-1', lifecycle: 'draft', firestore: fake.firestore, now: 30,
    })).resolves.toMatchObject({ lifecycle: 'draft', updatedAt: 30 });
    expect(mockGetAttention).not.toHaveBeenCalled();
    expect(fake.record()).toMatchObject({ lifecycle: 'draft', updatedAt: 30 });
  });
});
