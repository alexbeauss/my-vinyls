"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import AlbumDetails from './AlbumDetails';

export default function SearchModal({ isOpen, onClose, discogsCollection }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);

  const filteredReleases = searchQuery.length > 2 
    ? discogsCollection?.filter(release => 
        release.basic_information.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        release.basic_information.artists[0].name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleReleaseClick = (release) => {
    setSelectedAlbumId(release.id);
  };

  // Réinitialiser la sélection quand la modale se ferme
  useEffect(() => {
    if (!isOpen) {
      setSelectedAlbumId(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className={`bg-white dark:bg-gray-800 w-full ${selectedAlbumId ? 'max-w-6xl max-h-screen overflow-auto' : 'max-w-2xl'} rounded-xl shadow-2xl p-8 relative`}>
        {/* Bouton de fermeture repositionné */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 group"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {!selectedAlbumId ? (
          <>
            <div className="mb-4 pr-12">
              <h2 className="text-xl font-bold dark:text-white">Rechercher</h2>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un vinyle..."
              className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              autoFocus
            />
            <div className="mt-4 max-h-96 overflow-y-auto">
              {searchQuery.length > 2 && (
                <div className="space-y-2">
                  {filteredReleases?.map(release => (
                    <div
                      key={release.id}
                      onClick={() => handleReleaseClick(release)}
                      className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                    >
                      <Image
                        src={release.basic_information.thumb || '/vinyl-placeholder.png'}
                        alt={release.basic_information.title}
                        width={50}
                        height={50}
                        className="rounded"
                      />
                      <div className="ml-3">
                        <div className="font-medium dark:text-white">
                          {release.basic_information.artists[0].name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {release.basic_information.title}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredReleases?.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                      Aucun résultat trouvé
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div>
            <div className="mb-4 pr-12">
              <button 
                onClick={() => setSelectedAlbumId(null)}
                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center font-medium transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Retour
              </button>
            </div>
            <AlbumDetails albumId={selectedAlbumId} />
          </div>
        )}
      </div>
    </div>
  );
} 