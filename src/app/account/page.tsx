import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { getJournalUserByDocId } from '@/lib/auth/journalUsersFirestore';
import { isAuthenticatedSession } from '@/lib/auth/readerAccess';
import { buildLoginRedirectPath } from '@/lib/utils/marketingRoutes';
import PersonalSettingsClient from '@/app/settings/PersonalSettingsClient';

export default async function AccountPage() {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!isAuthenticatedSession(session) || !session.user.id) {
    redirect(buildLoginRedirectPath('/account'));
  }

  const account = await getJournalUserByDocId(session.user.id);
  if (!account || account.disabled) {
    redirect(buildLoginRedirectPath('/account'));
  }

  return (
    <PersonalSettingsClient
      account={{
        username: account.username,
        displayName: account.displayName,
        role: account.role,
      }}
    />
  );
}
