import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { FirestoreAdapter } from '@auth/firebase-adapter';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';
import {
  authorizeJournalUserCredentials,
  hasJournalUserWithUsername,
  normalizeJournalUsername,
} from '@/lib/auth/journalUsersFirestore';

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
        const username = credentials?.username?.trim() ?? '';
        const password = credentials?.password ?? '';

        if (!username || !password) {
          return null;
        }

        const fromDb = await authorizeJournalUserCredentials(username, password);
        if (fromDb) {
          const emailLocal = `${fromDb.username}@journal.local`;
          return {
            id: fromDb.docId,
            name: fromDb.displayName,
            email: emailLocal,
            role: fromDb.role,
          };
        }

        const legacyEmail = process.env.ADMIN_EMAIL?.trim() ?? '';
        const legacyPassword = process.env.ADMIN_PASSWORD ?? '';
        const legacyMatch =
          !!legacyEmail &&
          !!legacyPassword &&
          normalizeJournalUsername(username) === normalizeJournalUsername(legacyEmail) &&
          password === legacyPassword;

        if (!legacyMatch) {
          return null;
        }

        const journalRowExists = await hasJournalUserWithUsername(legacyEmail);
        if (journalRowExists) {
          return null;
        }

        return {
          id: 'admin',
          name: legacyEmail,
          email: legacyEmail,
          role: 'admin',
        };
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
