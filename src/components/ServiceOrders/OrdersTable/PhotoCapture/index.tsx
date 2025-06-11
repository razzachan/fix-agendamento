import React, { useState, useEffect, useRef } from 'react';
import { Camera, Trash2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ImageUploader from '@/components/ServiceOrderForm/ImageUploader';
import { ServiceOrderImage } from '@/types';
import { toast } from 'sonner';
import { serviceOrderService } from '@/services';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PhotoCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess: () => void;
}

const PhotoCaptureDialog: React.FC<PhotoCaptureDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  onSuccess
}) => {
  const [images, setImages] = useState<ServiceOrderImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const queryClient = useQueryClient();
  
  const { data: existingImages = [], refetch } = useQuery({
    queryKey: ['serviceOrderImages', orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_order_images')
        .select('*')
        .eq('service_order_id', orderId);
      return data?.map(img => ({
        id: img.id,
        url: img.url,
        name: img.name
      })) || [];
    }
  });
  
  const [localExistingImages, setLocalExistingImages] = useState<ServiceOrderImage[]>([]);
  
  useEffect(() => {
    setLocalExistingImages(existingImages);
  }, [existingImages]);

  const handleImageUpload = async (newImages: ServiceOrderImage[]) => {
    setImages(prevImages => [...prevImages, ...newImages]);
  };

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
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  useEffect(() => {
    if (showCamera) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showCamera]);

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.8);
      });

      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const uploadedImage = await serviceOrderService.uploadImage(file);
      if (uploadedImage) {
        setImages(prev => [...prev, uploadedImage]);
      }
      
      stopCamera();
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Erro ao capturar foto. Tente novamente.');
    }
  };

  const handleSave = async () => {
    if (images.length === 0) {
      toast.error('Por favor, adicione pelo menos uma foto do equipamento.');
      return;
    }

    setIsUploading(true);
    try {
      await serviceOrderService.saveImages(orderId, images);
      toast.success('Fotos salvas com sucesso!');
      onSuccess();
      
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['serviceOrderImages', orderId] });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar imagens:', error);
      toast.error('Erro ao salvar as fotos. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (isDeletingImage) return;

    try {
      setIsDeletingImage(true);
      const { error } = await supabase
        .from('service_order_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;
      
      setLocalExistingImages(current => current.filter(img => img.id !== imageId));
      
      await queryClient.invalidateQueries({ queryKey: ['serviceOrderImages', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['serviceOrder', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      
      toast.success('Imagem excluída com sucesso');
    } catch (error) {
      console.error('Erro ao excluir imagem:', error);
      toast.error('Erro ao excluir imagem. Tente novamente.');
    } finally {
      setIsDeletingImage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        stopCamera();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Capturar Fotos do Equipamento
          </DialogTitle>
          <DialogDescription>
            Tire fotos do equipamento antes de marcá-lo como coletado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {localExistingImages.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Fotos existentes:</h3>
              <div className="grid grid-cols-2 gap-2">
                {localExistingImages.map((image) => (
                  <div key={image.id} className="relative aspect-square rounded-md overflow-hidden border">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      disabled={isDeletingImage}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full hover:bg-black/90"
                      title="Excluir imagem"
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-2 text-xs text-white truncate">
                      {image.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showCamera ? (
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
                <Button onClick={capturePhoto} className="gap-2">
                  <Camera className="h-4 w-4" />
                  Capturar Foto
                </Button>
                <Button variant="outline" onClick={() => setShowCamera(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                <Button onClick={() => setShowCamera(true)} className="gap-2">
                  <Camera className="h-4 w-4" />
                  Usar Câmera
                </Button>
              </div>
              
              <ImageUploader
                images={images}
                onImagesChange={handleImageUpload}
                maxImages={5}
              />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading || isDeletingImage}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={images.length === 0 || isUploading || isDeletingImage}
            >
              {isUploading ? 'Salvando...' : 'Salvar e Continuar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoCaptureDialog;
