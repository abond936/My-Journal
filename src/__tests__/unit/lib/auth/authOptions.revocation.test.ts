import { getJournalUserByDocId } from '@/lib/auth/journalUsersFirestore';

jest.mock('@/lib/config/firebase/admin', () => ({ getAdminApp: jest.fn(() => ({})) }));
jest.mock('firebase-admin/firestore', () => ({ getFirestore: jest.fn(() => ({})) }));
jest.mock('@auth/firebase-adapter', () => ({ FirestoreAdapter: jest.fn(() => ({})) }), {
  virtual: true,
});
jest.mock('@/lib/auth/journalUsersFirestore', () => ({
  getJournalUserByDocId: jest.fn(),
}));
jest.mock('@/lib/auth/authorizeCredentials', () => ({ authorizeCredentials: jest.fn() }));

import { authOptions } from '@/lib/auth/authOptions';

const getJournalUserByDocIdMock = jest.mocked(getJournalUserByDocId);
const jwtCallback = authOptions.callbacks!.jwt!;
const sessionCallback = authOptions.callbacks!.session!;

describe('JWT account revocation', () => {
  beforeEach(() => getJournalUserByDocIdMock.mockReset());

  it('refreshes active role from account truth', async () => {
    getJournalUserByDocIdMock.mockResolvedValue({
      docId: 'reader-1', username: 'reader', displayName: 'Reader', role: 'viewer',
      disabled: false, createdAt: 1, updatedAt: 1,
    });

    const token = await jwtCallback({ token: { sub: 'reader-1', role: 'viewer' } } as never);

    expect(token).toMatchObject({ role: 'viewer', accessRevoked: false });
  });

  it.each([
    ['disabled', { docId: 'reader-1', username: 'reader', displayName: 'Reader', role: 'viewer' as const, disabled: true, createdAt: 1, updatedAt: 2 }],
    ['missing', null],
  ])('revokes an existing token when the account is %s', async (_label, row) => {
    getJournalUserByDocIdMock.mockResolvedValue(row);

    const token = await jwtCallback({ token: { sub: 'reader-1', role: 'viewer' } } as never);

    expect(token).toMatchObject({ accessRevoked: true });
    expect(token.role).toBeUndefined();
  });

  it('fails closed when account truth cannot be read', async () => {
    getJournalUserByDocIdMock.mockRejectedValue(new Error('Firestore unavailable'));

    const token = await jwtCallback({ token: { sub: 'reader-1', role: 'viewer' } } as never);

    expect(token).toMatchObject({ accessRevoked: true });
    expect(token.role).toBeUndefined();
  });

  it('projects revoked access into the client session', async () => {
    const session = await sessionCallback({
      session: { user: { name: 'Reader', email: 'reader@journal.local' }, expires: 'future' },
      token: { sub: 'reader-1', accessRevoked: true },
    } as never);

    expect(session.user).toMatchObject({ id: 'reader-1', accessRevoked: true });
    expect(session.user.role).toBeUndefined();
  });
});
