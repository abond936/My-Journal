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
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user && 'role' in user) {
        token.role = (user as { role?: string }).role;
      }
      // Legacy JWTs may omit `role`; backfill so admin layout and client session agree.
      if (!token.role && token.sub) {
        if (token.sub === 'admin') {
          token.role = 'admin';
        } else {
          try {
            const row = await getJournalUserByDocId(token.sub);
            if (row?.role) token.role = row.role;
          } catch {
            /* ignore */
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        const u = session.user as { role?: string; id?: string };
        u.role = token.role as string | undefined;
        if (token.sub) {
          u.id = token.sub;
        }
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
