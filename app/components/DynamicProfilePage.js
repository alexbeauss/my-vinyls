"use client";
import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';

export default function DynamicProfilePage() {
  const { user, error, isLoading } = useUser();
  const [discogsUsername, setDiscogsUsername] = useState('');
  const [discogsToken, setDiscogsToken] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    async function loadDiscogsCredentials() {
      try {
        const response = await fetch('/api/user-discogs-credentials');
        if (response.ok) {
          const data = await response.json();
          setDiscogsUsername(data.username || '');
          setDiscogsToken(data.token || '');
        } else if (response.status === 404) {
          console.log('Aucun identifiant Discogs trouvé pour cet utilisateur.');
        } else {
          throw new Error('Erreur lors de la récupération des identifiants Discogs');
        }
      } catch (error) {
        console.error('Erreur:', error);
        setSaveStatus('Erreur lors du chargement des identifiants Discogs.');
      }
    }
    loadDiscogsCredentials();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('Sauvegarde en cours...');
    try {
      const response = await fetch('/api/user-discogs-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: discogsUsername, token: discogsToken }),
      });
      if (response.ok) {
        setSaveStatus('Identifiants Discogs sauvegardés avec succès !');
      } else {
        throw new Error('Erreur lors de la sauvegarde des identifiants Discogs');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setSaveStatus('Erreur lors de la sauvegarde des identifiants Discogs.');
    }
  };

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Profil</h1>
      <p>Nom : {user.name}</p>
      <p>Email : {user.email}</p>
      
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="mb-4">
          <label htmlFor="discogsUsername" className="block mb-2">Utilisateur Discogs</label>
          <input
            type="text"
            id="discogsUsername"
            value={discogsUsername}
            onChange={(e) => setDiscogsUsername(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="discogsToken" className="block mb-2">Token Discogs</label>
          <input
            type="password"
            id="discogsToken"
            value={discogsToken}
            onChange={(e) => setDiscogsToken(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Sauvegarder les identifiants Discogs
        </button>
      </form>
      {saveStatus && <p className="mt-4 text-center font-bold">{saveStatus}</p>}
    </div>
  );
}
