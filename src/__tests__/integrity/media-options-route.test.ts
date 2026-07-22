import { getServerSession } from 'next-auth/next';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }));
jest.mock('@/lib/config/firebase/admin', () => ({ getAdminApp: jest.fn() }));

import { getAdminApp } from '@/lib/config/firebase/admin';
import { GET } from '@/app/api/media/options/route';

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedAdmin = getAdminApp as jest.MockedFunction<typeof getAdminApp>;

describe('GET /api/media/options', () => {
  it('returns distinct full-library batch and folder choices', async () => {
    mockedSession.mockResolvedValue({ user: { role: 'admin' } } as never);
    const get = jest.fn().mockResolvedValue({
      docs: [
        { data: () => ({ importBatchId: 'batch-2', sourcePath: '/Trips/Charleston/a.jpg' }) },
        { data: () => ({ importBatchId: 'batch-1', sourcePath: '/Family/Home/b.jpg' }) },
        { data: () => ({ importBatchId: 'batch-2', sourcePath: '/Trips/Charleston/c.jpg' }) },
      ],
    });
    const select = jest.fn().mockReturnValue({ get });
    mockedAdmin.mockReturnValue({
      firestore: () => ({ collection: () => ({ select }) }),
    } as never);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.batchIds).toEqual(['batch-2', 'batch-1']);
    expect(payload.folders).toEqual(['Charleston', 'Home']);
  });
});
