import { parseRecoverJournalAdminArgs } from '@/lib/scripts/firebase/recover-journal-admin';

jest.mock('@/lib/config/firebase/admin', () => ({
  getAdminApp: jest.fn(),
}));

jest.mock('@/lib/auth/journalUsersFirestore', () => ({
  listJournalUsers: jest.fn(),
  normalizeJournalUsername: (value: string) => value.trim().toLowerCase(),
  updateJournalUser: jest.fn(),
}));

describe('administrator recovery argument gate', () => {
  it('defaults to a non-mutating dry run', () => {
    expect(parseRecoverJournalAdminArgs(['--username=Admin@Example.com'])).toEqual({
      apply: false,
      confirmProject: null,
      username: 'admin@example.com',
    });
  });

  it('requires apply and confirmation to be explicit inputs', () => {
    expect(
      parseRecoverJournalAdminArgs([
        '--username=admin@example.com',
        '--apply',
        '--confirm-project=my-journal-936',
      ])
    ).toEqual({
      apply: true,
      confirmProject: 'my-journal-936',
      username: 'admin@example.com',
    });
  });

  it('rejects unknown arguments so a password cannot be passed accidentally', () => {
    expect(() =>
      parseRecoverJournalAdminArgs(['--username=admin@example.com', '--password=unsafe'])
    ).toThrow('Unknown argument');
  });
});
