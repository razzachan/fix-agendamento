import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface RobustCameraCaptureProps {
  onCapture: (photoBlob: Blob) => Promise<void> | void;
  onCancel: () => void;
}

const RobustCameraCapture: React.FC<RobustCameraCaptureProps> = ({
  onCapture,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    console.log('🎬 [RobustCamera] Componente montado...');

    // Aguardar um pouco para garantir que o DOM está pronto (especialmente no Android)
    const timer = setTimeout(() => {
      console.log('🚀 [RobustCamera] Iniciando câmera após delay...');
      startCamera();
    }, 100);

    return () => {
      console.log('🧹 [RobustCamera] Componente desmontado, limpando...');
      clearTimeout(timer);
      cleanup();
    };
  }, []);

  const cleanup = () => {
    console.log('🧹 [RobustCamera] Executando cleanup...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 [RobustCamera] Track parada:', track.kind);
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    console.log('🚀 [RobustCamera] Iniciando câmera...');
    setCameraStatus('loading');
    setErrorMessage('');

    try {
      // Verificar se o elemento de vídeo está disponível
      if (!videoRef.current) {
        console.error('❌ [RobustCamera] VideoRef é null no início');
        throw new Error('Elemento de vídeo não encontrado');
      }

      // Verificar se getUserMedia está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Câmera não suportada neste navegador');
      }

      console.log('📱 [RobustCamera] Solicitando acesso à câmera...');
      
      const constraints = {
        video: {
          facingMode: 'environment', // Câmera traseira
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ [RobustCamera] Stream obtido:', stream.getTracks().length, 'tracks');
      
      streamRef.current = stream;

      if (!videoRef.current) {
        console.error('❌ [RobustCamera] VideoRef é null após obter stream');
        throw new Error('Elemento de vídeo não encontrado');
      }

      videoRef.current.srcObject = stream;
      
      // Aguardar o vídeo carregar
      await new Promise<void>((resolve, reject) => {
        if (!videoRef.current) {
          reject(new Error('VideoRef perdido durante carregamento'));
          return;
        }

        const video = videoRef.current;
        
        const onLoadedMetadata = () => {
          console.log('📐 [RobustCamera] Video carregado:', video.videoWidth, 'x', video.videoHeight);
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setCameraStatus('active');
            resolve();
          } else {
            reject(new Error('Vídeo carregado mas sem dimensões válidas'));
          }
        };

        const onError = (e: Event) => {
          console.error('❌ [RobustCamera] Erro no vídeo:', e);
          reject(new Error('Erro ao carregar vídeo'));
        };

        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        video.addEventListener('error', onError, { once: true });

        // Timeout de segurança
        setTimeout(() => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
          if (cameraStatus === 'loading') {
            reject(new Error('Timeout ao carregar vídeo'));
          }
        }, 10000);

        video.play().catch(reject);
      });

      console.log('✅ [RobustCamera] Câmera ativa e funcionando!');

    } catch (error: any) {
      console.error('❌ [RobustCamera] Erro ao iniciar câmera:', error);
      setCameraStatus('error');
      
      let message = 'Erro desconhecido';
      if (error.name === 'NotAllowedError') {
        message = 'Permissão da câmera foi negada. Ative a câmera nas configurações do navegador.';
      } else if (error.name === 'NotFoundError') {
        message = 'Nenhuma câmera encontrada no dispositivo.';
      } else if (error.name === 'NotReadableError') {
        message = 'Câmera está sendo usada por outro aplicativo. Feche outros apps que usam câmera.';
      } else if (error.name === 'OverconstrainedError') {
        message = 'Configuração de câmera não suportada pelo dispositivo.';
      } else {
        message = error.message || 'Erro ao acessar câmera';
      }
      
      setErrorMessage(message);
      cleanup();
    }
  };

  const capturePhoto = async () => {
    if (isCapturing) return;
    
    console.log('📸 [RobustCamera] Iniciando captura...');
    setIsCapturing(true);

    try {
      if (!videoRef.current) {
        throw new Error('Elemento de vídeo não encontrado');
      }

      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        throw new Error('Vídeo não carregado completamente');
      }

      console.log('🎨 [RobustCamera] Criando canvas...');
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Não foi possível criar contexto do canvas');
      }

      console.log('🖼️ [RobustCamera] Desenhando frame no canvas...');
      ctx.drawImage(videoRef.current, 0, 0);

      console.log('📦 [RobustCamera] Convertendo para blob...');
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('✅ [RobustCamera] Blob criado:', blob.size, 'bytes');
            resolve(blob);
          } else {
            reject(new Error('Falha ao criar blob da imagem'));
          }
        }, 'image/jpeg', 0.8);
      });

      console.log('📤 [RobustCamera] Chamando callback onCapture...');
      await onCapture(blob);
      console.log('✅ [RobustCamera] Captura concluída com sucesso!');

    } catch (error: any) {
      console.error('❌ [RobustCamera] Erro na captura:', error);
      toast.error(`Erro ao capturar foto: ${error.message}`);
    } finally {
      setIsCapturing(false);
    }
  };

  // Estado de carregamento
  if (cameraStatus === 'loading') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-600">Iniciando câmera...</p>
          <p className="text-sm text-gray-500 mt-2">Aguarde enquanto acessamos sua câmera</p>
        </div>
        
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Estado de erro
  if (cameraStatus === 'error') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
          <h3 className="font-semibold text-red-800 mb-2">Erro na Câmera</h3>
          <p className="text-red-600 text-center">{errorMessage}</p>
        </div>
        
        <div className="flex justify-center gap-2">
          <Button onClick={startCamera} variant="outline">
            Tentar Novamente
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Câmera ativa
  return (
    <div className="space-y-4">
      {/* Preview da câmera */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Overlay de status */}
        <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
          📹 CÂMERA ATIVA
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-center gap-2">
        <Button 
          onClick={capturePhoto} 
          className="gap-2"
          disabled={isCapturing}
        >
          {isCapturing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {isCapturing ? 'Capturando...' : 'Capturar Foto'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

export default RobustCameraCapture;
