"use client";
import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import Image from 'next/image';

const ClientHome = forwardRef(function ClientHome({ onAlbumClick }, ref) {
  const [discogsCollection, setDiscogsCollection] = useState([]);
  const [collectionValue, setCollectionValue] = useState(null);
  const [randomAlbum, setRandomAlbum] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('artist');
  const [sortOrder, setSortOrder] = useState('asc');
  const [genreFilters, setGenreFilters] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showGenreFilters, setShowGenreFilters] = useState(false);
  const [albumRatings, setAlbumRatings] = useState({});
  const [albumValues, setAlbumValues] = useState({});
  const [valueError, setValueError] = useState(null);
  const [isLoadingValues, setIsLoadingValues] = useState(false);
  const [valuesEnabled, setValuesEnabled] = useState(false);
  const [valuesProgress, setValuesProgress] = useState({ current: 0, total: 0 });
  const [lastValuesUpdate, setLastValuesUpdate] = useState(null);

  // Fonction pour mettre à jour les données d'un album spécifique
  const updateAlbumData = async (albumId) => {
    try {
      // Mettre à jour la note si elle existe
      const reviewResponse = await fetch(`/api/album/${albumId}/review`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (reviewResponse.ok) {
        const reviewData = await reviewResponse.json();
        if (reviewData.rating && reviewData.rating > 0) {
          setAlbumRatings(prev => ({
            ...prev,
            [albumId]: reviewData.rating
          }));
        }
      }

      // Mettre à jour la valeur si elle existe
      const valueResponse = await fetch(`/api/album/${albumId}/value`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (valueResponse.ok) {
        const valueData = await valueResponse.json();
        if (valueData.estimatedValue) {
          setAlbumValues(prev => ({
            ...prev,
            [albumId]: valueData.estimatedValue
          }));
          setValuesEnabled(true);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des données de l\'album:', error);
    }
  };

  // Exposer la fonction via useImperativeHandle
  useImperativeHandle(ref, () => ({
    updateAlbumData
  }));

  const fetchDiscogsData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/discogs');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données Discogs');
      }
      const data = await response.json();
      
      if (typeof data !== 'object') {
        console.error('Les données reçues ne sont pas un objet:', data);
        throw new Error('Format de données incorrect');
      }

      setDiscogsCollection(data.releases || []);
      setCollectionValue(data.collectionValue);

      // Gestion des albums aléatoires
      const today = new Date().toISOString().split('T')[0];
      const storedAlbums = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('randomAlbums') || 'null') : null;

      if (storedAlbums && storedAlbums.date === today) {
        setRandomAlbum(storedAlbums.albums);
      } else {
        const randomAlbums = [];
        const usedIndices = new Set();
        while (randomAlbums.length < 3 && usedIndices.size < data.releases.length) {
          const randomIndex = Math.floor(Math.random() * data.releases.length);
          if (!usedIndices.has(randomIndex)) {
            randomAlbums.push(data.releases[randomIndex]);
            usedIndices.add(randomIndex);
          }
        }
        setRandomAlbum(randomAlbums);
        if (typeof window !== 'undefined') {
          localStorage.setItem('randomAlbums', JSON.stringify({ date: today, albums: randomAlbums }));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAlbumRatings = useCallback(async () => {
    try {
      const ratings = {};
      
      for (const release of discogsCollection) {
        try {
          const response = await fetch(`/api/album/${release.id}/review`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.rating && data.rating > 0) {
              ratings[release.id] = data.rating;
            }
          }
        } catch {
          // Silencieux - pas de critique pour cet album
        }
      }
      setAlbumRatings(ratings);
    } catch (error) {
      console.error('Erreur lors de la récupération des notes:', error);
    }
  }, [discogsCollection]);

  const fetchStoredValues = useCallback(async () => {
    try {
      const values = {};
      
      for (const release of discogsCollection) {
        try {
          const response = await fetch(`/api/album/${release.id}/value`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.estimatedValue) {
              values[release.id] = data.estimatedValue;
            }
          }
        } catch {
          // Silencieux - pas de valeur pour cet album
        }
      }
      setAlbumValues(values);
      if (Object.keys(values).length > 0) {
        setValuesEnabled(true);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des valeurs stockées:', error);
    }
  }, [discogsCollection]);

  // Fonction pour actualiser uniquement les albums aléatoires
  const refreshRandomAlbums = useCallback(() => {
    if (discogsCollection.length === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    const storedAlbums = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('randomAlbums') || 'null') : null;

    // Si les albums stockés ne sont pas de la date du jour, on les actualise
    if (!storedAlbums || storedAlbums.date !== today) {
      const randomAlbums = [];
      const usedIndices = new Set();
      while (randomAlbums.length < 3 && usedIndices.size < discogsCollection.length) {
        const randomIndex = Math.floor(Math.random() * discogsCollection.length);
        if (!usedIndices.has(randomIndex)) {
          randomAlbums.push(discogsCollection[randomIndex]);
          usedIndices.add(randomIndex);
        }
      }
      setRandomAlbum(randomAlbums);
      if (typeof window !== 'undefined') {
        localStorage.setItem('randomAlbums', JSON.stringify({ date: today, albums: randomAlbums }));
      }
      console.log('Albums "À écouter aujourd\'hui" actualisés pour le', today);
    }
  }, [discogsCollection]);

  // useEffect pour charger les données initiales
  useEffect(() => {
    fetchDiscogsData();
  }, []);

  // useEffect pour charger les notes et valeurs quand la collection change
  useEffect(() => {
    if (discogsCollection.length > 0) {
      fetchAlbumRatings();
      fetchStoredValues();
    }
  }, [discogsCollection, fetchAlbumRatings, fetchStoredValues]);

  // useEffect pour vérifier périodiquement si la date a changé et actualiser les albums
  useEffect(() => {
    if (discogsCollection.length === 0) return;

    // Fonction pour calculer le temps jusqu'à minuit
    const getTimeUntilMidnight = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      return midnight - now;
    };

    // Vérifier immédiatement au montage du composant
    refreshRandomAlbums();

    // Planifier une vérification à minuit
    const timeoutUntilMidnight = setTimeout(() => {
      refreshRandomAlbums();
      // Après minuit, vérifier toutes les heures au cas où
      const hourlyInterval = setInterval(() => {
        refreshRandomAlbums();
      }, 60 * 60 * 1000); // Toutes les heures
      
      return () => clearInterval(hourlyInterval);
    }, getTimeUntilMidnight());

    // Vérifier aussi toutes les 10 minutes (au cas où l'ordinateur se réveille après minuit)
    const regularCheckInterval = setInterval(() => {
      refreshRandomAlbums();
    }, 10 * 60 * 1000); // Toutes les 10 minutes

    return () => {
      clearTimeout(timeoutUntilMidnight);
      clearInterval(regularCheckInterval);
    };
  }, [discogsCollection, refreshRandomAlbums]);

  const fetchAlbumValues = async (forceUpdate = false) => {
    if (isLoadingValues) return; // Éviter les appels multiples
    
    try {
      setIsLoadingValues(true);
      setValueError(null);
      const values = {...albumValues}; // Commencer avec les valeurs existantes
      
      // Récupérer les valeurs pour tous les albums de la collection
      setValuesProgress({ current: 0, total: discogsCollection.length });
      
      for (let i = 0; i < discogsCollection.length; i++) {
        const release = discogsCollection[i];
        
        // Si on ne force pas la mise à jour et qu'on a déjà une valeur, on peut la garder
        if (!forceUpdate && values[release.id]) {
          setValuesProgress({ current: i + 1, total: discogsCollection.length });
          continue;
        }
        
        try {
          // Utiliser la nouvelle API qui sauvegarde automatiquement
          const response = await fetch(`/api/album/${release.id}/value`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            try {
              const data = await response.json();
              if (data.estimatedValue) {
                values[release.id] = data.estimatedValue;
              }
            } catch (jsonError) {
              console.warn(`Réponse JSON invalide pour l'album ${release.id}:`, jsonError.message);
              // Continuer avec l'album suivant
            }
          } else if (response.status === 429) {
            setValueError('Trop de requêtes vers l\'API Discogs. Récupération des valeurs en pause...');
            // Pause plus longue en cas de rate limiting
            await new Promise(resolve => setTimeout(resolve, 5000));
            i--; // Réessayer le même album
            continue;
          } else if (response.status === 401) {
            setValueError('Token Discogs invalide. Veuillez reconfigurer vos identifiants.');
            break;
          } else if (response.status === 502) {
            setValueError('Réponse invalide de l\'API Discogs. Pause de 10 secondes...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            i--; // Réessayer le même album
            continue;
          } else if (response.status >= 500) {
            setValueError('Erreur serveur Discogs. Pause de 5 secondes...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            i--; // Réessayer le même album
            continue;
          }
        } catch (error) {
          console.warn(`Erreur lors de la récupération de la valeur pour l'album ${release.id}:`, error.message);
        }
        
        // Pause entre chaque requête pour éviter le rate limiting
        if (i < discogsCollection.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause plus courte pour accélérer
        }
        
        // Mettre à jour l'état progressivement toutes les 10 requêtes
        if (i % 10 === 0) {
          setAlbumValues({...values});
        }
        
        // Mettre à jour la progression
        setValuesProgress({ current: i + 1, total: discogsCollection.length });
      }
      
      setAlbumValues(values);
      setValuesEnabled(true);
      setLastValuesUpdate(new Date().toLocaleString('fr-FR'));
    } catch (error) {
      console.error('Erreur lors de la récupération des valeurs:', error);
      setValueError('Erreur lors de la récupération des valeurs des albums');
    } finally {
      setIsLoadingValues(false);
    }
  };


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
        } else if (sortBy === 'rating') {
          const ratingA = albumRatings[a.id];
          const ratingB = albumRatings[b.id];
          
          // Si un album n'a pas de note, il va à la fin
          if (!ratingA && !ratingB) return 0; // Les deux sans note, ordre inchangé
          if (!ratingA) return 1; // A sans note, va après B
          if (!ratingB) return -1; // B sans note, va après A
          
          // Les deux ont une note, tri normal
          return sortOrder === 'asc' ? ratingA - ratingB : ratingB - ratingA;
        } else if (sortBy === 'value') {
          const valueA = albumValues[a.id];
          const valueB = albumValues[b.id];
          
          // Si un album n'a pas de valeur, il va à la fin
          if (!valueA && !valueB) return 0; // Les deux sans valeur, ordre inchangé
          if (!valueA) return 1; // A sans valeur, va après B
          if (!valueB) return -1; // B sans valeur, va après A
          
          // Les deux ont une valeur, tri normal
          return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
        }
        return 0;
      }) : [];

  const handleNext = () => {
    setCarouselIndex((prevIndex) => (prevIndex + 1) % 3);
  };

  const handlePrev = () => {
    setCarouselIndex((prevIndex) => (prevIndex - 1 + 3) % 3);
  };

  return (
    <div className="container mx-auto px-4 dark:bg-gray-900 dark:text-white">
      
      {/* Section "À écouter aujourd'hui" transformée en carrousel */}
      {randomAlbum && randomAlbum.length > 0 && (
        <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-3xl font-bold mb-4 dark:text-white">À écouter aujourd&apos;hui</h2>
          <div className="flex items-center justify-between">
            <button onClick={handlePrev} className="text-lg font-bold dark:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div 
              className="flex items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 rounded-lg p-2"
              onClick={() => onAlbumClick(randomAlbum[carouselIndex].id)}
            >
              <div className="w-32 h-32 md:w-48 md:h-48 relative mr-4 flex-shrink-0">
                <Image
                  src={randomAlbum[carouselIndex].basic_information.cover_image}
                  alt={`Pochette de ${randomAlbum[carouselIndex].basic_information.title}`}
                  layout="fill"
                  objectFit="cover"
                  className="rounded shadow"
                />
              </div>
              <div className="text-base md:text-xl">
                <h3 className="font-bold dark:text-white text-sm md:text-lg">{randomAlbum[carouselIndex].basic_information.title}</h3>
                <p className="dark:text-gray-300 text-sm md:text-base">{randomAlbum[carouselIndex].basic_information.artists[0].name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Année : {randomAlbum[carouselIndex].basic_information.year || 'N/A'}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Genre : {randomAlbum[carouselIndex].basic_information.genres.join(', ') || 'N/A'}</p>
                
                {/* Note et valeur dans le carrousel - affichage seulement si disponibles */}
                <div className="flex items-center gap-4 mt-2">
                  {/* Note */}
                  {albumRatings[randomAlbum[carouselIndex].id] && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        {albumRatings[randomAlbum[carouselIndex].id].toFixed(1)}/10
                      </span>
                    </div>
                  )}
                  
                  {/* Valeur */}
                  {valuesEnabled && albumValues[randomAlbum[carouselIndex].id] && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        {typeof albumValues[randomAlbum[carouselIndex].id] === 'number' ? `${albumValues[randomAlbum[carouselIndex].id].toFixed(2)} €` : albumValues[randomAlbum[carouselIndex].id]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button onClick={handleNext} className="text-lg font-bold dark:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}


      {isLoading && <p className="dark:text-white">Chargement de votre collection...</p>}
      {error && <p className="text-red-500 dark:text-red-400">Erreur : {error}</p>}
      {valueError && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>{valueError}</span>
          </div>
          <button
            onClick={() => setValueError(null)}
            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 ml-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {isLoadingValues && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Récupération des valeurs en cours...</span>
            <span className="text-sm">{valuesProgress.current}/{valuesProgress.total}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(valuesProgress.current / valuesProgress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
      {discogsCollection.length > 0 && (
        <div>
          <h1 className="text-3xl font-bold mt-8 mb-4 dark:text-white">Ma collection</h1>
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-3xl font-bold text-blue-800 dark:text-blue-400 mt-1">
                {discogsCollection.length} disques
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
          <div className="flex mb-4 gap-2 flex-wrap">
            <button 
              onClick={() => handleSort('artist')} 
              className={`px-3 py-1 rounded ${sortBy === 'artist' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`}
            >
              Trier par artiste {sortBy === 'artist' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => handleSort('year')} 
              className={`px-3 py-1 rounded ${sortBy === 'year' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`}
            >
              Trier par année {sortBy === 'year' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => handleSort('rating')} 
              className={`px-3 py-1 rounded ${sortBy === 'rating' ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`}
            >
              Trier par note {sortBy === 'rating' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => handleSort('value')} 
              disabled={!valuesEnabled}
              className={`px-3 py-1 rounded ${sortBy === 'value' ? 'bg-green-500 text-white' : valuesEnabled ? 'bg-gray-200 dark:bg-gray-700 dark:text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'}`}
            >
              Trier par valeur {sortBy === 'value' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchAlbumValues(valuesEnabled)}
                disabled={isLoadingValues}
                className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white disabled:cursor-not-allowed"
              >
                {isLoadingValues ? `Récupération... (${valuesProgress.current}/${valuesProgress.total})` : valuesEnabled ? 'Mettre à jour les valeurs' : 'Récupérer les valeurs'}
              </button>
              {lastValuesUpdate && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Dernière mise à jour: {lastValuesUpdate}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowGenreFilters(!showGenreFilters)}
              className={`px-3 py-1 rounded ${showGenreFilters ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`}
            >
              {showGenreFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
            </button>
          </div>
          {showGenreFilters && (
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
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {sortedAndFilteredReleases.map((release) => (
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
                  {albumRatings[release.id] && (
                    <div className="mt-2 flex items-center">
                      <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        {albumRatings[release.id].toFixed(1)}/10
                      </span>
                    </div>
                  )}
                  {valuesEnabled && albumValues[release.id] && (
                    <div className="mt-1 flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        {typeof albumValues[release.id] === 'number' ? `${albumValues[release.id].toFixed(2)} €` : albumValues[release.id]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default ClientHome;
