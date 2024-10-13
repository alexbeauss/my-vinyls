"use client";
import { useState, useEffect, useRef } from 'react';

export default function Scanner() {
  const [Quagga, setQuagga] = useState(null);
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    import("@ericblade/quagga2").then((quaggaModule) => {
      setQuagga(quaggaModule.default);
    });
  }, []);

  useEffect(() => {
    if (isScanning && Quagga && scannerRef.current) {
      Quagga.init(
        {
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
        },
        (err) => {
          if (err) {
            console.error(err);
            return;
          }
          console.log("Quagga initialization finished. Ready to start");
          Quagga.start();
        }
      );

      Quagga.onDetected((result) => {
        console.log("Code-barres détecté:", result.codeResult.code);
        // Ajoutez ici la logique pour traiter le code-barres détecté
      });

      return () => {
        Quagga.stop();
      };
    }
  }, [isScanning, Quagga]);

  const lancerScannerCodeBarres = () => {
    setIsScanning(true);
  };

  return (
    <div>
      <button onClick={lancerScannerCodeBarres}>
        Lancer le scanner de code-barres
      </button>
      <div ref={scannerRef} style={{ width: '100%', maxWidth: '640px', height: '480px' }}></div>
    </div>
  );
}
