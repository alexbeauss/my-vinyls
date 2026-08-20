"use client";

function countBy(items, keyFn) {
  const counts = {};
  items.forEach((item) => {
    const keys = keyFn(item);
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach((key) => {
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function formatEur(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(value).toLocaleString('fr-FR', {
    maximumFractionDigits: 0,
  });
}

/** Discogs renvoie souvent "€123.45" / "$1,000.00" — pas un nombre brut. */
function parseMoney(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let cleaned = String(value).trim().replace(/[^\d.,\-]/g, '');
  if (!cleaned) return null;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = cleaned.split(',');
    if (parts[parts.length - 1].length <= 2) {
      cleaned = `${parts.slice(0, -1).join('')}.${parts[parts.length - 1]}`;
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function medianOf(numbers) {
  if (!numbers.length) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function StatCard({ label, value, hint, accent = 'blue' }) {
  const accents = {
    blue: 'text-blue-700 dark:text-blue-400',
    green: 'text-green-700 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    gray: 'text-gray-800 dark:text-white',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-gray-700 min-w-0">
      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
        {label}
      </p>
      <p className={`text-xl sm:text-2xl font-bold mt-1 truncate ${accents[accent] || accents.gray}`}>
        {value}
      </p>
      {hint && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{hint}</p>
      )}
    </div>
  );
}

function BarChart({ title, data, maxItems = 10, color = 'bg-blue-500', empty = 'Aucune donnée', showPct = true, total }) {
  const top = data.slice(0, maxItems);
  const max = Math.max(1, ...top.map(([, count]) => count));
  const base = total ?? top.reduce((sum, [, c]) => sum + c, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 h-full">
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h3>
        {top.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{top.length} entrées</span>
        )}
      </div>
      <div className="space-y-3">
        {top.map(([label, count], index) => {
          const pct = base > 0 ? Math.round((count / base) * 100) : 0;
          return (
            <div key={`${label}-${index}`}>
              <div className="flex justify-between items-baseline gap-2 text-xs mb-1.5">
                <span className="text-gray-700 dark:text-gray-200 truncate font-medium" title={label}>
                  <span className="text-gray-400 dark:text-gray-500 font-normal mr-1.5 tabular-nums">
                    {index + 1}.
                  </span>
                  {label}
                </span>
                <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 tabular-nums">
                  {count}
                  {showPct && base > 0 && (
                    <span className="text-gray-400 dark:text-gray-500 ml-1.5">{pct}%</span>
                  )}
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 dark:bg-gray-700/80 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
        {top.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">{empty}</p>
        )}
      </div>
    </div>
  );
}

function DecadeChart({ decades, total }) {
  // Afficher chronologiquement, pas seulement par volume
  const chronological = [...decades].sort((a, b) => {
    const ya = parseInt(a[0], 10) || 0;
    const yb = parseInt(b[0], 10) || 0;
    return ya - yb;
  });
  const max = Math.max(1, ...chronological.map(([, c]) => c));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 h-full">
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Par décennie</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">{chronological.length} décennies</span>
      </div>
      {chronological.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">Aucune année renseignée</p>
      ) : (
        <div className="flex items-end gap-1.5 sm:gap-2 h-36 sm:h-44">
          {chronological.map(([label, count]) => {
            const height = Math.max(8, (count / max) * 100);
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={label} className="flex-1 min-w-0 flex flex-col items-center h-full justify-end group">
                <span className="text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-200 tabular-nums mb-1 opacity-80 group-hover:opacity-100">
                  {count}
                </span>
                <div
                  className="w-full max-w-[2.5rem] mx-auto rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 dark:from-blue-500 dark:to-blue-300 transition-all duration-500"
                  style={{ height: `${height}%` }}
                  title={`${label} · ${count} albums (${pct}%)`}
                />
                <span className="mt-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">
                  {label.replace('s', '')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RatingDistribution({ buckets, ratedCount }) {
  const max = Math.max(1, ...buckets.map(([, c]) => c));
  const colors = [
    'bg-red-400 dark:bg-red-500',
    'bg-orange-400 dark:bg-orange-500',
    'bg-blue-400 dark:bg-blue-500',
    'bg-green-500 dark:bg-green-400',
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 h-full">
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Notes IA</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {ratedCount} album{ratedCount !== 1 ? 's' : ''} noté{ratedCount !== 1 ? 's' : ''}
        </span>
      </div>
      {ratedCount === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
          Aucune critique générée pour le moment
        </p>
      ) : (
        <div className="space-y-3">
          {buckets.map(([label, count], i) => {
            const pct = Math.round((count / ratedCount) * 100);
            return (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">{label}</span>
                  <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                    {count} <span className="text-gray-400">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-700/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${colors[i] || colors[0]}`}
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DualAlbumList({ left, right }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700 h-full md:col-span-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 sm:divide-x sm:divide-gray-100 dark:sm:divide-gray-700">
        {[left, right].map((section) => (
          <div key={section.title} className="sm:px-3 first:sm:pl-0 last:sm:pr-0 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">{section.title}</h3>
            {section.albums.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">{section.empty}</p>
            ) : (
              <ol className="space-y-3">
                {section.albums.map((album, index) => (
                  <li key={album.id} className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-xs text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{album.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{album.artist}</p>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 tabular-nums ${album.accentClass}`}>
                      {album.metric}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CollectionDashboard({ collection, albumRatings, albumValues, collectionValue }) {
  const total = collection.length;

  const decades = countBy(collection, (r) => {
    const year = r.basic_information.year;
    if (!year) return null;
    return `${Math.floor(year / 10) * 10}s`;
  });

  const genres = countBy(collection, (r) => r.basic_information.genres || []);
  const styles = countBy(collection, (r) => r.basic_information.styles || []);
  const artists = countBy(collection, (r) => r.basic_information.artists[0]?.name);

  const years = collection
    .map((r) => r.basic_information.year)
    .filter(Boolean)
    .sort((a, b) => a - b);
  const medianYear = years.length > 0 ? medianOf(years.map(Number)) : null;
  const yearSpan =
    years.length > 1 ? `${years[0]} – ${years[years.length - 1]}` : years[0] ? String(years[0]) : null;

  const ratedAlbums = Object.entries(albumRatings)
    .filter(([, rating]) => rating != null && rating > 0)
    .map(([id, rating]) => ({ id, rating: Number(rating) }));

  const avgRating = ratedAlbums.length
    ? ratedAlbums.reduce((a, b) => a + b.rating, 0) / ratedAlbums.length
    : null;

  const ratingBuckets = [
    { label: '< 5', min: 0, max: 5 },
    { label: '5 – 7', min: 5, max: 7 },
    { label: '7 – 8.5', min: 7, max: 8.5 },
    { label: '8.5+', min: 8.5, max: 10.1 },
  ].map(({ label, min, max }) => [
    label,
    ratedAlbums.filter((r) => r.rating >= min && r.rating < max).length,
  ]);

  const valueEntries = Object.entries(albumValues).filter(([, v]) => typeof v === 'number' && v > 0);
  const albumValueNumbers = valueEntries.map(([, v]) => v);
  const totalEstimatedValue = albumValueNumbers.reduce((sum, v) => sum + v, 0);
  const computedMedianFromAlbums = medianOf(albumValueNumbers);
  const discogsMedian = parseMoney(collectionValue?.median);
  const discogsMin = parseMoney(collectionValue?.minimum);
  const discogsMax = parseMoney(collectionValue?.maximum);
  const currency = collectionValue?.currency || '€';
  // Source de vérité pour la médiane affichée : API Discogs collection/value
  const displayMedian = discogsMedian ?? computedMedianFromAlbums;
  const ratedPct = total > 0 ? Math.round((ratedAlbums.length / total) * 100) : 0;

  const byId = new Map(collection.map((r) => [String(r.id), r]));

  const topRated = [...ratedAlbums]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5)
    .map(({ id, rating }) => {
      const release = byId.get(String(id));
      return {
        id,
        title: release?.basic_information?.title || `Album ${id}`,
        artist: release?.basic_information?.artists?.[0]?.name || '—',
        metric: `${rating.toFixed(1)}/10`,
        accentClass: 'text-yellow-600 dark:text-yellow-400',
      };
    });

  const topValue = [...valueEntries]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, value]) => {
      const release = byId.get(String(id));
      return {
        id,
        title: release?.basic_information?.title || `Album ${id}`,
        artist: release?.basic_information?.artists?.[0]?.name || '—',
        metric: `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`,
        accentClass: 'text-green-600 dark:text-green-400',
      };
    });

  const topGenre = genres[0];
  const topArtist = artists[0];
  const topDecade = [...decades].sort((a, b) => b[1] - a[1])[0];

  if (total === 0) {
    return (
      <div className="mb-8 py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">Aucune donnée de collection à analyser.</p>
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold dark:text-white">Stats de la collection</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {total} album{total !== 1 ? 's' : ''}
          {yearSpan ? ` · ${yearSpan}` : ''}
          {topDecade ? ` · pic dans les ${topDecade[0]}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Albums"
          value={total}
          hint={topArtist ? `Top : ${topArtist[0]}` : null}
          accent="blue"
        />
        <StatCard
          label="Année médiane"
          value={medianYear != null ? Math.round(medianYear) : '—'}
          hint={yearSpan}
          accent="gray"
        />
        <StatCard
          label="Valeur médiane"
          value={displayMedian != null ? `${formatEur(displayMedian)} ${currency === 'EUR' ? '€' : currency}` : '—'}
          hint={
            discogsMin != null && discogsMax != null
              ? `${formatEur(discogsMin)} – ${formatEur(discogsMax)} ${currency === 'EUR' ? '€' : currency}`
              : computedMedianFromAlbums != null && discogsMedian == null
                ? `Calculée sur ${valueEntries.length} albums valorisés`
                : 'Valeur Discogs de la collection'
          }
          accent="green"
        />
        <StatCard
          label="Note IA moy."
          value={avgRating != null ? `${avgRating.toFixed(1)}/10` : '—'}
          hint={
            ratedAlbums.length
              ? `${ratedAlbums.length} notés (${ratedPct}%)`
              : 'Aucune critique'
          }
          accent="yellow"
        />
      </div>

      {totalEstimatedValue > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
            Valeur totale (albums valorisés)
          </p>
          <p className="text-xl font-bold text-green-700 dark:text-green-400 mt-1">
            {formatEur(totalEstimatedValue)} €
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Somme des prix unitaires · {valueEntries.length}/{total} albums
            {computedMedianFromAlbums != null && (
              <> · médiane unitaire {formatEur(computedMedianFromAlbums)} €</>
            )}
          </p>
        </div>
      )}

      {(topGenre || topArtist) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topGenre && (
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400 text-sm font-bold">
                G
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Genre dominant</p>
                <p className="font-semibold text-gray-800 dark:text-white truncate">{topGenre[0]}</p>
                <p className="text-xs text-gray-400">
                  {topGenre[1]} album{topGenre[1] !== 1 ? 's' : ''} · {Math.round((topGenre[1] / total) * 100)}%
                </p>
              </div>
            </div>
          )}
          {topArtist && (
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                A
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Artiste le plus présent</p>
                <p className="font-semibold text-gray-800 dark:text-white truncate">{topArtist[0]}</p>
                <p className="text-xs text-gray-400">
                  {topArtist[1]} album{topArtist[1] !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DecadeChart decades={decades} total={total} />
        <RatingDistribution buckets={ratingBuckets} ratedCount={ratedAlbums.length} />
        <BarChart
          title="Top genres"
          data={genres}
          maxItems={8}
          color="bg-sky-500"
          total={genres.reduce((s, [, c]) => s + c, 0)}
          empty="Aucun genre Discogs"
        />
        <BarChart
          title="Top styles"
          data={styles}
          maxItems={8}
          color="bg-teal-500"
          total={styles.reduce((s, [, c]) => s + c, 0)}
          empty="Aucun style Discogs"
        />
        <BarChart
          title="Top artistes"
          data={artists}
          maxItems={10}
          color="bg-blue-500"
          total={total}
          empty="Aucun artiste"
        />
        <DualAlbumList
          left={{
            title: 'Mieux notés (IA)',
            albums: topRated,
            empty: 'Génère des critiques pour voir le classement',
          }}
          right={{
            title: 'Plus chers',
            albums: topValue,
            empty: 'Active le chargement des valeurs Discogs',
          }}
        />
      </div>
    </div>
  );
}
