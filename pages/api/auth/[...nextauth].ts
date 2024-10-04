import NextAuth, { NextAuthOptions, User as NextAuthUser, Account as NextAuthAccount } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import { JWT } from 'next-auth/jwt'; // Import the JWT type from next-auth
import { Session } from 'next-auth'; // Import the Session type

// Initialize Prisma Client
const prisma = new PrismaClient();

// Extend the Session type to include userId and token
declare module 'next-auth' {
  interface Session {
    userId: string; // Add the userId field to the session
    token: string; // Add token field to be a string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string; // Ensure userId is available in the JWT
    accessToken: string; // Add accessToken to the JWT type
  }
}



// Define the authOptions object with explicit type
export const authOptions: NextAuthOptions = {
  debug: true, // Enable debug logs
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  adapter: PrismaAdapter(prisma), // Use Prisma to store users
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpsOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Adjust based on your domain setup
        path: '/',
      },
    },
  },
  session: {
    strategy: 'jwt', // Using JWT strategy
    maxAge: 30 * 24 * 60 * 60, // Session will expire after 30 days
  },
  callbacks: {
    async jwt({
      token,
      user,
      account,
    }: {
      token: JWT;
      user?: NextAuthUser; // Use only NextAuthUser
      account?: NextAuthAccount | null; // Change to Account | null
    }) {
      // Persist user information in the JWT token on sign-in
      if (user && account) {
        token.userId = user.id; // Attach user ID to the JWT token
        token.accessToken = account.access_token || ''; // Attach access token to the JWT
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Attach userId from the token to the session
      session.userId = token.userId;

      // Ensure that the token in the session is a string, not the whole JWT object
      session.token = token.accessToken || ''; // Default to an empty string if accessToken is undefined

      return session;
    },
  },
};

// Export NextAuth using authOptions
export default NextAuth(authOptions);