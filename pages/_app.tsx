// pages/_app.js
import { AppProps } from 'next/app';
import '../app/globals.css'; // Example import for global styles
import { SessionProvider } from 'next-auth/react';

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}