"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const Scanner = dynamic(() => import('../components/Scanner'), { ssr: false });

export default function ClientHome({ user }) {
  const [discogsCollection, setDiscogsCollection] = useState(null);
  const [randomAlbum, setRandomAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('artist'); // 'artist' ou 'year'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' ou 'desc'
  const itemsPerPage = 100;

  useEffect(() => {
    async function fetchDiscogsData() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/discogs?page=${currentPage}&per_page=${itemsPerPage}`);
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des données Discogs');
        }
        const data = await response.json();
        setDiscogsCollection(data.collection);
        
        // Logique pour l'album du jour (inchangée)
        const today = new Date().toDateString();
        const storedAlbum = localStorage.getItem('randomAlbum');
        const storedDate = localStorage.getItem('randomAlbumDate');

        if (storedAlbum && storedDate === today) {
          setRandomAlbum(JSON.parse(storedAlbum));
        } else {
          const randomIndex = Math.floor(Math.random() * data.collection.releases.length);
          const newRandomAlbum = data.collection.releases[randomIndex];
          setRandomAlbum(newRandomAlbum);
          localStorage.setItem('randomAlbum', JSON.stringify(newRandomAlbum));
          localStorage.setItem('randomAlbumDate', today);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDiscogsData();
  }, [currentPage]);

  const totalPages = discogsCollection ? Math.ceil(discogsCollection.pagination.items / itemsPerPage) : 0;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleSort = (criteria) => {
    if (sortBy === criteria) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(criteria);
      setSortOrder('asc');
    }
  };

  const sortedReleases = discogsCollection?.releases.sort((a, b) => {
    if (sortBy === 'artist') {
      const artistA = a.basic_information.artists[0].name.toLowerCase();
      const artistB = b.basic_information.artists[0].name.toLowerCase();
      return sortOrder === 'asc' ? artistA.localeCompare(artistB) : artistB.localeCompare(artistA);
    } else if (sortBy === 'year') {
      const yearA = a.basic_information.year || 0;
      const yearB = b.basic_information.year || 0;
      return sortOrder === 'asc' ? yearA - yearB : yearB - yearA;
    }
    return 0;
  });

  return (
    <div className="container mx-auto px-4">
      
      
      {/* Section "À écouter aujourd'hui" */}
      {randomAlbum && (
        <div className="mb-8 p-4 bg-gray-100 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">À écouter aujourd&apos;hui</h2>
          <div className="flex items-center">
            <div className="w-32 h-32 relative mr-4">
              <Image
                src={randomAlbum.basic_information.cover_image}
                alt={`Pochette de ${randomAlbum.basic_information.title}`}
                layout="fill"
                objectFit="cover"
                className="rounded shadow"
              />
            </div>
            
            <div>
              <h3 className="font-bold">{randomAlbum.basic_information.title}</h3>
              <p>{randomAlbum.basic_information.artists[0].name}</p>
              <p className="text-sm text-gray-600">Année : {randomAlbum.basic_information.year || 'N/A'}</p>
              <p className="text-sm text-gray-600">Genre : {randomAlbum.basic_information.genres.join(', ') || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}
      <h1 className="text-2xl font-bold mt-8 mb-4">Ma collection</h1>

      {isLoading && <p>Chargement de votre collection...</p>}
      {error && <p className="text-red-500">Erreur : {error}</p>}
      {discogsCollection && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p>Nombre total d&apos;éléments : {discogsCollection.pagination.items}</p>
            <div>
              <button 
                onClick={() => handleSort('artist')} 
                className={`mr-2 px-3 py-1 rounded ${sortBy === 'artist' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Trier par artiste {sortBy === 'artist' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                onClick={() => handleSort('year')} 
                className={`px-3 py-1 rounded ${sortBy === 'year' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Trier par année {sortBy === 'year' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {sortedReleases.map((release) => (
              <div key={release.id} className="border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="relative w-full pb-[100%]">
                  <Image
                    src={release.basic_information.cover_image}
                    alt={`Pochette de ${release.basic_information.title}`}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="p-4 bg-white">
                  <h3 className="font-bold text-sm truncate">{release.basic_information.artists[0].name}</h3>
                  <p className="text-sm text-gray-600 truncate">{release.basic_information.title}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Année : {release.basic_information.year || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    Genre : {release.basic_information.genres.join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Précédent
              </button>
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Suivant
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
