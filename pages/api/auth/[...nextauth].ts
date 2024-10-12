import NextAuth, { NextAuthOptions, User as NextAuthUser, Account as NextAuthAccount } from 'next-auth';
import Auth0Provider from 'next-auth/providers/auth0';
import { Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';

// Extend the Session and JWT types to include custom fields
declare module 'next-auth' {
  interface Session {
    userId: string;
    token: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    accessToken: string;
  }
}

// Define the authOptions object with Auth0
export const authOptions: NextAuthOptions = {
  debug: true, // Enable debug logs
  providers: [
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID || '', // Auth0 Client ID
      clientSecret: process.env.AUTH0_CLIENT_SECRET || '', // Auth0 Client Secret
      issuer: process.env.AUTH0_ISSUER || '', // Auth0 Issuer URL
      authorization: {
        params: {
          scope: "openid profile email", // Scope to request from Auth0
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET, // Secret for signing tokens
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpsOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      },
    },
  },
  session: {
    strategy: 'jwt', // Use JWT strategy for session
    maxAge: 30 * 24 * 60 * 60, // Session expires after 30 days
  },
  callbacks: {
    async jwt({
      token,
      user,
      account,
    }: {
      token: JWT;
      user?: NextAuthUser;
      account?: NextAuthAccount | null;
    }) {
      if (user && account) {
        token.userId = user.id; // Add userId to JWT token
        token.accessToken = account.access_token || ''; // Add access token to JWT
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.userId = token.userId; // Add userId to session
      session.token = token.accessToken || ''; // Add access token to session
      return session;
    },
  },
};

// Export NextAuth using authOptions
export default NextAuth(authOptions);