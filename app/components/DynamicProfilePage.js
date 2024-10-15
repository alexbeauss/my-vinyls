"use client";
import { useState, useEffect, useRef } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';

export default function DynamicProfilePage() {
  const { user, error, isLoading } = useUser();
  const [discogsUsername, setDiscogsUsername] = useState('');
  const [discogsToken, setDiscogsToken] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [mood, setMood] = useState(5); // Valeur par défaut au milieu de l'échelle (0 à 10)
  const sliderRef = useRef(null);
  const isDraggingRef = useRef(false);

  const handleMoodChange = (e) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newMood = parseFloat((percentage * 10).toFixed(2));
    setMood(newMood);
  };

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    handleMoodChange(e);
  };

  const handleMouseMove = (e) => {
    if (isDraggingRef.current) {
      handleMoodChange(e);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    async function loadDiscogsCredentials() {
      try {
        const response = await fetch('/api/user-discogs-credentials');
        if (response.ok) {
          const data = await response.json();
          setDiscogsUsername(data.username || '');
          setDiscogsToken(data.token || '');
          setMood(data.mood || 5); // Charger l'humeur, par défaut à 5 si non définie
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
        
        <div className="mb-4">
          <label className="block mb-2">Comment ça va aujourd&apos;hui ?</label>
          <div className="relative h-6">
            <div 
              ref={sliderRef}
              className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 rounded-full cursor-pointer"
              onMouseDown={handleMouseDown}
            ></div>
            <div
              className="absolute top-1/2 w-6 h-6 bg-white border-2 border-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: `${mood * 10}%` }}
              onMouseDown={handleMouseDown}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Pas bien du tout</span>
            <span>Très bien</span>
          </div>
        </div>
        
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Sauvegarder les identifiants Discogs et l&apos;humeur
        </button>
      </form>
      {saveStatus && <p className="mt-4 text-center font-bold">{saveStatus}</p>}
    </div>
  );
}
