import type { Card } from '@/lib/types/card';

const mockTransactionGet = jest.fn();
const mockTransactionGetAll = jest.fn();
const mockTransactionUpdate = jest.fn();
const mockGetCardById = jest.fn();

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: () => ({
    firestore: () => ({
      collection: (collectionName: string) => ({
        doc: (id: string) => ({ id, collectionName }),
      }),
      runTransaction: (callback: (value: Record<string, jest.Mock>) => unknown) =>
        callback({
          get: mockTransactionGet,
          getAll: mockTransactionGetAll,
          update: mockTransactionUpdate,
        }),
    }),
  }),
}));

jest.mock('@/lib/firebase/tagService', () => ({
  getAllTags: jest.fn().mockResolvedValue([]),
  updateTagCountsForCard: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/cards/cardReadService', () => ({
  getCardById: (...args: unknown[]) => mockGetCardById(...args),
}));

jest.mock('@/lib/services/cards/cardMutationSupport', () => ({
  syncCardProjection: jest.fn(),
  withCardMutationRetry: (callback: () => unknown) => callback(),
}));

import { updateCardStatus } from '@/lib/services/cards/cardStatusMutationService';
import { ErrorCode } from '@/lib/types/error';

const draftCard = {
  docId: 'card-1',
  status: 'draft',
  what: ['what-family'],
  dimensionReview: {
    who: { reviewed: true },
    what: { reviewed: true },
    when: { reviewed: true },
    where: { reviewed: true },
  },
} as Card;

describe('cardStatusMutationService publication integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCardById.mockResolvedValue({ ...draftCard, status: 'published' });
    mockTransactionGet.mockResolvedValue({
      id: draftCard.docId,
      exists: true,
      data: () => draftCard,
    });
    mockTransactionGetAll.mockResolvedValue([]);
  });

  it('blocks an incomplete draft before writing Published', async () => {
    mockTransactionGet.mockResolvedValue({
      id: draftCard.docId,
      exists: true,
      data: () => ({ ...draftCard, what: [], dimensionReview: undefined }),
    });

    await expect(updateCardStatus(draftCard.docId, 'published')).rejects.toMatchObject({
      code: ErrorCode.CARD_PUBLICATION_INTEGRITY,
    });
    expect(mockTransactionUpdate).not.toHaveBeenCalled();
  });

  it('publishes a draft after the integrity checks pass', async () => {
    await expect(updateCardStatus(draftCard.docId, 'published')).resolves.toMatchObject({
      status: 'published',
    });
    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: draftCard.docId }),
      expect.objectContaining({ status: 'published' })
    );
  });

  it('does not apply the publication gate when returning a Card to Draft', async () => {
    mockTransactionGet.mockResolvedValue({
      id: draftCard.docId,
      exists: true,
      data: () => ({ ...draftCard, status: 'published', what: [], dimensionReview: undefined }),
    });
    mockGetCardById.mockResolvedValue({ ...draftCard, status: 'draft' });

    await expect(updateCardStatus(draftCard.docId, 'draft')).resolves.toMatchObject({
      status: 'draft',
    });
    expect(mockTransactionGetAll).not.toHaveBeenCalled();
  });
});
