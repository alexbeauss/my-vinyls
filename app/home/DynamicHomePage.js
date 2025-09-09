"use client";
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import ClientHome from './ClientHome';
import DynamicProfilePage from '../components/DynamicProfilePage';
import AlbumDetails from '../components/AlbumDetails';
import Navbar from '../components/Navbar';

export default function DynamicHomePage() {
  const { user, error, isLoading } = useUser();
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const clientHomeRef = useRef(null);

  // Debug logs
  useEffect(() => {
    console.log('selectedAlbumId changed:', selectedAlbumId);
  }, [selectedAlbumId]);

  // Empêcher le scroll quand une modale est ouverte
  useEffect(() => {
    if (showProfile || selectedAlbumId || isSearchOpen) {
      // Empêcher le scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restaurer le scroll
      document.body.style.overflow = 'unset';
    }

    // Cleanup function pour restaurer le scroll quand le composant se démonte
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showProfile, selectedAlbumId, isSearchOpen]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/api/auth/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error.message}</div>;
  if (!user) return null;

  const handleAlbumClick = (albumId) => {
    console.log('Album clicked:', albumId);
    setSelectedAlbumId(albumId);
  };

  const handleCloseAlbumDetails = () => {
    setSelectedAlbumId(null);
  };

  const handleAlbumDataUpdate = (albumId) => {
    if (clientHomeRef.current) {
      clientHomeRef.current.updateAlbumData(albumId);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-100 dark:bg-gray-900 ${(showProfile || selectedAlbumId || isSearchOpen) ? 'overflow-hidden' : ''}`}>
      <Navbar 
        user={user} 
        onProfileClick={() => setShowProfile(true)} 
        onSearchToggle={setIsSearchOpen}
      />
      
      <main className={`w-full max-w-7xl mx-auto px-4 py-8 transition-all duration-300 ${(showProfile || selectedAlbumId || isSearchOpen) ? 'blur-sm' : ''}`}>
        {/* Collection toujours affichée */}
        <ClientHome ref={clientHomeRef} user={user} onAlbumClick={handleAlbumClick} />
      </main>
      
      {/* Overlay pour empêcher les clics sur la collection quand une modale est ouverte */}
      {(showProfile || selectedAlbumId || isSearchOpen) && (
        <div className="fixed inset-0 z-40 pointer-events-none"></div>
      )}
      
      {/* Modale profil */}
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl max-w-2xl w-full max-h-screen overflow-auto relative shadow-2xl">
            <button 
              onClick={() => setShowProfile(false)} 
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 group"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <DynamicProfilePage />
          </div>
        </div>
      )}
      
      {/* Modale album */}
      {selectedAlbumId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl max-w-6xl w-full max-h-screen overflow-auto relative shadow-2xl">
            <button 
              onClick={handleCloseAlbumDetails} 
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 group"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <AlbumDetails albumId={selectedAlbumId} onDataUpdate={handleAlbumDataUpdate} />
          </div>
        </div>
      )}
    </div>
  );
}
