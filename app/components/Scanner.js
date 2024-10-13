"use client";
import { useState, useEffect, useRef } from 'react';
import Quagga from '@ericblade/quagga2';

export default function Scanner() {
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isBrowserReady, setIsBrowserReady] = useState(false);

  useEffect(() => {
    setIsBrowserReady(true);
  }, []);

  useEffect(() => {
    if (isScanning && scannerRef.current) {
      const initQuagga = async () => {
        try {
          await Quagga.init({
            inputStream: {
              name: "Live",
              type: "LiveStream",
              target: scannerRef.current,
              constraints: {
                width: 640,
                height: 480,
                facingMode: "environment"
              },
            },
            decoder: {
              readers: ["ean_reader"]
            }
          });
          
          console.log("Quagga initialization finished. Ready to start");
          Quagga.start();

          Quagga.onDetected((result) => {
            console.log("Code-barres détecté:", result.codeResult.code);
            // Ajoutez ici la logique pour traiter le code-barres détecté
          });
        } catch (err) {
          console.error("Erreur d'initialisation de Quagga:", err);
        }
      };

      initQuagga();

      return () => {
        Quagga.stop();
      };
    }
  }, [isScanning]);

  const lancerScannerCodeBarres = () => {
    setIsScanning(true);
  };

  if (!isBrowserReady) {
    return null; // ou un placeholder si vous préférez
  }

  return (
    <div>
      <button onClick={lancerScannerCodeBarres}>
        Lancer le scanner de code-barres
      </button>
      <div ref={scannerRef} style={{ width: '100%', maxWidth: '640px', height: '480px' }}></div>
    </div>
  );
}
