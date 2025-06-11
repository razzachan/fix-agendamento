
import { ServiceOrderImage } from '@/types';
import { generateUUID } from '@/utils/uuid';

export const validateImageFile = (file: File): string | null => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return "Tipo de arquivo não suportado. Por favor, selecione apenas imagens.";
  }
  
  // Check file size (limit to 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return "Arquivo muito grande. O tamanho máximo permitido é 5MB.";
  }
  
  return null;
};

export const createImagePreview = (file: File): ServiceOrderImage => {
  const imageUrl = URL.createObjectURL(file);
  return {
    id: generateUUID(),
    url: imageUrl,
    name: file.name
  };
};

export const cleanupImageUrls = (images: ServiceOrderImage[]): void => {
  images.forEach(image => {
    if (image.url && image.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(image.url);
      } catch (error) {
        console.error('Erro ao revogar URL de blob:', error);
      }
    }
  });
};
