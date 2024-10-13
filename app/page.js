// app/page.js
import { getSession } from '@auth0/nextjs-auth0';
import Link from 'next/link';

export default async function Home() {
  const session = await getSession();

  return (
    <div>
      <h1>Bienvenue</h1>
      {session ? (
        <div>
          <p>Connecté en tant que {session.user.name}</p>
          <Link href="/home">Aller à la page d&apos;accueil</Link>
        </div>
      ) : (
        <Link href="/api/auth/login">Se connecter</Link>
      )}
    </div>
  );
}
