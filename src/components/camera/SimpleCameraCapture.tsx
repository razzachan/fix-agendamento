import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleCameraCaptureProps {
  onCapture: (photoBlob: Blob) => Promise<void> | void;
  onCancel: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>; // Opcional agora
}

const SimpleCameraCapture: React.FC<SimpleCameraCaptureProps> = ({
  onCapture,
  onCancel,
  videoRef: externalVideoRef,
}) => {
  // Usar videoRef interno para garantir que existe
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  // Usar o videoRef externo se disponível, senão usar o interno
  const videoRef = externalVideoRef || internalVideoRef;
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'active' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Iniciando câmera...');
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    // Aguardar o DOM estar pronto antes de iniciar
    const timer = setTimeout(() => {
      if (!isStarting && videoRef.current) {
        console.log('🎬 DOM pronto, iniciando câmera...');
        startCamera();
      } else if (!videoRef.current) {
        console.error('❌ VideoRef não encontrado no useEffect');
        setCameraStatus('error');
        setErrorMessage('Elemento de vídeo não foi criado corretamente');
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      // Cleanup FORÇADO
      cleanup();
    };
  }, []);

  const cleanup = () => {
    try {
      // Parar TODOS os streams de mídia
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Track parada:', track.kind);
        });
        videoRef.current.srcObject = null;
      }

      // Parar TODOS os streams globais (fallback)
      navigator.mediaDevices.getUserMedia({ video: false, audio: false }).catch(() => {});

    } catch (error) {
      console.warn('Erro no cleanup:', error);
    }
  };

  const handleCapture = async () => {
    console.log('📸 [SimpleCameraCapture] Iniciando captura...');

    if (!videoRef.current) {
      console.error('❌ Video element não encontrado');
      return;
    }

    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      console.error('❌ Video não carregado');
      return;
    }

    try {
      console.log('🎨 Criando canvas...');
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('❌ Não foi possível obter contexto do canvas');
        return;
      }

      console.log('🖼️ Desenhando imagem no canvas...');
      ctx.drawImage(videoRef.current, 0, 0);

      console.log('📦 Convertendo para blob...');
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('✅ Blob criado:', blob.size, 'bytes');
            resolve(blob);
          } else {
            console.error('❌ Falha ao criar blob');
            reject(new Error('Falha ao criar blob'));
          }
        }, 'image/jpeg', 0.8);
      });

      console.log('📤 Chamando callback onCapture...');
      await onCapture(blob);
      console.log('✅ Captura concluída');

    } catch (error) {
      console.error('❌ Erro na captura:', error);
    }
  };

  const startCamera = async () => {
    // Prevenir múltiplas chamadas
    if (isStarting) {
      console.log('⚠️ Câmera já está sendo iniciada, ignorando...');
      return;
    }

    setIsStarting(true);

    try {
      setCameraStatus('loading');
      setStatusMessage('Iniciando câmera...');

      // VERIFICAÇÃO 1: VideoRef existe?
      if (!videoRef.current) {
        console.error('❌ VideoRef é null no início');
        setStatusMessage('Aguardando elemento de vídeo...');
        setDebugInfo('VideoRef é null, aguardando...');

        // Tentar aguardar um pouco mais
        await new Promise(resolve => setTimeout(resolve, 200));

        if (!videoRef.current) {
          throw new Error('Elemento de vídeo não foi encontrado. Tente fechar e abrir o modal novamente.');
        }
      }

      console.log('✅ VideoRef encontrado:', videoRef.current);
      setStatusMessage('Elemento de vídeo encontrado');
      setDebugInfo('VideoRef OK');

      // PRIMEIRO: Limpar qualquer stream anterior
      cleanup();
      setStatusMessage('Limpando streams anteriores...');

      // Aguardar um pouco para garantir que streams foram liberados
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verificar se getUserMedia está disponível
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Câmera não suportada neste navegador');
      }

      setStatusMessage('Solicitando acesso à câmera...');

      // Configuração MÍNIMA para evitar conflitos
      const constraints = {
        video: {
          facingMode: 'environment'
        },
        audio: false
      };

      console.log('🎯 Solicitando acesso à câmera...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('✅ Stream obtido:', stream.id);
      setStatusMessage('Acesso à câmera concedido!');
      setDebugInfo(`Stream ID: ${stream.id}`);

      // VERIFICAÇÃO 2: VideoRef ainda existe após getUserMedia?
      if (!videoRef.current) {
        console.error('❌ VideoRef perdido após getUserMedia');
        stream.getTracks().forEach(track => track.stop());
        throw new Error('Elemento de vídeo foi perdido durante o processo. Tente novamente.');
      }

      console.log('✅ VideoRef ainda válido após getUserMedia');
      setStatusMessage('Configurando vídeo...');

      // Configurar vídeo
      const video = videoRef.current;
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;

      // Aguardar carregar com timeout menor
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout ao carregar vídeo'));
        }, 3000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          const width = video.videoWidth || 0;
          const height = video.videoHeight || 0;
          console.log(`📐 Vídeo carregado: ${width}x${height}`);
          setStatusMessage('Câmera ativa e funcionando!');
          setDebugInfo(`Resolução: ${width}x${height}`);
          setCameraStatus('active');
          resolve();
        };

        video.onerror = (e) => {
          clearTimeout(timeout);
          console.error('Erro no vídeo:', e);
          reject(new Error('Erro no elemento de vídeo'));
        };
      });

      // Tentar iniciar reprodução
      try {
        await video.play();
        console.log('▶️ Vídeo iniciado com sucesso');
        setStatusMessage('Câmera funcionando perfeitamente!');
        setDebugInfo('Vídeo reproduzindo');
      } catch (playError) {
        console.warn('Aviso no play:', playError);
        // Não falhar por causa do play, pode funcionar mesmo assim
      }

    } catch (error: any) {
      console.error('❌ Erro na câmera:', error);
      setCameraStatus('error');

      let message = 'Erro desconhecido';
      if (error.name === 'NotAllowedError') {
        message = 'Permissão da câmera foi negada';
      } else if (error.name === 'NotFoundError') {
        message = 'Nenhuma câmera encontrada no dispositivo';
      } else if (error.name === 'NotReadableError') {
        message = 'Câmera ocupada. Feche outros apps que usam câmera';
      } else if (error.name === 'OverconstrainedError') {
        message = 'Configuração de câmera não suportada';
      } else {
        message = error.message || 'Erro ao acessar câmera';
      }

      setErrorMessage(message);
      setStatusMessage('Erro na câmera');
      setDebugInfo(message);

      // Cleanup em caso de erro
      cleanup();
    } finally {
      setIsStarting(false);
    }
  };

  if (cameraStatus === 'error') {
    return (
      <div className="space-y-4">
        {/* Status Visual de Erro como no exemplo */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Erro na Câmera</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
          {debugInfo && (
            <p className="text-gray-500 text-xs mt-1">Debug: {debugInfo}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={async () => {
              // Cleanup completo antes de tentar novamente
              cleanup();
              await new Promise(resolve => setTimeout(resolve, 1000));
              startCamera();
            }}
            variant="outline"
            disabled={isStarting}
          >
            {isStarting ? 'Tentando...' : 'Tentar Novamente'}
          </Button>
          <Button onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (cameraStatus === 'loading') {
    return (
      <div className="space-y-4">
        {/* Status Visual como no exemplo */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Status da Câmera</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{statusMessage}</p>
          {debugInfo && (
            <p className="text-gray-500 text-xs mt-1">{debugInfo}</p>
          )}
        </div>

        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">Aguarde...</p>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <Button onClick={startCamera} variant="outline" disabled={isStarting}>
            Tentar Novamente
          </Button>
          <Button onClick={onCancel} variant="outline">
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // Câmera ativa
  return (
    <div className="space-y-4">
      {/* DEBUG INFO */}
      <div className="bg-green-100 p-2 text-xs rounded">
        <div>✅ Câmera Ativa - Status: {cameraStatus}</div>
        <div>🎥 VideoRef: {videoRef.current ? '✅ Existe' : '❌ Null'}</div>
        <div>📐 Dimensões: {videoRef.current ? `${videoRef.current.videoWidth || 0}x${videoRef.current.videoHeight || 0}` : 'N/A'}</div>
      </div>

      {/* Preview da câmera */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black border-4 border-green-500">
        <div className="absolute top-2 left-2 bg-white px-2 py-1 text-xs z-10">
          📹 CÂMERA ATIVA
        </div>
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{
            backgroundColor: 'black',
            minHeight: '200px'
          }}
        />
      </div>

      {/* Botões */}
      <div className="flex justify-center gap-2">
        <Button
          onClick={handleCapture}
          className="gap-2"
          disabled={cameraStatus !== 'active'}
        >
          <Camera className="h-4 w-4" />
          Capturar Foto
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

export default SimpleCameraCapture;
