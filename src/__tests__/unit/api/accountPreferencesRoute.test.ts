import { GET, PATCH } from '@/app/api/account/preferences/route';
import { requireApiSession } from '@/lib/api/routeEnvelope';
import {
  getJournalUserByDocId,
  updateJournalUserThemeMode,
} from '@/lib/auth/journalUsersFirestore';

jest.mock('@/lib/api/routeEnvelope', () => ({ requireApiSession: jest.fn() }));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));
jest.mock('@/lib/auth/journalUsersFirestore', () => ({
  getJournalUserByDocId: jest.fn(),
  updateJournalUserThemeMode: jest.fn(),
}));

const requireSession = requireApiSession as jest.MockedFunction<typeof requireApiSession>;
const getUser = getJournalUserByDocId as jest.MockedFunction<typeof getJournalUserByDocId>;
const updateTheme = updateJournalUserThemeMode as jest.MockedFunction<typeof updateJournalUserThemeMode>;

const account = {
  docId: 'reader-1', username: 'reader', displayName: 'Reader', role: 'viewer' as const,
  disabled: false, createdAt: 1, updatedAt: 2, readerThemeMode: 'dark' as const,
};

describe('/api/account/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireSession.mockResolvedValue({ session: { user: { id: 'reader-1', role: 'viewer' } } as never });
  });

  it('reads only the signed-in account preference', async () => {
    getUser.mockResolvedValue(account);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalledWith('reader-1');
    await expect(response.json()).resolves.toMatchObject({ ok: true, readerThemeMode: 'dark' });
  });

  it('writes only the signed-in account preference', async () => {
    updateTheme.mockResolvedValue({ ...account, readerThemeMode: 'light' });
    const request = { json: async () => ({ readerThemeMode: 'light', userId: 'someone-else' }) };
    const response = await PATCH(request as never);
    expect(response.status).toBe(200);
    expect(updateTheme).toHaveBeenCalledWith('reader-1', 'light');
  });

  it('rejects unsupported appearance values', async () => {
    const request = { json: async () => ({ readerThemeMode: 'sepia' }) };
    const response = await PATCH(request as never);
    expect(response.status).toBe(400);
    expect(updateTheme).not.toHaveBeenCalled();
  });
});
