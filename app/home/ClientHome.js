"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

export default function ClientHome({ onAlbumClick }) {
  const [discogsCollection, setDiscogsCollection] = useState(null);
  const [collectionValue, setCollectionValue] = useState(null);
  const [randomAlbum, setRandomAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('artist');
  const [sortOrder, setSortOrder] = useState('asc');
  const [genreFilters, setGenreFilters] = useState([]);

  useEffect(() => {
    async function fetchDiscogsData() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/discogs');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des données Discogs');
        }
        const data = await response.json();
        
        // Vérification que data est bien un objet
        if (typeof data !== 'object') {
          console.error('Les données reçues ne sont pas un objet:', data);
          throw new Error('Format de données incorrect');
        }

        // Stockage direct des releases et de la valeur de la collection
        setDiscogsCollection(data.releases);
        setCollectionValue(data.collectionValue);
        
        // Mise à jour de la logique de l'album aléatoire
        const today = getTodayDate();
        const storedAlbum = localStorage.getItem('randomAlbum');
        const storedDate = localStorage.getItem('randomAlbumDate');

        if (storedAlbum && storedDate === today) {
          setRandomAlbum(JSON.parse(storedAlbum));
        } else {
          const randomIndex = Math.floor(Math.random() * data.releases.length);
          const newRandomAlbum = data.releases[randomIndex];
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
  }, []);

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const getUniqueGenres = () => {
    if (!discogsCollection) return [];
    const genreCounts = {};
    discogsCollection.forEach(release => {
      if (release.basic_information.styles) {
        release.basic_information.styles.forEach(style => {
          genreCounts[style] = (genreCounts[style] || 0) + 1;
        });
      }
    });
    return Object.entries(genreCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([genre, count]) => ({ genre, count }));
  };

  const handleGenreFilterChange = (genre) => {
    setGenreFilters(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre) 
        : [...prev, genre]
    );
  };

  const sortedAndFilteredReleases = discogsCollection ? 
    [...discogsCollection] // Création d'une copie du tableau pour éviter la mutation
      .filter(release => 
        genreFilters.length === 0 || 
        (release.basic_information.styles && 
         release.basic_information.styles.some(style => genreFilters.includes(style)))
      )
      .sort((a, b) => {
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
      }) : [];

  return (
    <div className="container mx-auto px-4 dark:bg-gray-900 dark:text-white">
      
      {/* Section "À écouter aujourd'hui" */}
      {randomAlbum && (
        <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-3xl font-bold mb-4 dark:text-white">À écouter aujourd&apos;hui</h2>
          <div 
            className="flex items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 rounded-lg p-2"
            onClick={() => onAlbumClick(randomAlbum.id)}
          >
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
              <h3 className="font-bold dark:text-white">{randomAlbum.basic_information.title}</h3>
              <p className="dark:text-gray-300">{randomAlbum.basic_information.artists[0].name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Année : {randomAlbum.basic_information.year || 'N/A'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Genre : {randomAlbum.basic_information.genres.join(', ') || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading && <p className="dark:text-white">Chargement de votre collection...</p>}
      {error && <p className="text-red-500 dark:text-red-400">Erreur : {error}</p>}
      {discogsCollection && (
        <div>
          <h1 className="text-3xl font-bold mt-8 mb-4 dark:text-white">Ma collection</h1>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-3xl font-bold text-blue-800 dark:text-blue-400 mt-1">
                {discogsCollection ? discogsCollection.length : 0} disques
              </p>
              {collectionValue && (
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  <p className="text-xl">
                    Valeur médiane : <span className="font-bold text-xl">
                      {collectionValue.median.toLocaleString()} {collectionValue.currency}
                    </span>
                  </p>
                  <p className="text-xs">
                    Valeur min-max : {collectionValue.minimum.toLocaleString()} - {collectionValue.maximum.toLocaleString()} {collectionValue.currency}
                  </p>
                </div>
              )}
            </div>
          </div>
          {/* Déplacer les boutons de tri ici */}
          <div className="flex mb-4">
            <button 
              onClick={() => handleSort('artist')} 
              className={`mr-2 px-3 py-1 rounded ${sortBy === 'artist' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`}
            >
              Trier par artiste {sortBy === 'artist' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => handleSort('year')} 
              className={`px-3 py-1 rounded ${sortBy === 'year' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`}
            >
              Trier par année {sortBy === 'year' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
          <div className="flex flex-wrap items-center mb-4">
            <div className="w-full mb-2">
              <span className="font-bold dark:text-white">Filtrer par genre :</span>
            </div>
            {getUniqueGenres().map(({ genre, count }) => (
              <div key={genre} className="mr-4 mb-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-600 dark:text-blue-400"
                    checked={genreFilters.includes(genre)}
                    onChange={() => handleGenreFilterChange(genre)}
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {genre} <span className="text-gray-500 dark:text-gray-400">({count})</span>
                  </span>
                </label>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {sortedAndFilteredReleases && sortedAndFilteredReleases.map((release) => (
              <div 
                key={release.id} 
                onClick={() => onAlbumClick(release.id)}
                className="border dark:border-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              >
                <div className="relative w-full pb-[100%]">
                  <Image
                    src={release.basic_information.cover_image}
                    alt={`Pochette de ${release.basic_information.title}`}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="p-4 bg-white dark:bg-gray-800">
                  <h3 className="font-bold text-sm truncate dark:text-white">{release.basic_information.artists[0].name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{release.basic_information.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Année : {release.basic_information.year || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    Genre : {release.basic_information.styles.join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
