// app/layout.jsx
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { Providers } from './providers'
import './globals.css'

export const metadata = {
  title: 'MyVinyls',
  description: 'Votre collection de vinyles personnalisée avec critiques IA',
};

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
