import { diagnoseTypesenseProjection } from '@/lib/services/typesenseReconciliation';
import { clearRecentTypesenseSyncFailures, recordTypesenseSyncFailure } from '@/lib/services/typesenseSync';

jest.mock('@/lib/config/typesense', () => ({
  isTypesenseConfigured: jest.fn(() => true),
  getTypesenseClient: jest.fn(),
}));

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(() => ({
    firestore: jest.fn(() => ({
      collection: jest.fn(),
    })),
  })),
}));

import { getTypesenseClient, isTypesenseConfigured } from '@/lib/config/typesense';
import { getAdminApp } from '@/lib/config/firebase/admin';

const mockedGetTypesenseClient = getTypesenseClient as jest.MockedFunction<typeof getTypesenseClient>;
const mockedIsTypesenseConfigured = isTypesenseConfigured as jest.MockedFunction<typeof isTypesenseConfigured>;
const mockedGetAdminApp = getAdminApp as jest.MockedFunction<typeof getAdminApp>;

function mockCollection(docs: Array<{ id: string }>, orderedDocs?: Array<{ id: string }>) {
  const fullSnap = {
    size: docs.length,
    docs: docs.map((doc) => ({ id: doc.id, data: () => ({}) })),
  };
  const orderedSnap = {
    docs: (orderedDocs ?? docs).map((doc) => ({ id: doc.id, data: () => ({}) })),
  };

  return {
    get: jest.fn().mockResolvedValue(fullSnap),
    orderBy: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(orderedSnap),
      }),
    }),
    doc: jest.fn((id: string) => ({
      get: jest.fn().mockResolvedValue({ exists: docs.some((doc) => doc.id === id) }),
    })),
  };
}

describe('typesenseReconciliation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRecentTypesenseSyncFailures();
    mockedIsTypesenseConfigured.mockReturnValue(true);
  });

  it('reports healthy when counts and samples match', async () => {
    const cards = mockCollection([{ id: 'c1' }, { id: 'c2' }]);
    const media = mockCollection([{ id: 'm1' }]);

    mockedGetAdminApp.mockReturnValue({
      firestore: jest.fn(() => ({
        collection: jest.fn((name: string) => (name === 'cards' ? cards : media)),
      })),
    } as never);

    mockedGetTypesenseClient.mockReturnValue({
      collections: jest.fn((name: string) => ({
        retrieve: jest.fn().mockResolvedValue({
          num_documents: name === 'cards' ? 2 : 1,
        }),
        documents: jest.fn(() => ({
          retrieve: jest.fn().mockResolvedValue({ id: 'ok' }),
          search: jest.fn().mockResolvedValue({
            hits: (name === 'cards'
              ? [{ document: { id: 'c1' } }, { document: { id: 'c2' } }]
              : [{ document: { id: 'm1' } }]),
          }),
        })),
      })),
    } as never);

    const report = await diagnoseTypesenseProjection({ sampleSize: 10 });
    expect(report.configured).toBe(true);
    expect(report.healthy).toBe(true);
    expect(report.cards?.countDelta).toBe(0);
    expect(report.media?.countDelta).toBe(0);
  });

  it('reports unhealthy when recent sync failures exist', async () => {
    mockedIsTypesenseConfigured.mockReturnValue(false);
    recordTypesenseSyncFailure({
      entity: 'card',
      id: 'c-bad',
      operation: 'upsert',
      message: 'failed',
    });

    const report = await diagnoseTypesenseProjection();
    expect(report.configured).toBe(false);
    expect(report.healthy).toBe(false);
    expect(report.recentSyncFailures).toHaveLength(1);
  });
});
