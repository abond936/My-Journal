const mockGetServerSession = jest.fn();
const mockValidate = jest.fn();
const mockGet = jest.fn();
const mockUpdate = jest.fn();

jest.mock('next-auth/next', () => ({ getServerSession: (...args: unknown[]) => mockGetServerSession(...args) }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/auth/readerAccess', () => ({ isAdminSession: (session: unknown) => Boolean(session) }));
jest.mock('@/lib/services/audienceGroupService', () => ({
  validateAudienceSelectionReferences: (...args: unknown[]) => mockValidate(...args),
}));
jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: () => ({
    firestore: () => ({
      collection: () => ({ doc: () => ({ get: mockGet, update: mockUpdate }) }),
    }),
  }),
}));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { PATCH } from '@/app/api/admin/collections/[id]/audience/route';

const context = { params: Promise.resolve({ id: 'collection-1' }) };

function request(body: unknown) {
  return { json: async () => body } as Request;
}

describe('Collection audience route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: { role: 'admin' } });
    mockGet.mockResolvedValue({ exists: true });
    mockValidate.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
  });

  it('validates references before saving an explicit audience', async () => {
    const audience = { allContacts: false, groupIds: ['family'], contactIds: ['reader-1'] };
    const response = await PATCH(request(audience), context);
    expect(response.status).toBe(200);
    expect(mockValidate).toHaveBeenCalledWith(audience, expect.anything());
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ audience }));
  });

  it('does not write when a selected reference is invalid', async () => {
    mockValidate.mockRejectedValue(new Error('Every selected audience group must still exist.'));
    const response = await PATCH(request({ allContacts: false, groupIds: ['missing'], contactIds: [] }), context);
    expect(response.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
