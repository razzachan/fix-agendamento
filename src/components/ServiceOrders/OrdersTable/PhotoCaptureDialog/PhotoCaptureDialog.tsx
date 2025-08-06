
import React, { useState, useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
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
import AndroidCameraCapture from '@/components/camera/AndroidCameraCapture';
import RobustCameraCapture from '@/components/camera/RobustCameraCapture';

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
  
  const [localExistingImages, setLocalExistingImages] = useState<ServiceOrderImage[]>(existingImages);

  useEffect(() => {
    if (JSON.stringify(localExistingImages) !== JSON.stringify(existingImages)) {
      setLocalExistingImages(existingImages);
    }
  }, [existingImages, localExistingImages]);

  const handleImageUpload = async (newImages: ServiceOrderImage[]) => {
    setImages(prevImages => [...prevImages, ...newImages]);
  };

  const capturePhoto = async (photoBlob: Blob) => {
    console.log('🎯 [PhotoCaptureDialog] capturePhoto chamada com blob:', photoBlob.size, 'bytes');

    try {
      console.log('📁 Criando arquivo...');
      const file = new File([photoBlob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      console.log('📁 Arquivo criado:', file.name, file.size, 'bytes', file.type);

      console.log('☁️ Fazendo upload...');
      console.log('☁️ serviceOrderService:', serviceOrderService);
      console.log('☁️ uploadImage function:', serviceOrderService.uploadImage);

      toast.loading('Fazendo upload da foto...');

      const uploadedImage = await serviceOrderService.uploadImage(file);
      console.log('☁️ Resultado do upload:', uploadedImage);

      if (uploadedImage) {
        console.log('✅ Upload concluído:', uploadedImage);
        setImages(prev => {
          console.log('📋 Imagens anteriores:', prev);
          const newImages = [...prev, uploadedImage];
          console.log('📋 Novas imagens:', newImages);
          return newImages;
        });
        toast.success('Foto capturada e salva com sucesso!');
      } else {
        console.error('❌ Upload falhou - retornou null/undefined');
        toast.error('Falha no upload da imagem.');
      }

      console.log('📴 Fechando câmera...');
      setShowCamera(false);
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      toast.error(`Erro ao capturar foto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
    <div className="photo-capture-modal">
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen && videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
          }
          onOpenChange(isOpen);
        }}
      >
      <DialogContent className="sm:max-w-[500px]">
        <div data-testid="photo-capture-content">
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
            // Usar componente ROBUSTO para todos os dispositivos
            <div className="space-y-4">
              <RobustCameraCapture
                onCapture={capturePhoto}
                onCancel={() => setShowCamera(false)}
              />

              {/* Mostrar ImageUploader também */}
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2 text-center">
                  Ou anexe imagens da galeria:
                </p>
                <ImageUploader
                  images={images}
                  onImagesChange={handleImageUpload}
                  maxImages={5}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                <Button
                  onClick={() => {
                    setShowCamera(true);
                  }}
                  className="gap-2"
                >
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
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
};
