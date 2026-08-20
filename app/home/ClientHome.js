"use client";
import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import Image from 'next/image';
import CollectionDashboard from '../components/CollectionDashboard';
import WishlistPanel from '../components/WishlistPanel';

const ClientHome = forwardRef(function ClientHome({ onAlbumClick }, ref) {
  const [discogsCollection, setDiscogsCollection] = useState([]);
  const [collectionValue, setCollectionValue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('artist');
  const [sortOrder, setSortOrder] = useState('asc');
  const [genreFilters, setGenreFilters] = useState([]);
  const [showGenreFilters, setShowGenreFilters] = useState(false);
  const [albumRatings, setAlbumRatings] = useState({});
  const [albumValues, setAlbumValues] = useState({});
  const [valueError, setValueError] = useState(null);
  const [isLoadingValues, setIsLoadingValues] = useState(false);
  const [valuesEnabled, setValuesEnabled] = useState(false);
  const [valuesProgress, setValuesProgress] = useState({ current: 0, total: 0 });
  const [lastValuesUpdate, setLastValuesUpdate] = useState(null);
  const [moodLoading, setMoodLoading] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodSuggestions, setMoodSuggestions] = useState([]);
  const [moodError, setMoodError] = useState(null);
  const [moodSlide, setMoodSlide] = useState(0);
  const [viewMode, setViewMode] = useState('collection');

  const MOOD_OPTIONS = [
    { id: 'moment', label: 'Vinyle du moment', emoji: '✨', featured: true },
    { id: 'apaise', label: 'Apaisé', emoji: '🌿' },
    { id: 'enjoue', label: 'Enjoué', emoji: '☀️' },
    { id: 'reveur', label: 'Rêveur', emoji: '☁️' },
    { id: 'survolte', label: 'Survolté', emoji: '⚡' },
    { id: 'nostalgique', label: 'Nostalgique', emoji: '📼' },
    { id: 'meditatif', label: 'Méditatif', emoji: '🕯' },
    { id: 'romantique', label: 'Romantique', emoji: '🌹' },
  ];

  const getMomentContext = () => {
    const now = new Date();
    const month = now.getMonth();
    const seasons = ['hiver', 'hiver', 'printemps', 'printemps', 'printemps', 'été', 'été', 'été', 'automne', 'automne', 'automne', 'hiver'];
    return {
      hour: now.getHours(),
      dayOfWeek: now.toLocaleDateString('fr-FR', { weekday: 'long' }),
      season: seasons[month],
    };
  };

  const buildMoodCollectionPayload = () =>
    discogsCollection.map((release) => ({
      id: String(release.id),
      title: release.basic_information.title,
      artist: release.basic_information.artists[0].name,
      genres: release.basic_information.genres || [],
      styles: release.basic_information.styles || [],
    }));

  const handleMoodSelect = async (moodId) => {
    setSelectedMood(moodId);
    setMoodSuggestions([]);
    setMoodSlide(0);
    setMoodError(null);
    setMoodLoading(true);

    try {
      const collection = buildMoodCollectionPayload();
      if (collection.length === 0) {
        throw new Error('Aucun album dans la collection');
      }

      const body = {
        mood: moodId,
        collection,
        ...(moodId === 'moment' ? { context: getMomentContext() } : {}),
      };

      const response = await fetch('/api/mood-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de la suggestion');
      }

      const data = await response.json();
      setMoodSuggestions(data.suggestions || []);
    } catch (err) {
      setMoodError(err.message);
    } finally {
      setMoodLoading(false);
    }
  };

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

  useEffect(() => {
    fetchDiscogsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFiltersToCollection = (collection) => {
    if (genreFilters.length === 0) return collection;
    return collection.filter(album => 
      album.basic_information.styles && 
      album.basic_information.styles.some(style => genreFilters.includes(style))
    );
  };

  useEffect(() => {
    if (discogsCollection.length > 0) {
      fetchAlbumRatings();
      fetchStoredValues();
    }
  }, [discogsCollection, fetchAlbumRatings, fetchStoredValues]);

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
    applyFiltersToCollection([...discogsCollection])
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

  const exportCollectionCsv = () => {
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Artiste', 'Titre', 'Année', 'Genres', 'Note IA', 'Valeur €'],
      ...sortedAndFilteredReleases.map((r) => [
        r.basic_information.artists[0].name,
        r.basic_information.title,
        r.basic_information.year ?? '',
        (r.basic_information.styles || []).join('; '),
        albumRatings[r.id] != null ? albumRatings[r.id].toFixed(1) : '',
        albumValues[r.id] ?? '',
      ]),
    ];
    const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my-vinyls-collection-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 dark:bg-gray-900 dark:text-white">
      
      {/* Quoi écouter — moods + 3 propositions */}
      {discogsCollection.length > 0 && (
        <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-2xl sm:text-3xl font-bold dark:text-white mb-3">Quoi écouter ?</h2>
          <div className="flex gap-2 flex-wrap mb-4">
            {MOOD_OPTIONS.map(({ id, label, emoji, featured }) => (
              <button
                key={id}
                onClick={() => handleMoodSelect(id)}
                disabled={moodLoading}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap disabled:opacity-50 ${
                  selectedMood === id
                    ? featured
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md ring-2 ring-purple-300'
                      : 'bg-blue-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          {moodLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 py-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {selectedMood === 'moment'
                ? 'Gemini cherche 3 vinyles pour ce moment...'
                : 'Gemini cherche 3 albums dans ta collection...'}
            </div>
          )}

          {moodError && (
            <p className="text-sm text-red-500 dark:text-red-400 mb-2">{moodError}</p>
          )}

          {!moodLoading && moodSuggestions.length > 0 && (
            <div>
              <div
                className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto sm:overflow-visible snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const card = el.firstElementChild;
                  if (!card) return;
                  const step = card.offsetWidth + 12; // gap-3
                  setMoodSlide(Math.min(
                    moodSuggestions.length - 1,
                    Math.max(0, Math.round(el.scrollLeft / step))
                  ));
                }}
              >
                {moodSuggestions.map((suggestion) => {
                  const release = discogsCollection.find((r) => String(r.id) === String(suggestion.albumId));
                  if (!release) return null;
                  return (
                    <button
                      key={suggestion.albumId}
                      type="button"
                      onClick={() => onAlbumClick(release.id)}
                      className="text-left flex flex-col gap-3 p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer shrink-0 w-[85%] sm:w-auto sm:shrink snap-center"
                    >
                      <div className="w-full aspect-square relative bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                        <Image
                          src={release.basic_information.cover_image}
                          alt={release.basic_information.title}
                          layout="fill"
                          objectFit="contain"
                          className="rounded-lg"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold dark:text-white truncate text-sm sm:text-base">{release.basic_information.title}</p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">{release.basic_information.artists[0].name}</p>
                        {albumRatings[release.id] && (
                          <div className="flex items-center mt-1.5">
                            <svg className="w-3.5 h-3.5 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                              {albumRatings[release.id].toFixed(1)}/10
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-snug">{suggestion.explanation}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {moodSuggestions.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3 sm:hidden" aria-hidden>
                  {moodSuggestions.map((s, i) => (
                    <span
                      key={s.albumId}
                      className={`h-1.5 rounded-full transition-all ${
                        i === moodSlide ? 'w-4 bg-blue-500' : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">Ma collection</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('collection')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  viewMode === 'collection'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                }`}
              >
                Collection
              </button>
              <button
                onClick={() => setViewMode('wishlist')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  viewMode === 'wishlist'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                }`}
              >
                Wishlist
              </button>
              <button
                onClick={() => setViewMode('stats')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  viewMode === 'stats'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                }`}
              >
                Stats
              </button>
            </div>
          </div>
          <div className={`flex flex-wrap gap-3 mb-4 ${viewMode !== 'collection' ? 'hidden' : ''}`}>
            {/* Carte : nombre de disques */}
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 sm:px-6 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Collection</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 leading-none">{discogsCollection.length} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">disques</span></p>
              </div>
            </div>

            {/* Carte : valeur médiane */}
            {collectionValue && (() => {
              const parseMoney = (value) => {
                if (value == null || value === '') return null;
                if (typeof value === 'number') return Number.isFinite(value) ? value : null;
                let cleaned = String(value).trim().replace(/[^\d.,\-]/g, '');
                if (!cleaned) return null;
                const hasComma = cleaned.includes(',');
                const hasDot = cleaned.includes('.');
                if (hasComma && hasDot) {
                  cleaned = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
                    ? cleaned.replace(/\./g, '').replace(',', '.')
                    : cleaned.replace(/,/g, '');
                } else if (hasComma) {
                  const parts = cleaned.split(',');
                  cleaned = parts[parts.length - 1].length <= 2
                    ? `${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`
                    : cleaned.replace(/,/g, '');
                }
                const n = parseFloat(cleaned);
                return Number.isFinite(n) ? n : null;
              };
              const median = parseMoney(collectionValue.median);
              const minimum = parseMoney(collectionValue.minimum);
              const maximum = parseMoney(collectionValue.maximum);
              const currency = collectionValue.currency === 'EUR' || !collectionValue.currency
                ? '€'
                : collectionValue.currency;
              if (median == null) return null;
              return (
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 sm:px-6 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Valeur médiane</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400 leading-none">
                    {median.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}{' '}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{currency}</span>
                  </p>
                  {minimum != null && maximum != null && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {minimum.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} – {maximum.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} {currency}
                    </p>
                  )}
                </div>
              </div>
              );
            })()}
          </div>
          {viewMode === 'stats' ? (
            <CollectionDashboard
              collection={discogsCollection}
              albumRatings={albumRatings}
              albumValues={albumValues}
              collectionValue={collectionValue}
            />
          ) : viewMode === 'wishlist' ? (
            <WishlistPanel onAlbumClick={onAlbumClick} />
          ) : (
          <>
          {/* Barre de tri — select sur mobile, boutons pill sur desktop */}
          <div className="mb-4">
            {/* Version mobile : selects natifs */}
            <div className="flex gap-2 sm:hidden flex-wrap">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setSortOrder('asc'); }}
                className="flex-1 px-3 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="artist">Artiste</option>
                <option value="year">Année</option>
                <option value="rating">Note</option>
                {valuesEnabled && <option value="value">Valeur</option>}
              </select>
              <button
                onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
              <button
                onClick={() => fetchAlbumValues(valuesEnabled)}
                disabled={isLoadingValues}
                className="px-3 py-2 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm disabled:cursor-not-allowed"
              >
                {isLoadingValues ? `${valuesProgress.current}/${valuesProgress.total}` : valuesEnabled ? '↻ Valeurs' : '+ Valeurs'}
              </button>
              <button
                onClick={() => setShowGenreFilters(!showGenreFilters)}
                className={`px-3 py-2 rounded-full text-sm border ${showGenreFilters ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'}`}
              >
                Genres
              </button>
              <button
                onClick={exportCollectionCsv}
                className="px-3 py-2 rounded-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                Exporter
              </button>
            </div>

            {/* Version desktop : boutons pill */}
            <div className="hidden sm:flex gap-2 flex-wrap items-center">
              {[
                { key: 'artist', label: 'Artiste', color: 'blue' },
                { key: 'year', label: 'Année', color: 'blue' },
                { key: 'rating', label: 'Note', color: 'purple' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                    sortBy === key
                      ? color === 'purple'
                        ? 'bg-purple-500 text-white border-purple-500 shadow-sm'
                        : 'bg-blue-500 text-white border-blue-500 shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                  }`}
                >
                  {label} {sortBy === key && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              ))}
              <button
                onClick={() => handleSort('value')}
                disabled={!valuesEnabled}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                  sortBy === 'value'
                    ? 'bg-green-500 text-white border-green-500 shadow-sm'
                    : valuesEnabled
                      ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-green-400'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                }`}
              >
                Valeur {sortBy === 'value' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchAlbumValues(valuesEnabled)}
                  disabled={isLoadingValues}
                  className="px-4 py-1.5 rounded-full text-sm font-medium bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white border border-blue-500 transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {isLoadingValues ? `Récupération... (${valuesProgress.current}/${valuesProgress.total})` : valuesEnabled ? 'Mettre à jour les valeurs' : 'Récupérer les valeurs'}
                </button>
                {lastValuesUpdate && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Mise à jour : {lastValuesUpdate}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowGenreFilters(!showGenreFilters)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${showGenreFilters ? 'bg-green-500 text-white border-green-500' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-green-400'}`}
              >
                {showGenreFilters ? 'Masquer filtres' : 'Filtrer par genre'}
              </button>
              <button
                onClick={exportCollectionCsv}
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
              >
                Exporter CSV
              </button>
            </div>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-6">
            {sortedAndFilteredReleases.map((release) => (
              <div 
                key={release.id} 
                onClick={() => onAlbumClick(release.id)}
                className="group border dark:border-gray-700 rounded-lg overflow-hidden shadow hover:shadow-xl transition-all duration-300 cursor-pointer bg-white dark:bg-gray-800"
              >
                <div className="relative w-full pb-[100%] overflow-hidden">
                  <Image
                    src={release.basic_information.cover_image}
                    alt={`Pochette de ${release.basic_information.title}`}
                    layout="fill"
                    objectFit="cover"
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Overlay desktop au hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 hidden sm:flex items-center justify-center">
                    <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div className="p-2 sm:p-3">
                  <h3 className="font-bold text-xs sm:text-sm truncate dark:text-white">{release.basic_information.artists[0].name}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{release.basic_information.title}</p>
                  <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {release.basic_information.year || 'N/A'} · {release.basic_information.styles.join(', ') || 'N/A'}
                  </p>
                  {albumRatings[release.id] && (
                    <div className="mt-1.5 flex items-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        {albumRatings[release.id].toFixed(1)}/10
                      </span>
                    </div>
                  )}
                  {valuesEnabled && albumValues[release.id] && (
                    <div className="mt-1 flex items-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </>
          )}
        </div>
      )}
    </div>
  );
});

export default ClientHome;
