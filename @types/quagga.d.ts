declare module 'quagga' {
    export interface QuaggaInitConfig {
      inputStream: {
        name: string;
        type: string;
        target: HTMLElement;
        constraints?: {
          facingMode?: string;
        };
      };
      decoder: {
        readers: string[];
      };
    }
  
    export function init(config: QuaggaInitConfig, callback: (err: Error | null) => void): void;
    export function start(): void;
    export function stop(): void;
    export function onDetected(callback: (data: any) => void): void;
  }