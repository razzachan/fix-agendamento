
import React, { useState, useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';
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
import ExistingImagesList from './ExistingImagesList';
import CameraCapture from './CameraCapture';

interface PhotoCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess: () => void;
}

export const PhotoCaptureDialog: React.FC<PhotoCaptureDialogProps> = ({
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
      
      setShowCamera(false);
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
      if (!isOpen && videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
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
          <ExistingImagesList 
            images={localExistingImages}
            onDelete={handleDeleteImage}
            isDeletingImage={isDeletingImage}
          />

          {showCamera ? (
            <CameraCapture 
              onCapture={capturePhoto}
              onCancel={() => setShowCamera(false)}
              videoRef={videoRef}
            />
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
