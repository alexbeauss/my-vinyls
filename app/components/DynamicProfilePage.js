"use client";
import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import MoodSlider from './MoodSlider';

export default function DynamicProfilePage() {
  const { user, error, isLoading } = useUser();
  const [discogsUsername, setDiscogsUsername] = useState('');
  const [discogsToken, setDiscogsToken] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [mood, setMood] = useState(5);

  useEffect(() => {
    async function loadDiscogsCredentials() {
      try {
        const response = await fetch('/api/user-discogs-credentials');
        if (response.ok) {
          const data = await response.json();
          setDiscogsUsername(data.username || '');
          setDiscogsToken(data.token || '');
          setMood(data.mood || 5);
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
        body: JSON.stringify({ username: discogsUsername, token: discogsToken, mood }),
      });
      if (response.ok) {
        setSaveStatus('Identifiants Discogs et humeur sauvegardés avec succès !');
      } else {
        throw new Error('Erreur lors de la sauvegarde des identifiants Discogs et de l\'humeur');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setSaveStatus('Erreur lors de la sauvegarde des identifiants Discogs et de l\'humeur.');
    }
  };

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <div className="container mx-auto p-4 dark:bg-gray-900 dark:text-white">
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
            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="discogsToken" className="block mb-2">Token Discogs</label>
          <input
            type="password"
            id="discogsToken"
            value={discogsToken}
            onChange={(e) => setDiscogsToken(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        <MoodSlider initialMood={mood} onMoodChange={setMood} />
        
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">
          Sauvegarder les identifiants Discogs et l&apos;humeur
        </button>
      </form>
      {saveStatus && <p className="mt-4 text-center font-bold dark:text-white">{saveStatus}</p>}
    </div>
  );
}
