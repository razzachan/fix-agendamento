import React, { useState, useEffect, useRef } from 'react';
import { ServiceOrder, ServiceOrderImage } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Upload } from 'lucide-react';
import CapturePhotoButton from './CapturePhotoButton';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { serviceOrderService } from '@/services';

interface StatusChangePhotoPromptProps {
  serviceOrder: ServiceOrder;
  previousStatus?: string;
}

const StatusChangePhotoPrompt: React.FC<StatusChangePhotoPromptProps> = ({
  serviceOrder,
  previousStatus
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Show prompt when status changes to collected or collected_for_diagnosis
    const isCollectionStatus =
      serviceOrder.status === 'collected' ||
      serviceOrder.status === 'collected_for_diagnosis' ||
      serviceOrder.status === 'coletado';

    const wasNotCollected =
      previousStatus !== 'collected' &&
      previousStatus !== 'collected_for_diagnosis' &&
      previousStatus !== 'coletado';

    // Only show the prompt if the status changed to a collection status
    // and it wasn't already in a collection status
    if (isCollectionStatus && wasNotCollected) {
      setShowPrompt(true);
    } else {
      setShowPrompt(false);
    }
  }, [serviceOrder.status, previousStatus]);

  const handlePhotoAdded = async (newImage: ServiceOrderImage) => {
    try {
      // Invalidate queries to refresh the service order data
      await queryClient.invalidateQueries({ queryKey: ['serviceOrder', serviceOrder.id] });
      await queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });

      // Forçar uma atualização completa dos dados
      window.location.reload();

      // Hide the prompt after adding a photo
      setShowPrompt(false);
    } catch (error) {
      console.error('Erro ao atualizar dados após adicionar foto:', error);
      toast.error('Erro ao atualizar dados. Recarregue a página.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setIsDisabled(true);

    try {
      const file = files[0];

      // Upload the image
      const uploadedImage = await serviceOrderService.uploadImage(file);

      if (uploadedImage) {
        // Save the image association with the service order
        await serviceOrderService.saveImages(serviceOrder.id, [uploadedImage]);

        // Notify parent component
        handlePhotoAdded(uploadedImage);

        toast.success('Foto adicionada com sucesso!');
      } else {
        throw new Error('Falha ao fazer upload da imagem');
      }
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error('Não foi possível fazer upload da imagem. Tente novamente.');
    } finally {
      setIsUploading(false);
      setIsDisabled(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <Alert className="mb-4 border-amber-500 bg-amber-50">
      <Camera className="h-5 w-5 text-amber-500" />
      <AlertTitle>Foto do Equipamento</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>
          É importante tirar uma foto do equipamento no momento da coleta.
          Isso ajuda a documentar o estado do equipamento e evitar problemas futuros.
        </p>
        <div className="flex flex-wrap gap-2">
          <CapturePhotoButton
            serviceOrderId={serviceOrder.id}
            onPhotoAdded={handlePhotoAdded}
            disabled={isDisabled || isUploading}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={triggerFileInput}
            disabled={isDisabled || isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Enviando...' : 'Enviar Foto'}
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default StatusChangePhotoPrompt;
