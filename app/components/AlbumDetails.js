import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function AlbumDetails({ albumId }) {
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (albumId) {
      fetchAlbumDetails();
    }
  }, [albumId]);

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;
  if (!album) return <div>Album non trouvé</div>;

  return (
    <div className="flex flex-col md:flex-row">
      <div className="md:w-1/3 mb-4 md:mb-0">
        <Image
          src={album.images[0].uri}
          alt={album.title}
          width={300}
          height={300}
          className="rounded-lg shadow-lg"
        />
      </div>
      <div className="md:w-2/3 md:pl-8">
        <h1 className="text-3xl font-bold mb-4">{album.title}</h1>
        <p className="text-xl mb-2">{album.artists[0].name}</p>
        <p className="mb-2">Année : {album.year}</p>
        <p className="mb-2">Genre : {album.genres.join(', ')}</p>
        <p className="mb-2">Styles : {album.styles.join(', ')}</p>
        <p className="mb-4">Label : {album.labels[0].name}</p>
        <h2 className="text-2xl font-bold mb-2">Tracklist :</h2>
        <ul className="list-disc list-inside">
          {album.tracklist.map((track, index) => (
            <li key={index}>{track.title} - {track.duration}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
