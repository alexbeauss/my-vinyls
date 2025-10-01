"use client";
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

export default function AlbumDetails({ albumId, onDataUpdate }) {
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [review, setReview] = useState(null);
  const [rating, setRating] = useState(null);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [estimatedValue, setEstimatedValue] = useState(null);
  const [valueSource, setValueSource] = useState(null); // 'saved' ou 'discogs'
  const [recommendedAlbum, setRecommendedAlbum] = useState(null);
  const [appleMusicData, setAppleMusicData] = useState(null);
  const [isLoadingAppleMusic, setIsLoadingAppleMusic] = useState(false);

  const handleDataUpdate = useCallback((id) => {
    if (onDataUpdate) {
      onDataUpdate(id);
    }
  }, [onDataUpdate]);

  // Fonction pour extraire l'album recommandé de la critique
  const extractRecommendedAlbum = useCallback((reviewText) => {
    if (!reviewText) return null;
    
    // Chercher le pattern "ALBUM RECOMMANDÉ : [Titre] - [Artiste] ([Année])"
    const match = reviewText.match(/ALBUM RECOMMANDÉ\s*:\s*(.+?)\s*-\s*(.+?)\s*\((\d{4})\)/i);
    
    if (match) {
      const [, title, artist, year] = match;
      
      // Nettoyer le titre et l'artiste des caractères de formatage
      const cleanTitle = title
        .trim()
        .replace(/\*+/g, '') // Supprimer les astérisques
        .replace(/^["']|["']$/g, '') // Supprimer les guillemets au début/fin
        .replace(/^_+|_+$/g, '') // Supprimer les underscores au début/fin
        .replace(/^`+|`+$/g, '') // Supprimer les backticks au début/fin
        .trim();
      
      const cleanArtist = artist
        .trim()
        .replace(/\*+/g, '') // Supprimer les astérisques
        .replace(/^["']|["']$/g, '') // Supprimer les guillemets au début/fin
        .replace(/^_+|_+$/g, '') // Supprimer les underscores au début/fin
        .replace(/^`+|`+$/g, '') // Supprimer les backticks au début/fin
        .trim();
      
      console.log(`🎵 Album recommandé extrait:`);
      console.log(`   Titre original: "${title}"`);
      console.log(`   Titre nettoyé: "${cleanTitle}"`);
      console.log(`   Artiste original: "${artist}"`);
      console.log(`   Artiste nettoyé: "${cleanArtist}"`);
      
      return {
        title: cleanTitle,
        artist: cleanArtist,
        year: parseInt(year)
      };
    }
    
    return null;
  }, []);

  // Fonction pour récupérer les données Apple Music
  const fetchAppleMusicData = useCallback(async (album) => {
    if (!album) return;
    
    setIsLoadingAppleMusic(true);
    try {
      const response = await fetch(`/api/apple-music/search?artist=${encodeURIComponent(album.artist)}&album=${encodeURIComponent(album.title)}`);
      
      if (response.ok) {
        const data = await response.json();
        setAppleMusicData(data);
        console.log('Données Apple Music récupérées:', data);
      } else {
        console.error('Erreur lors de la récupération des données Apple Music');
        setAppleMusicData(null);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données Apple Music:', error);
      setAppleMusicData(null);
    } finally {
      setIsLoadingAppleMusic(false);
    }
  }, []);

  const generateReview = useCallback(async (retryCount = 0) => {
    setIsGeneratingReview(true);
    setReviewError(null);
    
    const maxRetries = 2;
    const timeoutMs = 45000; // 45 secondes pour laisser une marge
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(`/api/album/${albumId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = errorData.error || `Erreur ${response.status}: ${response.statusText}`;
        
        // Gestion spécifique des erreurs 504
        if (response.status === 504) {
          errorMessage = 'La génération de la critique prend trop de temps. Veuillez réessayer.';
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (!data.review) {
        throw new Error('Aucune critique générée par l\'IA');
      }
      
      setReview(data.review);
      setRating(data.rating);
      
      // Extraire l'album recommandé de la critique
      const recommended = extractRecommendedAlbum(data.review);
      setRecommendedAlbum(recommended);
      
      // Récupérer les données Apple Music si un album est recommandé
      if (recommended) {
        fetchAppleMusicData(recommended);
      }
      
      // Déclencher la mise à jour de la collection
      handleDataUpdate(albumId);
    } catch (err) {
      console.error('Erreur lors de la génération de critique:', err);
      
      // Retry automatique pour les erreurs de timeout ou 504
      if ((err.name === 'AbortError' || err.message.includes('504') || err.message.includes('timeout')) && retryCount < maxRetries) {
        console.log(`Tentative ${retryCount + 1}/${maxRetries + 1} - Retry automatique...`);
        setTimeout(() => {
          generateReview(retryCount + 1);
        }, 2000 * (retryCount + 1)); // Délai progressif : 2s, 4s
        return;
      }
      
      let errorMessage = err.message;
      if (err.name === 'AbortError') {
        errorMessage = 'La génération de la critique a pris trop de temps. Veuillez réessayer.';
      }
      
      setReviewError(errorMessage);
    } finally {
      setIsGeneratingReview(false);
    }
  }, [albumId, handleDataUpdate, extractRecommendedAlbum, fetchAppleMusicData]);

  useEffect(() => {
    async function fetchAlbumDetails() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/album/${albumId}`);
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des détails de l\'album');
        }
        const data = await response.json();
        setAlbum(data);
        
        // D'abord essayer de récupérer la valeur stockée en base de données
        try {
          const valueResponse = await fetch(`/api/album/${albumId}/value`);
          if (valueResponse.ok) {
            const valueData = await valueResponse.json();
            if (valueData.estimatedValue) {
              setEstimatedValue(valueData.estimatedValue);
              setValueSource('saved');
            }
          }
        } catch {
          // Silencieux - pas de valeur stockée
        }

        // Si pas de valeur stockée, utiliser celle de Discogs et la sauvegarder
        if (!estimatedValue) {
          if (data.estimated_value) {
            setEstimatedValue(data.estimated_value);
            setValueSource('discogs');
            // Sauvegarder automatiquement la valeur en base de données
            try {
              await fetch(`/api/album/${albumId}/value`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
            } catch {
            }
            // Déclencher la mise à jour de la collection
            handleDataUpdate(albumId);
          } else if (data.lowest_price) {
            setEstimatedValue(data.lowest_price);
            setValueSource('discogs');
            // Sauvegarder automatiquement la valeur en base de données
            try {
              await fetch(`/api/album/${albumId}/value`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
            } catch {
            }
            // Déclencher la mise à jour de la collection
            handleDataUpdate(albumId);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchExistingReview() {
      try {
        const response = await fetch(`/api/album/${albumId}/review`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.review) {
            setReview(data.review);
            setRating(data.rating);
            
            // Extraire l'album recommandé de la critique existante
            const recommended = extractRecommendedAlbum(data.review);
            setRecommendedAlbum(recommended);
            
            // Récupérer les données Apple Music si un album est recommandé
            if (recommended) {
              fetchAppleMusicData(recommended);
            }
            
            // Déclencher la mise à jour de la collection
            handleDataUpdate(albumId);
          } else {
            // Aucune critique existante, lancer automatiquement la génération
            generateReview();
          }
        }
      } catch {
        // Silencieux - pas de critique existante
      }
    }

    if (albumId) {
      fetchAlbumDetails();
      fetchExistingReview();
    }
  }, [albumId, handleDataUpdate, estimatedValue, generateReview, extractRecommendedAlbum, fetchAppleMusicData]);

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;
  if (!album) return <div>Album non trouvé</div>;

  // Fonction pour obtenir la couleur de la note
  const getRatingColor = (rating) => {
    if (rating >= 8.5) return 'text-green-600 dark:text-green-400';
    if (rating >= 7) return 'text-blue-600 dark:text-blue-400';
    if (rating >= 5.5) return 'text-yellow-600 dark:text-yellow-400';
    if (rating >= 4) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRatingBgColor = (rating) => {
    if (rating >= 8.5) return 'bg-green-100 dark:bg-green-900/30';
    if (rating >= 7) return 'bg-blue-100 dark:bg-blue-900/30';
    if (rating >= 5.5) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (rating >= 4) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Image de l'album */}
          <div className="lg:w-1/3 flex justify-center lg:justify-start">
            <div className="relative group">
              <Image
                src={album.images[0].uri}
                alt={album.title}
                width={350}
                height={350}
                className="rounded-xl shadow-xl dark:shadow-2xl transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-xl transition-all duration-300"></div>
            </div>
          </div>
          
          {/* Informations de l'album */}
          <div className="lg:w-2/3 space-y-6">
            {/* Titre et artiste */}
            <div className="space-y-2">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                {album.title}
              </h1>
              <p className="text-2xl text-gray-700 dark:text-gray-300 font-medium">
                {album.artists[0].name}
              </p>
            </div>
            
            {/* Métadonnées */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Année
                </div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {album.year}
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Label
                </div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {album.labels[0].name}
                </div>
              </div>
              
               {/* Valeur estimée */}
               {estimatedValue && (
                 <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                   <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                     <span>Valeur estimée</span>
                     {valueSource === 'saved' && (
                       <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full flex items-center">
                         <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                         </svg>
                         Sauvegardée
                       </span>
                     )}
                   </div>
                   <div className="text-lg font-bold text-gray-900 dark:text-white">
                     {typeof estimatedValue === 'number' ? `${estimatedValue.toFixed(2)} €` : estimatedValue}
                   </div>
                 </div>
               )}
              
              {/* Note IA */}
              {rating && (
                <div className={`rounded-lg p-4 border border-gray-200 dark:border-gray-700 ${getRatingBgColor(rating)}`}>
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Note IA
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span className={`text-2xl font-bold ${getRatingColor(rating)}`}>
                      {rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/10</span>
                  </div>
                </div>
              )}
              
              
            </div>
            
            {/* Genres et styles */}
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Genres
                </div>
                <div className="flex flex-wrap gap-2">
                  {album.genres.map((genre, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Styles
                </div>
                <div className="flex flex-wrap gap-2">
                  {album.styles.map((style, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-sm font-medium rounded-full"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Section Critique */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <svg className="w-6 h-6 mr-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Critique de l&apos;album
          </h2>
          {!review && !isGeneratingReview && (
            <button
              onClick={generateReview}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Générer une critique</span>
              </div>
            </button>
          )}
        </div>
        
        {reviewError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Erreur : {reviewError}</span>
          </div>
        )}
        
        {isGeneratingReview && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg mb-6 flex items-center">
            <svg className="animate-spin w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Génération automatique de la critique en cours avec Google Gemini...</span>
          </div>
        )}
        
        {review && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed text-base">
                {review}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Critique générée par Google Gemini</span>
              </div>
              <button
                onClick={async () => {
                  setReview(null);
                  setRating(null);
                  // Supprimer la critique existante et en générer une nouvelle
                  try {
                    await fetch(`/api/album/${albumId}/review`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                    });
                    // Générer une nouvelle critique
                    await generateReview();
                  } catch (err) {
                    console.error('Erreur lors de la régénération:', err);
                  }
                }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                Régénérer
              </button>
            </div>
          </div>
        )}
        
        {recommendedAlbum && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-6 mt-6">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                Album recommandé
              </h3>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {appleMusicData?.artwork && (
                    <Image 
                      src={appleMusicData.artwork} 
                      alt={`${recommendedAlbum.title} artwork`}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-lg mr-3 object-cover"
                    />
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {appleMusicData?.album || recommendedAlbum.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {appleMusicData?.artist || recommendedAlbum.artist} • {appleMusicData?.year || recommendedAlbum.year}
                    </p>
                    {appleMusicData?.genre && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {appleMusicData.genre}
                      </p>
                    )}
                  </div>
                </div>
                
                {isLoadingAppleMusic ? (
                  <div className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm font-medium">
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Recherche...
                  </div>
                ) : (
                  <a
                    href={appleMusicData?.directUrl || `https://music.apple.com/search?term=${encodeURIComponent(`${recommendedAlbum.artist} ${recommendedAlbum.title}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 text-sm font-medium"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    {appleMusicData?.found ? 'Écouter sur Apple Music' : 'Rechercher sur Apple Music'}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Tracklist */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <svg className="w-6 h-6 mr-3 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          Tracklist
        </h2>
        <div className="space-y-3">
          {album.tracklist.map((track, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {index + 1}
                  </span>
                </div>
                <span className="text-gray-900 dark:text-white font-medium">
                  {track.title}
                </span>
              </div>
              {track.duration && (
                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {track.duration}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
