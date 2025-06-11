
import React, { RefObject, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';

interface CameraCaptureProps {
  onCapture: () => void;
  onCancel: () => void;
  videoRef: RefObject<HTMLVideoElement>;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel, videoRef }) => {
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        toast.error('Não foi possível acessar a câmera. Verifique as permissões.');
        onCancel();
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [onCancel, videoRef]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex justify-center gap-2">
        <Button onClick={onCapture} className="gap-2">
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

export default CameraCapture;
