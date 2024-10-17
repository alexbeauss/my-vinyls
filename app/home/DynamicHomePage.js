"use client";
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ClientHome from './ClientHome';
import DynamicProfilePage from '../components/DynamicProfilePage';
import AlbumDetails from '../components/AlbumDetails';
import Navbar from '../components/Navbar';

export default function DynamicHomePage() {
  const { user, error, isLoading } = useUser();
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/api/auth/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error.message}</div>;
  if (!user) return null;

  const handleAlbumClick = (albumId) => {
    setSelectedAlbumId(albumId);
  };

  const handleCloseAlbumDetails = () => {
    setSelectedAlbumId(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar user={user} onProfileClick={() => setShowProfile(true)} />
      
      <main className="w-full max-w-7xl mx-auto px-4 py-8">
        {showProfile ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg max-w-2xl w-full max-h-screen overflow-auto">
              <button onClick={() => setShowProfile(false)} className="float-right text-2xl">&times;</button>
              <DynamicProfilePage />
            </div>
          </div>
        ) : selectedAlbumId ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg max-w-4xl w-full max-h-screen overflow-auto">
              <button onClick={handleCloseAlbumDetails} className="float-right text-2xl">&times;</button>
              <AlbumDetails albumId={selectedAlbumId} />
            </div>
          </div>
        ) : (
          <ClientHome user={user} onAlbumClick={handleAlbumClick} />
        )}
      </main>
    </div>
  );
}
