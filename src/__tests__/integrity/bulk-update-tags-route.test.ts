import { getServerSession } from 'next-auth';
import { bulkApplyTagDelta, bulkUpdateTags } from '@/lib/services/cardService';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

jest.mock('@/lib/services/cardService', () => ({
  bulkApplyTagDelta: jest.fn(),
  bulkUpdateTags: jest.fn(),
}));

import { POST } from '@/app/api/cards/bulk-update-tags/route';

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedBulkApplyTagDelta = bulkApplyTagDelta as jest.MockedFunction<typeof bulkApplyTagDelta>;
const mockedBulkUpdateTags = bulkUpdateTags as jest.MockedFunction<typeof bulkUpdateTags>;

describe('POST /api/cards/bulk-update-tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 when session is not admin', async () => {
    mockedGetServerSession.mockResolvedValueOnce(null as any);

    const req = {
      json: async () => ({ cardIds: ['c1'], addTagIds: ['t1'], removeTagIds: [] }),
    } as Request;

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(mockedBulkApplyTagDelta).not.toHaveBeenCalled();
    expect(mockedBulkUpdateTags).not.toHaveBeenCalled();
  });

  it('uses replacement mode when tags[] is provided', async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { role: 'admin' } } as any);

    const req = {
      json: async () => ({ cardIds: ['c1', 'c2'], tags: ['tA', 'tB'] }),
    } as Request;

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedBulkUpdateTags).toHaveBeenCalledWith(['c1', 'c2'], ['tA', 'tB']);
    expect(mockedBulkApplyTagDelta).not.toHaveBeenCalled();
    expect(payload.mode).toBe('replace');
  });

  it('uses narrow add/remove bulk delta path when addTagIds/removeTagIds are provided', async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: { role: 'admin' } } as any);

    const req = {
      json: async () => ({
        cardIds: ['c1', 'c2', 'c3'],
        addTagIds: ['t-add'],
        removeTagIds: ['t-remove'],
      }),
    } as Request;

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(mockedBulkApplyTagDelta).toHaveBeenCalledWith(
      ['c1', 'c2', 'c3'],
      ['t-add'],
      ['t-remove']
    );
    expect(mockedBulkUpdateTags).not.toHaveBeenCalled();
    expect(payload.mode).toBe('add-remove');
  });
});
