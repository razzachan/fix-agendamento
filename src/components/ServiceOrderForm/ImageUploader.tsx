
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ServiceOrderImage } from '@/types';
import ImageGallery from './ImageGallery';
import { validateImageFile, createImagePreview, cleanupImageUrls } from './imageUtils';
import { serviceOrderService } from '@/services';

interface ImageUploaderProps {
  images: ServiceOrderImage[];
  onImagesChange: (images: ServiceOrderImage[]) => void;
  maxImages?: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  images, 
  onImagesChange, 
  maxImages = 5 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast.error(`Você pode adicionar no máximo ${maxImages} imagens.`);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const newImages: ServiceOrderImage[] = [];
      
      for (const file of Array.from(files)) {
        const validationError = validateImageFile(file);
        
        if (validationError) {
          toast.error(validationError);
          continue;
        }
        
        try {
          const uploadedImage = await serviceOrderService.uploadImage(file);
          if (uploadedImage) {
            newImages.push(uploadedImage);
          }
        } catch (uploadError) {
          console.error('Erro ao fazer upload da imagem:', uploadError);
          toast.error('Não foi possível fazer o upload da imagem.');
        }
      }
      
      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }
    } catch (error) {
      console.error('Erro ao processar imagens:', error);
      toast.error('Ocorreu um erro ao processar as imagens selecionadas.');
    } finally {
      setIsLoading(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [images, maxImages, onImagesChange]);

  const handleRemoveImage = useCallback((id: string) => {
    try {
      const imageToRemove = images.find(img => img.id === id);
      
      if (imageToRemove?.url && imageToRemove.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      
      const updatedImages = images.filter(image => image.id !== id);
      onImagesChange(updatedImages);
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      toast.error('Ocorreu um erro ao remover a imagem.');
    }
  }, [images, onImagesChange]);

  useEffect(() => {
    return () => cleanupImageUrls(images);
  }, [images]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Imagens anexadas ({images.length}/{maxImages})</h3>
        
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={handleButtonClick}
          disabled={isLoading || images.length >= maxImages}
        >
          <Paperclip className="h-4 w-4 mr-2" />
          Anexar imagem
        </Button>
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={isLoading || images.length >= maxImages}
        />
      </div>
      
      <ImageGallery 
        images={images}
        onRemoveImage={handleRemoveImage}
        onAddClick={handleButtonClick}
        maxImages={maxImages}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ImageUploader;
