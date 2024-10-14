import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await getSession();

  if (session && session.user) {
    // L'utilisateur est connecté, rediriger vers la page d'accueil
    redirect('/home');
  } else {
    // L'utilisateur n'est pas connecté, rediriger vers la page de connexion
    redirect('/api/auth/login');
  }

  // Cette partie ne sera jamais atteinte en raison des redirections,
  // mais Next.js exige un retour pour les composants async
  return null;
}