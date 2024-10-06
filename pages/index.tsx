import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Quagga from 'quagga';
import axios, { AxiosError } from 'axios';
import LoginButton from '../components/LoginButton';
import Image from 'next/image';  // Import Image component

// Define the interfaces
interface Vinyl {
  id: string;
  artist?: string;
  title: string;
  year: string;
  genres?: string[];
  thumbnail: string;
  url?: string;
}

interface DiscogsData {
  id?: number;
  title?: string;
  year?: string;
  thumbnail?: string;
  url?: string;
  genres?: string[];
  artist?: string;
  tracklist?: string[];
  notes?: string;
  country?: string;
  label?: string;
}

interface ErrorResponse {
  error: string;
}

export default function Home() {
  const { data: session } = useSession();  // Removed unused `status`
  const [vinylCollection, setVinylCollection] = useState<Vinyl[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [discogsData, setDiscogsData] = useState<DiscogsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startScanner = () => {
    if (!session) {
      setError("Vous devez être connecté pour scanner.");
      return;
    }
    setScanning(true);
    setError(null);
  };

  useEffect(() => {
    if (scanning) {
      const interactiveElement = document.getElementById('interactive');
      if (!interactiveElement) {
        setError("Le conteneur de scanner n'est pas disponible.");
        setScanning(false);
        return;
      }

      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: interactiveElement,
          constraints: {
            facingMode: "environment",
          },
        },
        decoder: {
          readers: ["ean_reader"],
        },
      }, function (err) {
        if (err) {
          console.error("Erreur lors de l'initialisation de Quagga:", err);
          setError("Erreur lors de l'initialisation du scanner.");
          setScanning(false);
          return;
        }
        Quagga.start();
      });

      Quagga.onDetected((data) => {
        if (data && data.codeResult && data.codeResult.code) {
          setScannedData(data.codeResult.code);
          fetchDiscogsData(data.codeResult.code);
          Quagga.stop();
          setScanning(false);
        }
      });
    }

    return () => {
      if (scanning) {
        Quagga.stop();
      }
    };
  }, [scanning, fetchDiscogsData]);  // Added `fetchDiscogsData` dependency

  const fetchDiscogsData = async (barcode: string) => {
    const token = process.env.NEXT_PUBLIC_DISCOGS_API_TOKEN;

    try {
      const response = await axios.get(
        `https://api.discogs.com/database/search?barcode=${barcode}&token=${token}`
      );

      if (response.data.results.length > 0) {
        const vinylInfo = response.data.results[0];

        setDiscogsData({
          id: vinylInfo.id,
          year: vinylInfo.year,
          thumbnail: vinylInfo.thumb,
          url: vinylInfo.uri,
        });

        const releaseResponse = await axios.get(
          `https://api.discogs.com/releases/${vinylInfo.id}?token=${token}`
        );
        const releaseData = releaseResponse.data;

        const artistNames = releaseData.artists
          ? releaseData.artists.map((artist: { name: string }) => artist.name).join(', ')
          : '';

        setDiscogsData((prevData) => ({
          ...(prevData || {}),
          artist: artistNames,
          title: releaseData.title,
          genres: releaseData.genres || [],
          tracklist: releaseData.tracklist?.map((track: { title: string }) => track.title) || [],
        }));
      } else {
        setError('Aucun résultat trouvé pour ce code-barres.');
        setDiscogsData(null);
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      setError('Erreur lors de la récupération des données Discogs.');
      console.error(axiosError);
    }
  };

  const addVinyl = async () => {
    if (!discogsData || !session?.user) return;

    try {
      await axios.post('/api/vinyls/add', {
        id: discogsData.id,
        artist: discogsData.artist,
        title: discogsData.title,
        genres: discogsData.genres,
        year: discogsData.year,
        thumbnail: discogsData.thumbnail,
        url: discogsData.url,
        userId: session.userId,
      });

      const vinyls = await axios.get('/api/vinyls');
      setVinylCollection(vinyls.data);
      setScannedData(null);
      setDiscogsData(null);

    } catch (err) {
      const axiosError = err as AxiosError;
      if (axiosError.response) {
        const errorData = axiosError.response.data as ErrorResponse;
        setError(errorData.error);
      } else {
        setError('Erreur lors de l\'ajout du vinyle.');
      }
    }
  };

  return (
    <div>
      {!session ? (
        <LoginButton />
      ) : (
        <div>
          <div id="interactive" className="viewport" />

          {scannedData && discogsData && (
            <div>
              <h2>Vinyl Scanné:</h2>
              <Image 
                src={discogsData.thumbnail || ''} 
                alt="thumbnail" 
                width={150} 
                height={150} 
                className="thumbnail"
              />
              <p>{discogsData.artist} - {discogsData.title}</p>
              <p>Genres: {discogsData.genres?.join(', ')}</p>
              <p>Année: {discogsData.year}</p>
              <button onClick={addVinyl}>Ajouter à ma collection</button>
            </div>
          )}
          
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      )}
    </div>
  );
}