import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import { JWT } from "next-auth/jwt"; // Import the JWT type from next-auth
import { Session } from "next-auth"; // Import the Session type

// Initialize Prisma Client
const prisma = new PrismaClient();

// Extend the Session type to include userId
declare module "next-auth" {
  interface Session {
    userId: string; // Add the userId field to the session
  }
}

// Define the authOptions object
export const authOptions = {
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
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",  // Adjust based on your domain setup
        path: "/",
      },
    },
  },
  
  session: {
    strategy: 'jwt', // Using JWT strategy
    maxAge: 30 * 24 * 60 * 60, // Session will expire after 30 days
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      // Persist user information in the JWT token on sign-in
      if (user) {
        token.userId = String(user.id); // Attach user ID to the JWT token
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Attach userId from the token to the session
      if (token && typeof token.userId === 'string') {
        session.userId = token.userId;
      } else {
        console.error('No userId found in token:', token);
      }
  
      // Log the session object for debugging purposes
      console.log('Session:', session);
  
      return session;
    },
  },
};

// Export NextAuth using authOptions
export default NextAuth(authOptions);