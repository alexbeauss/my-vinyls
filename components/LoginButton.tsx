// components/LoginButton.tsx
import { signIn, signOut, useSession } from 'next-auth/react';

export default function LoginButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div>
        <p>Connecté en tant que {session.user?.name}</p>
        <button onClick={() => signOut()}>Se déconnecter</button>
      </div>
    );
  } else {
    return (
      <div>
        <p>Vous n&apos;êtes pas connecté.</p> {/* Escaped apostrophe */}
        <button onClick={() => signIn('google')} className="button">Se connecter avec Google</button>
      </div>
    );
  }
}