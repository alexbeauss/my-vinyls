import NextAuth, { NextAuthOptions, User as NextAuthUser, Account as NextAuthAccount } from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';
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

// Define the authOptions object with AWS Cognito
export const authOptions: NextAuthOptions = {
  debug: true, // Enable debug logs
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID || '', // Cognito Client ID
      clientSecret: process.env.COGNITO_CLIENT_SECRET || '', // Cognito Client Secret
      issuer: process.env.COGNITO_ISSUER || '', // Cognito User Pool Domain
      authorization: {
        params: {
          scope: "openid profile email", // Scope to request from Cognito
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