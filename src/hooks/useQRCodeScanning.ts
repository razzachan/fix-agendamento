/**
 * Hook para escaneamento de QR Codes
 */

import { useState, useCallback, useRef } from 'react';
import { QRTrackingService } from '@/services/qrcode/qrTrackingService';
import { 
  QRCodeScanRequest, 
  QRCodeScanResponse, 
  UseQRCodeScanningReturn,
  TrackingCheckpoint 
} from '@/types/qrcode';
import { toast } from 'sonner';

export function useQRCodeScanning(): UseQRCodeScanningReturn & {
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  isScanning: boolean;
  scanFromCamera: (checkpoint: TrackingCheckpoint, scannedBy: string) => Promise<void>;
  scanFromInput: (qrCode: string, checkpoint: TrackingCheckpoint, scannedBy: string) => Promise<QRCodeScanResponse>;
} {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<QRCodeScanResponse | null>(null);
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /**
   * Processa escaneamento de QR Code
   */
  const scanQRCode = useCallback(async (request: QRCodeScanRequest): Promise<QRCodeScanResponse> => {
    setError(null);

    try {
      console.log('📱 [useQRCodeScanning] Processando escaneamento:', request.qrCode);
      
      const result = await QRTrackingService.processQRCodeScan(request);
      setLastScanResult(result);
      
      if (result.success) {
        toast.success(result.message);
        console.log('✅ [useQRCodeScanning] Escaneamento bem-sucedido');
      } else {
        toast.error(result.message);
        console.log('⚠️ [useQRCodeScanning] Escaneamento falhou:', result.message);
      }
      
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar escaneamento';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ [useQRCodeScanning] Erro:', err);
      
      const failureResult: QRCodeScanResponse = {
        success: false,
        message: errorMessage
      };
      
      setLastScanResult(failureResult);
      return failureResult;
    }
  }, []);

  /**
   * Inicia escaneamento via câmera
   */
  const startScanning = useCallback(async (): Promise<void> => {
    try {
      console.log('📷 [useQRCodeScanning] Iniciando escaneamento via câmera');
      
      setIsScanning(true);
      setError(null);

      // Solicitar acesso à câmera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Câmera traseira preferencialmente
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      toast.success('Câmera ativada! Aponte para o QR Code');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao acessar câmera';
      setError(errorMessage);
      setIsScanning(false);
      toast.error(`Erro ao acessar câmera: ${errorMessage}`);
      console.error('❌ [useQRCodeScanning] Erro ao iniciar câmera:', err);
    }
  }, []);

  /**
   * Para escaneamento
   */
  const stopScanning = useCallback((): void => {
    console.log('🛑 [useQRCodeScanning] Parando escaneamento');
    
    setIsScanning(false);

    // Parar stream de vídeo
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    // Parar scanner se existir
    if (scannerRef.current) {
      scannerRef.current.stop?.();
      scannerRef.current = null;
    }

    toast.info('Escaneamento interrompido');
  }, []);

  /**
   * Escaneia QR Code via câmera
   */
  const scanFromCamera = useCallback(async (
    checkpoint: TrackingCheckpoint, 
    scannedBy: string
  ): Promise<void> => {
    try {
      if (!isScanning) {
        await startScanning();
      }

      // Implementação do scanner seria feita aqui
      // Por enquanto, vamos simular com um prompt
      const qrCode = prompt('Digite o código QR (temporário - será substituído pelo scanner):');
      
      if (qrCode) {
        await scanFromInput(qrCode, checkpoint, scannedBy);
      }

    } catch (err) {
      console.error('❌ [useQRCodeScanning] Erro no escaneamento via câmera:', err);
      toast.error('Erro ao escanear via câmera');
    }
  }, [isScanning, startScanning]);

  /**
   * Escaneia QR Code via input manual
   */
  const scanFromInput = useCallback(async (
    qrCode: string,
    checkpoint: TrackingCheckpoint,
    scannedBy: string
  ): Promise<QRCodeScanResponse> => {
    const request: QRCodeScanRequest = {
      qrCode: qrCode.trim(),
      checkpoint,
      scannedBy,
      location: 'Manual', // Pode ser melhorado com geolocalização
      notes: 'Escaneamento manual'
    };

    return await scanQRCode(request);
  }, [scanQRCode]);

  return {
    scanQRCode,
    startScanning,
    stopScanning,
    scanFromCamera,
    scanFromInput,
    isScanning,
    error,
    lastScanResult
  };
}

export default useQRCodeScanning;
