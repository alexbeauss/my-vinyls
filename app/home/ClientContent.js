"use client";
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Scanner = dynamic(() => import('../components/scanner'), { ssr: false });

export default function ClientContent({ user }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div>Chargement...</div>;
  }

  return (
    <div>
      <h1>Bienvenue sur la page d'accueil, {user.name} !</h1>
      <p>Email : {user.email}</p>
      <a href="/api/auth/logout">Déconnexion</a>
      <Scanner />
    </div>
  );
}