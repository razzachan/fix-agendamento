import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Info } from 'lucide-react';
import { toast } from 'sonner';

const CameraDebug: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    console.log(info);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  const startCamera = async () => {
    try {
      addDebugInfo('🎬 Iniciando câmera...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      addDebugInfo(`✅ Stream obtido: ${mediaStream.getTracks().length} tracks`);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        videoRef.current.onloadedmetadata = () => {
          addDebugInfo(`📐 Video carregado: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`);
        };
        
        await videoRef.current.play();
        addDebugInfo('▶️ Video iniciado');
        
        setStream(mediaStream);
        toast.success('Câmera iniciada com sucesso!');
      }
    } catch (error: any) {
      addDebugInfo(`❌ Erro: ${error.name} - ${error.message}`);
      toast.error(`Erro ao iniciar câmera: ${error.message}`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        addDebugInfo(`🛑 Track parado: ${track.kind}`);
      });
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    addDebugInfo('📴 Câmera parada');
  };

  const capturePhoto = async () => {
    if (!videoRef.current) {
      addDebugInfo('❌ Video element não encontrado');
      return;
    }

    if (videoRef.current.videoWidth === 0) {
      addDebugInfo('❌ Video não carregado');
      return;
    }

    try {
      addDebugInfo('📸 Iniciando captura...');
      
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        addDebugInfo('❌ Não foi possível obter contexto do canvas');
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0);
      addDebugInfo(`🎨 Imagem desenhada no canvas: ${canvas.width}x${canvas.height}`);
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao criar blob'));
          }
        }, 'image/jpeg', 0.8);
      });

      addDebugInfo(`📦 Blob criado: ${blob.size} bytes`);
      
      // Criar URL para preview
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `debug_photo_${Date.now()}.jpg`;
      link.click();
      
      addDebugInfo('💾 Foto salva para download');
      toast.success('Foto capturada e baixada!');
      
    } catch (error: any) {
      addDebugInfo(`❌ Erro na captura: ${error.message}`);
      toast.error(`Erro na captura: ${error.message}`);
    }
  };

  const clearDebug = () => {
    setDebugInfo([]);
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Info className="h-5 w-5" />
        Debug da Câmera
      </h2>
      
      <div className="flex gap-2 flex-wrap">
        <Button onClick={startCamera} disabled={!!stream}>
          <Camera className="h-4 w-4 mr-2" />
          Iniciar Câmera
        </Button>
        
        <Button onClick={stopCamera} disabled={!stream} variant="outline">
          Parar Câmera
        </Button>
        
        <Button onClick={capturePhoto} disabled={!stream} variant="default">
          Capturar Foto
        </Button>
        
        <Button onClick={clearDebug} variant="ghost" size="sm">
          Limpar Log
        </Button>
      </div>

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            Câmera não iniciada
          </div>
        )}
      </div>

      <div className="bg-gray-100 p-4 rounded-lg max-h-60 overflow-y-auto">
        <h3 className="font-semibold mb-2">Log de Debug:</h3>
        {debugInfo.length === 0 ? (
          <p className="text-gray-500">Nenhum log ainda...</p>
        ) : (
          <div className="space-y-1 text-sm font-mono">
            {debugInfo.map((info, index) => (
              <div key={index} className="break-all">
                {info}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraDebug;
