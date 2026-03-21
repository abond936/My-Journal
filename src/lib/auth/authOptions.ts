import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { FirestoreAdapter } from '@auth/firebase-adapter';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';

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
        const isAdminUser =
          credentials?.username === process.env.ADMIN_EMAIL &&
          credentials?.password === process.env.ADMIN_PASSWORD;

        if (isAdminUser) {
          return {
            id: 'admin',
            name: process.env.ADMIN_EMAIL,
            email: process.env.ADMIN_EMAIL,
            role: 'admin',
          };
        }

        return null;
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
        (session.user as { role?: string }).role = token.role as string | undefined;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
