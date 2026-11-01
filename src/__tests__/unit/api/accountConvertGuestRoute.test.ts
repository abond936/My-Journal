import { POST } from '@/app/api/account/convert-guest/route';
import { requireApiSession } from '@/lib/api/routeEnvelope';
import { convertGuestRecipientToAccount } from '@/lib/auth/journalUsersFirestore';

jest.mock('@/lib/api/routeEnvelope', () => {
  const response = (data: unknown, status = 200) => ({
    status,
    json: async () => data,
  });
  return {
    requireApiSession: jest.fn(),
    apiRouteSuccess: (data: unknown, status?: number) => response(data, status),
    apiRouteError: (input: { code: string; message: string; status: number }) => response({
      ok: false, code: input.code, message: input.message,
    }, input.status),
    apiRouteInternalError: (code: string, message: string) => response({
      ok: false, code, message,
    }, 500),
  };
});
jest.mock('@/lib/auth/journalUsersFirestore', () => ({
  convertGuestRecipientToAccount: jest.fn(),
}));

const requireSession = requireApiSession as jest.MockedFunction<typeof requireApiSession>;
const convertGuest = convertGuestRecipientToAccount as jest.MockedFunction<typeof convertGuestRecipientToAccount>;

describe('/api/account/convert-guest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireSession.mockResolvedValue({ session: { user: { id: 'guest-1', role: 'viewer' } } as never });
  });

  it('converts only the signed-in recipient with a valid password', async () => {
    convertGuest.mockResolvedValue({
      docId: 'guest-1', username: 'guest@example.com', displayName: 'Guest', role: 'viewer',
      disabled: false, accessKind: 'account', createdAt: 1, updatedAt: 2,
    });
    const response = await POST({ json: async () => ({ password: 'new-password' }) } as never);
    expect(response.status).toBe(200);
    expect(convertGuest).toHaveBeenCalledWith('guest-1', 'new-password');
    await expect(response.json()).resolves.toMatchObject({
      ok: true, username: 'guest@example.com', accessKind: 'account',
    });
  });

  it('rejects a short password without changing the recipient', async () => {
    const response = await POST({ json: async () => ({ password: 'short' }) } as never);
    expect(response.status).toBe(400);
    expect(convertGuest).not.toHaveBeenCalled();
  });

  it('rejects an account that is not an eligible guest', async () => {
    convertGuest.mockRejectedValue(new Error('This recipient is not eligible for guest conversion'));
    const response = await POST({ json: async () => ({ password: 'new-password' }) } as never);
    expect(response.status).toBe(409);
  });
});
