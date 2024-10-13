"use client";
import { useUser } from '@auth0/nextjs-auth0/client';
import dynamic from 'next/dynamic';

const Scanner = dynamic(() => import('../components/Scanner'), { ssr: false });

export default function ClientHome() {
  const { user, error, isLoading } = useUser();

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>{error.message}</div>;
  if (!user) return null; // L'utilisateur sera redirigé côté serveur si non authentifié

  return (
    <div>
      <h1>Bienvenue sur la page d'accueil, {user.name} !</h1>
      <Scanner />
      <a href="/api/auth/logout">Déconnexion</a>
    </div>
  );
}
