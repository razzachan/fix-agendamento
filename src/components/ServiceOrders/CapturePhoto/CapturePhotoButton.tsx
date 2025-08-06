import React, { useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { serviceOrderService } from '@/services';
import { ServiceOrderImage } from '@/types';

interface CapturePhotoButtonProps {
  serviceOrderId: string;
  onPhotoAdded: (newImage: ServiceOrderImage) => void;
  disabled?: boolean;
}

const CapturePhotoButton: React.FC<CapturePhotoButtonProps> = ({
  serviceOrderId,
  onPhotoAdded,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const openCamera = async () => {
    setIsOpen(true);
    setIsCapturing(true);

    try {
      // Verificar se a API de permissões está disponível
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (permission.state === 'denied') {
            toast.error('Permissão da câmera negada. Ative a câmera nas configurações do navegador.');
            setIsCapturing(false);
            setIsOpen(false);
            return;
          }
        } catch (permError) {
          console.warn('Não foi possível verificar permissões:', permError);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      toast.success('Câmera ativada com sucesso!');

    } catch (error: any) {
      console.error('Erro ao acessar a câmera:', error);

      let errorMessage = 'Não foi possível acessar a câmera.';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permissão da câmera negada. Ative a câmera nas configurações do navegador.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Câmera está sendo usada por outro aplicativo.';
      }

      toast.error(errorMessage);
      setIsCapturing(false);
      setIsOpen(false);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setCapturedImage(null);
    setIsCapturing(false);
    setIsOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame on the canvas
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);

      // Stop the camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setIsCapturing(false);
    }
  };

  const retakePhoto = async () => {
    setCapturedImage(null);
    setIsCapturing(true);

    try {
      // Verificar se a API de permissões está disponível
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (permission.state === 'denied') {
            toast.error('Permissão da câmera negada. Ative a câmera nas configurações do navegador.');
            setIsCapturing(false);
            return;
          }
        } catch (permError) {
          console.warn('Não foi possível verificar permissões:', permError);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

    } catch (error: any) {
      console.error('Erro ao acessar a câmera:', error);

      let errorMessage = 'Não foi possível acessar a câmera.';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permissão da câmera negada. Ative a câmera nas configurações do navegador.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Câmera está sendo usada por outro aplicativo.';
      }

      toast.error(errorMessage);
      setIsCapturing(false);
    }
  };

  const savePhoto = async () => {
    if (!capturedImage || !serviceOrderId) return;

    setIsSaving(true);

    try {
      // Convert data URL to Blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Create a File object from the Blob
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Upload the image
      const uploadedImage = await serviceOrderService.uploadImage(file);

      if (uploadedImage) {
        // Save the image association with the service order
        await serviceOrderService.saveImages(serviceOrderId, [uploadedImage]);

        // Notify parent component
        onPhotoAdded(uploadedImage);

        toast.success('Foto adicionada com sucesso! A página será recarregada.');
        closeCamera();

        // Forçar uma atualização completa dos dados após um breve delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error('Falha ao fazer upload da imagem');
      }
    } catch (error) {
      console.error('Erro ao salvar foto:', error);
      toast.error('Não foi possível salvar a foto. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={openCamera}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <Camera className="h-4 w-4" />
        Tirar Foto
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Capturar Foto do Equipamento</DialogTitle>
          </DialogHeader>

          <div className="relative aspect-video bg-black rounded-md overflow-hidden">
            {isCapturing ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
            ) : capturedImage ? (
              <img
                src={capturedImage}
                alt="Foto capturada"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-white">Carregando câmera...</p>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <DialogFooter className="flex justify-between sm:justify-between">
            {isCapturing ? (
              <Button
                type="button"
                variant="default"
                onClick={capturePhoto}
              >
                Capturar
              </Button>
            ) : capturedImage ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={retakePhoto}
                >
                  Nova Foto
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={savePhoto}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar Foto'}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CapturePhotoButton;
