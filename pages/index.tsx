import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Quagga from 'quagga';
import axios, { AxiosError } from 'axios';
import LoginButton from '../components/LoginButton';
import { int } from 'aws-sdk/clients/datapipeline';

// Define the interfaces
interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id: string;
}

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
  const { data: session, status } = useSession();
  const [vinylCollection, setVinylCollection] = useState<Vinyl[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [discogsData, setDiscogsData] = useState<DiscogsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  console.log('Session in Home:', session);

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
  }, [scanning]);

  const fetchDiscogsData = async (barcode: string) => {
    const token = process.env.NEXT_PUBLIC_DISCOGS_API_TOKEN;
  
    try {
      const response = await axios.get(
        `https://api.discogs.com/database/search?barcode=${barcode}&token=${token}`
      );
  
      if (response.data.results.length > 0) {
        const vinylInfo = response.data.results[0];
  
        // Initial setting of basic vinyl information
        setDiscogsData({
          id: vinylInfo.id,
          year: vinylInfo.year,
          thumbnail: vinylInfo.thumb,
          url: vinylInfo.uri,
        });
  
        // Second request to get more details using vinyl ID
        const releaseResponse = await axios.get(
          `https://api.discogs.com/releases/${vinylInfo.id}?token=${token}`
        );
        const releaseData = releaseResponse.data;
  
        // Prepare artist names (handle case where there are multiple artists)
        const artistNames = releaseData.artists
          ? releaseData.artists.map((artist: { name: string }) => artist.name).join(', ')
          : '';
  
        // Update DiscogsData with additional information
        setDiscogsData((prevData) => ({
          ...(prevData || {}),
          artist: artistNames, // Artist names as a comma-separated string
          title: releaseData.title,
          genres: releaseData.genres || [], // Genres array
          tracklist: releaseData.tracklist?.map((track: { title: string }) => track.title) || [], // Tracklist titles
        }));
        console.log('Vinyl:', discogsData);
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
      const newVinyl = await axios.post('/api/vinyls/add', {
        id: discogsData.id,
        artist: discogsData.artist,
        title: discogsData.title,
        genres: discogsData.genres,
        year: discogsData.year,
        thumbnail: discogsData.thumbnail,
        url: discogsData.url,
        userId: session.userId,
      }, {
        headers: {
          Authorization: `Bearer ${session?.token}`, // Assuming the token is stored in session
        },
        withCredentials: true,
      });

      const vinyls = await axios.get('/api/vinyls');
      setVinylCollection(vinyls.data);
      setScannedData(null);
      setDiscogsData(null);

    } catch (err) {
      const axiosError = err as AxiosError;
      if (axiosError.response) {
        const errorData = axiosError.response.data as ErrorResponse;
        if (axiosError.response.status === 409) {
          setError(errorData.error);
        } else {
          setError("Erreur lors de l'ajout du vinyle.");
        }
      } else {
        setError("Erreur lors de l'ajout du vinyle.");
      }
      console.error('Erreur lors de l\'ajout du vinyle:', axiosError);
    }
  };

  const fetchVinyls = async () => {
    try {
      const response = await axios.get('/api/vinyls');
      setVinylCollection(response.data);
    } catch (err) {
      const axiosError = err as AxiosError;
      console.error('Erreur lors de la récupération des vinyles:', axiosError);
    }
  };

  useEffect(() => {
    if (session) {
      fetchVinyls();
    }
  }, [session]);

  if (!session) {
    return (
      <div className="container">
        <h1>Gestionnaire de Collection de Vinyles</h1>
        <p>Vous devez être connecté pour voir vos vinyles</p>
        <LoginButton />
      </div>
    );
  }
  
  return (
    <div className="container">
      <h1>Gestionnaire de Collection de Vinyles</h1>
      <LoginButton />

      {scanning && (
        <div id="interactive" className="scanner"></div>
      )}

      <button onClick={startScanner} disabled={scanning} className="button">
        {scanning ? 'Scan en cours...' : 'Démarrer le scanner'}
      </button>

      {scannedData && discogsData && (
        <>
          <h2>Informations du vinyle scanné</h2>
          <p><strong>Titre :</strong> {discogsData.title}</p>
          <p><strong>Année :</strong> {discogsData.year}</p>
          <img src={discogsData.thumbnail} alt="thumbnail" className="thumbnail" />
          <button onClick={addVinyl} className="button">Ajouter à la collection</button>
        </>
      )}

      {error && <p className="error">{error}</p>}

      <h2>Ma Collection de Vinyles</h2>
      <div className="vinyl-collection-grid">
        {vinylCollection.map((vinyl) => (
          <div key={vinyl.id} className="vinyl-item">
            <a href={vinyl.url} target="_blank" rel="noopener noreferrer">
              <img src={vinyl.thumbnail} alt={vinyl.title} className="vinyl-thumbnail" />
            </a>
            <div>
              <p><strong>{vinyl.artist}</strong></p>
              <p>{vinyl.title}</p>
              <p>({vinyl.year})</p>
              <p>{vinyl.genres}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}