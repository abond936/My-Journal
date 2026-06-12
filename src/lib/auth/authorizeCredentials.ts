import { authorizeJournalUserCredentials } from '@/lib/auth/journalUsersFirestore';

export async function authorizeCredentials(
  usernameRaw: string,
  password: string
): Promise<{ id: string; name: string; email: string; role: string } | null> {
  const username = usernameRaw.trim();
  if (!username || !password) {
    return null;
  }

  const fromDb = await authorizeJournalUserCredentials(username, password);
  if (!fromDb) {
    return null;
  }

  return {
    id: fromDb.docId,
    name: fromDb.displayName,
    email: `${fromDb.username}@journal.local`,
    role: fromDb.role,
  };
}
