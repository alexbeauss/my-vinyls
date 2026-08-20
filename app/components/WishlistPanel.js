"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

export default function WishlistPanel({ onAlbumClick }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [formError, setFormError] = useState(null);
  const searchAbortRef = useRef(null);

  const fetchWishlist = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/wishlist');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur de chargement');
      }
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return undefined;
    }

    // Si l'utilisateur colle une URL / un ID, on sélectionne directement
    const idFromInput = q.replace(/^.*\/release\//, '').split(/[^\d]/)[0];
    if (/^\d+$/.test(idFromInput) && (q.includes('/release/') || /^\d+$/.test(q.trim()))) {
      setSelectedResult({
        id: idFromInput,
        title: `Release #${idFromInput}`,
        artist: '',
        year: null,
        thumb: null,
        coverImage: null,
        format: null,
        country: null,
        label: null,
        discogsUrl: `https://www.discogs.com/release/${idFromInput}`,
      });
      setSearchResults([]);
      setIsSearching(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      setIsSearching(true);
      setSearchError(null);
      try {
        const response = await fetch(`/api/discogs/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Erreur de recherche');
        }
        setSearchResults(data.results || []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setSearchError(err.message);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, [searchQuery]);

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
    setFormError(null);
    setSearchError(null);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    setFormError(null);

    try {
      if (!selectedResult?.id) {
        throw new Error('Sélectionne un album dans les résultats de recherche');
      }

      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discogsId: selectedResult.id,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Échec de l'ajout");
      }

      setItems((prev) => [data.item, ...prev.filter((i) => i.itemId !== data.item.itemId)]);
      resetForm();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddFromResult = async (result) => {
    setIsAdding(true);
    setFormError(null);
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discogsId: result.id,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Échec de l'ajout");
      }
      setItems((prev) => [data.item, ...prev.filter((i) => i.itemId !== data.item.itemId)]);
      resetForm();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (itemId) => {
    try {
      const response = await fetch(`/api/wishlist?itemId=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Échec de la suppression');
      }
      setItems((prev) => prev.filter((item) => item.itemId !== itemId));
    } catch (err) {
      setError(err.message);
    }
  };

  const totalDiscogs = items.reduce((sum, item) => {
    return sum + (typeof item.estimatedValue === 'number' ? item.estimatedValue : 0);
  }, 0);

  const pricedCount = items.filter((item) => typeof item.estimatedValue === 'number').length;
  const avgPrice = pricedCount > 0 ? totalDiscogs / pricedCount : null;

  const alreadyInWishlist = (id) => items.some((item) => String(item.itemId) === String(id));

  return (
    <div className="mb-8 space-y-4">
      <div>
        <h2 className="text-2xl font-bold dark:text-white">Wishlist</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Synchronisée avec Discogs</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 sm:px-6 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">À acheter</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 leading-none">
              {items.length}{' '}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                vinyle{items.length !== 1 ? 's' : ''}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 sm:px-6 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Valeur totale</p>
            <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400 leading-none">
              {totalDiscogs > 0
                ? `${totalDiscogs.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
                : '—'}
            </p>
            {pricedCount > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {pricedCount}/{items.length} prix connus
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 sm:px-6 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m-6 4h4M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Prix moyen</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 leading-none">
              {avgPrice != null
                ? `${avgPrice.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
                : '—'}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleAdd}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3"
      >
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Rechercher dans le catalogue Discogs
          </label>
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedResult(null);
              }}
              placeholder="Artiste, album… ou colle une URL / ID Discogs"
              className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            {isSearching && (
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>

          {searchError && <p className="text-sm text-red-500 dark:text-red-400">{searchError}</p>}

          {selectedResult && (
            <div className="flex items-center gap-3 p-2 rounded-lg border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20">
              <div className="w-12 h-12 relative flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                {selectedResult.thumb || selectedResult.coverImage ? (
                  <Image
                    src={selectedResult.coverImage || selectedResult.thumb}
                    alt={selectedResult.title}
                    layout="fill"
                    objectFit="cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium dark:text-white truncate">
                  {selectedResult.artist ? `${selectedResult.artist} — ${selectedResult.title}` : selectedResult.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {[selectedResult.year, selectedResult.format, selectedResult.country].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Changer
              </button>
            </div>
          )}

          {!selectedResult && searchResults.length > 0 && (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700">
              {searchResults.map((result) => {
                const inList = alreadyInWishlist(result.id);
                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedResult(result)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div className="w-12 h-12 relative flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                        {result.thumb || result.coverImage ? (
                          <Image
                            src={result.coverImage || result.thumb}
                            alt={result.title}
                            layout="fill"
                            objectFit="cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">?</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium dark:text-white truncate">
                          {result.artist || 'Artiste inconnu'}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{result.title}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {[result.year, result.format, result.country, result.label].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={isAdding || inList}
                      onClick={() => handleAddFromResult(result)}
                      className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white transition-colors"
                    >
                      {inList ? 'Déjà ajouté' : 'Ajouter'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!selectedResult && !isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchError && (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Aucun résultat</p>
          )}
        </div>

        {formError && <p className="text-sm text-red-500 dark:text-red-400">{formError}</p>}

        {selectedResult && (
          <button
            type="submit"
            disabled={isAdding}
            className="px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium transition-colors"
          >
            {isAdding ? 'Ajout…' : 'Ajouter à la wishlist'}
          </button>
        )}
      </form>

      {isLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Chargement de la wishlist et des prix Discogs…
        </p>
      )}
      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

      {!isLoading && items.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
          Aucun vinyle dans ta wishlist Discogs. Cherche un album ci-dessus pour en ajouter.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-6">
        {items.map((item) => {
          const albumId = item.discogsId || (!String(item.itemId).startsWith('manual_') ? item.itemId : null);
          const isClickable = Boolean(albumId && onAlbumClick);

          return (
            <div
              key={item.itemId}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={isClickable ? () => onAlbumClick(albumId) : undefined}
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onAlbumClick(albumId);
                      }
                    }
                  : undefined
              }
              className={`group border dark:border-gray-700 rounded-lg overflow-hidden shadow hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-800 ${
                isClickable ? 'cursor-pointer' : ''
              }`}
            >
              <div className="relative w-full pb-[100%] overflow-hidden bg-gray-100 dark:bg-gray-700">
                {item.coverImage ? (
                  <Image
                    src={item.coverImage}
                    alt={`Pochette de ${item.title}`}
                    layout="fill"
                    objectFit="cover"
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">?</div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 hidden sm:flex items-center justify-center">
                  <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="p-2 sm:p-3">
                <h3 className="font-bold text-xs sm:text-sm truncate dark:text-white">{item.artist}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.title}</p>
                <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {item.year || 'N/A'}
                </p>
                {item.rating != null && Number(item.rating) > 0 && (
                  <div className="mt-1.5 flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      {Number(item.rating).toFixed(1)}/10
                    </span>
                  </div>
                )}
                {item.estimatedValue != null && (
                  <div className="mt-1 flex items-center">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      {Number(item.estimatedValue).toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      €
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {item.discogsUrl && (
                    <a
                      href={item.discogsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400"
                    >
                      Voir sur Discogs
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.itemId);
                    }}
                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
