import { authorizeCredentials } from '@/lib/auth/authorizeCredentials';
import { authorizeJournalUserCredentials } from '@/lib/auth/journalUsersFirestore';

jest.mock('@/lib/auth/journalUsersFirestore', () => ({
  authorizeJournalUserCredentials: jest.fn(),
}));

const authorizeJournalUserCredentialsMock = jest.mocked(authorizeJournalUserCredentials);

describe('authorizeCredentials', () => {
  const originalAdminEmail = process.env.ADMIN_EMAIL;
  const originalAdminPassword = process.env.ADMIN_PASSWORD;

  beforeEach(() => {
    authorizeJournalUserCredentialsMock.mockReset();
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'legacy-plaintext-password';
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = originalAdminEmail;
    process.env.ADMIN_PASSWORD = originalAdminPassword;
  });

  it('returns a session user when journal_users credentials match', async () => {
    authorizeJournalUserCredentialsMock.mockResolvedValue({
      docId: 'user-1',
      username: 'admin',
      displayName: 'Admin',
      role: 'admin',
    });

    await expect(authorizeCredentials('admin', 'correct-password')).resolves.toEqual({
      id: 'user-1',
      name: 'Admin',
      email: 'admin@journal.local',
      role: 'admin',
    });
  });

  it('does not fall back to ADMIN_EMAIL / ADMIN_PASSWORD when journal_users rejects credentials', async () => {
    authorizeJournalUserCredentialsMock.mockResolvedValue(null);

    await expect(
      authorizeCredentials('admin@example.com', 'legacy-plaintext-password')
    ).resolves.toBeNull();
    expect(authorizeJournalUserCredentialsMock).toHaveBeenCalledWith(
      'admin@example.com',
      'legacy-plaintext-password'
    );
  });

  it('rejects empty credentials without calling Firestore authorize', async () => {
    await expect(authorizeCredentials('', '')).resolves.toBeNull();
    expect(authorizeJournalUserCredentialsMock).not.toHaveBeenCalled();
  });
});
