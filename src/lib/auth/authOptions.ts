import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { FirestoreAdapter } from '@auth/firebase-adapter';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getJournalUserByDocId } from '@/lib/auth/journalUsersFirestore';
import { authorizeCredentials } from '@/lib/auth/authorizeCredentials';

const app = getAdminApp();
const db = getFirestore(app);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        return authorizeCredentials(credentials?.username ?? '', credentials?.password ?? '');
      },
    }),
  ],
  adapter: FirestoreAdapter(db),
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && 'role' in user) {
        token.role = (user as { role?: string }).role;
        token.accessRevoked = false;
      }
      // JWT possession alone is not authorization. Refresh account truth on every
      // server-backed session read so disabling an account revokes existing tokens.
      if (token.sub) {
        try {
          const row = await getJournalUserByDocId(token.sub);
          token.accessRevoked = !row || row.disabled;
          token.role = row && !row.disabled ? row.role : undefined;
        } catch {
          // Fail closed while Firestore account truth cannot be established.
          token.accessRevoked = true;
          token.role = undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        const u = session.user as { role?: string; id?: string; accessRevoked?: boolean };
        u.role = token.role as string | undefined;
        u.accessRevoked = token.accessRevoked === true;
        if (token.sub) {
          u.id = token.sub;
        }
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
