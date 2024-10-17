// app/layout.jsx
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { Providers } from './providers'
import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <UserProvider>
          <Providers>
            {children}
          </Providers>
        </UserProvider>
      </body>
    </html>
  );
}
