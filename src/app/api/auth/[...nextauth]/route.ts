import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { FirestoreAdapter } from '@auth/firebase-adapter';
import { getAdminApp } from '@/lib/config/firebase/admin';
import { getFirestore } from 'firebase-admin/firestore';

const app = getAdminApp();
const db = getFirestore(app);

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // This is a basic authorization for development.
        // It checks against environment variables.
        // In a production environment, you would look up the user in your database.
        const isAdminUser = credentials?.username === process.env.ADMIN_EMAIL &&
                            credentials?.password === process.env.ADMIN_PASSWORD;

        if (isAdminUser) {
          // For the admin user, we'll create a user object.
          // The adapter will automatically create this user in Firestore if they don't exist.
          return {
            id: 'admin', // A static ID for the single admin user
            name: process.env.ADMIN_EMAIL,
            email: process.env.ADMIN_EMAIL, // FirestoreAdapter may still require email
            role: 'admin',
          };
        }
        
        // If credentials are not valid, return null.
        return null;
      }
    })
  ],
  adapter: FirestoreAdapter(db),
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }: { token: any, user: any }) {
      // Add role to the JWT token
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: any, token: any }) {
      // Add role to the session object
      if (session?.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 