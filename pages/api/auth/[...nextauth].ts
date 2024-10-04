import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Define the authOptions object
export const authOptions = {
  debug: true, // Enable debug logs
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
    async jwt({ token, user }) {
      // Persist user information in the JWT token on sign in
      if (user) {
        token.userId = user.id;
      }
      // Log the token to verify that userId is being set correctly
      console.log('JWT Token:', token);
      return token; // Ensure the token is returned
    },
    async session({ session, token }) {
      // Attach userId from the token to the session
      if (token && token.userId) {
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