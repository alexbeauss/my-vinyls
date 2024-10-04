import { useState, useEffect } from 'react';
import Quagga from 'quagga';
import axios from 'axios';
import LoginButton from '../components/LoginButton';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]';

// Fetch session on the server side using getServerSideProps
export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);
  console.log('Server-side session:', session); // For debugging purposes

  return {
    props: {
      session,
    },
  };
}


export default function Home(session) {
  const [vinylCollection, setVinylCollection] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [discogsData, setDiscogsData] = useState(null);
  const [error, setError] = useState(null);

  console.log('Session:', session ); // For debugging purposes

  // Function to start the scanner
  const startScanner = () => {
    setScanning(true);
    setError(null);
  };

  // Use useEffect to initialize Quagga once scanning is activated
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
            facingMode: "environment", // Use the rear camera
          },
        },
        decoder: {
          readers: ["ean_reader"], // EAN-13 barcode scanner
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
          fetchDiscogsData(data.codeResult.code); // Fetch Discogs data
          Quagga.stop();
          setScanning(false);
        }
      });
    }

    // Clean up when the component unmounts
    return () => {
      if (scanning) {
        Quagga.stop();
      }
    };
  }, [scanning]);

  // Function to fetch Discogs data via their API
  const fetchDiscogsData = async (barcode) => {
    const token = process.env.NEXT_PUBLIC_DISCOGS_API_TOKEN;
    try {
      const response = await axios.get(`https://api.discogs.com/database/search?barcode=${barcode}&token=${token}`);
      if (response.data.results.length > 0) {
        const vinylInfo = response.data.results[0];
        setDiscogsData({
          title: vinylInfo.title,
          year: vinylInfo.year,
          thumbnail: vinylInfo.thumb,
        });
      } else {
        setError("Aucun résultat trouvé pour ce code-barres.");
        setDiscogsData(null);
      }
    } catch (err) {
      setError("Erreur lors de la récupération des données Discogs.");
      console.error(err);
    }
  };

  // Function to add vinyl to the collection
const addVinyl = async () => {
  if (!discogsData) return;

  try {
    const newVinyl = await axios.post('/api/vinyls/add', {
      barcode: scannedData,
      title: discogsData.title,
      year: discogsData.year,
      thumbnail: discogsData.thumbnail,
      userId: session?.user?.id, // Use session from props
    },
    {
      headers: {
        Authorization: `Bearer ${session?.token}`, // Pass the session token if available
      },
      withCredentials: true, // Send cookies if necessary
    });

    console.log("Vinyl ajouté : ", newVinyl.data);

    // Fetch the updated vinyl collection
    const vinyls = await axios.get('/api/vinyls');
    setVinylCollection(vinyls.data);

    // Reset the scanned data and discogs data after adding the vinyl
    setScannedData(null);
    setDiscogsData(null);

  } catch (error) {
    // Check for specific error response
    if (error.response && error.response.status === 409) {
      setError(error.response.data.error); // Display error message from the server
    } else {
      setError("Erreur lors de l'ajout du vinyle."); // General error message
      console.error('Erreur lors de l\'ajout du vinyle:', error);
    }
  }
};

  // Function to fetch the user's vinyl collection
  const fetchVinyls = async () => {
    try {
      const response = await axios.get('/api/vinyls');
      setVinylCollection(response.data);
    } catch (err) {
      console.error('Erreur lors de la récupération des vinyles:', err);
    }
  };

  // Fetch the vinyl collection when the session is available
  useEffect(() => {
    if (session) {
      fetchVinyls();
    }
  }, [session]);

  // If the user is not authenticated, prompt them to log in
  if (!session) {
    return (
      <div>
        <h1>Gestionnaire de Collection de Vinyles</h1>
        <p>Vous devez être connecté pour voir vos vinyles</p>
        <LoginButton /> {/* Button to handle login */}
      </div>
    );
  }

  // Render the rest of the app when the user is authenticated
  return (
    <div style={{ padding: "20px" }}>
      <h1>Gestionnaire de Collection de Vinyles</h1>
      
      <LoginButton />

      {/* Scanner status message */}
      <div id="scanner-container" style={{ width: '100%', height: '50px', marginBottom: '20px', backgroundColor: '#f0f0f0' }}>
        {scanning ? <p>Scanning en cours...</p> : <p>Appuyez pour scanner un code-barres</p>}
      </div>

      {/* Scanner zone only appears when "scanning" is true */}
      {scanning && (
        <div id="interactive" style={{ width: '300px', height: '200px', position: 'relative', backgroundColor: '#000' }}></div>
      )}

      {/* Button to start the scanner */}
      <button onClick={startScanner} disabled={scanning} style={{ marginBottom: '20px' }}>
        {scanning ? 'Scan en cours...' : 'Démarrer le scanner'}
      </button>

      {/* Display scanned vinyl information */}
      {scannedData && discogsData && (
        <>
          <h2>Informations du vinyle scanné</h2>
          <p><strong>Titre :</strong> {discogsData.title}</p>
          <p><strong>Année :</strong> {discogsData.year}</p>
          <img src={discogsData.thumbnail} alt="thumbnail" />
          <button onClick={addVinyl}>Ajouter à la collection</button>
        </>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Display the user's vinyl collection */}
      <h2>Ma Collection de Vinyles</h2>
      <div className="vinyl-collection-grid">
        {vinylCollection.map((vinyl) => (
          <div key={vinyl.id} className="vinyl-item">
            <img src={vinyl.thumbnail} alt={vinyl.title} width={100} />
            <div>
              <strong>{vinyl.title}</strong> - ({vinyl.year})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}