
import React from 'react';
import { ServiceOrderImage } from '@/types';
import ImagePreview from './ImagePreview';
import AddImageButton from './AddImageButton';

interface ImageGalleryProps {
  images: ServiceOrderImage[];
  onRemoveImage: (id: string) => void;
  onAddClick: () => void;
  maxImages: number;
  isLoading: boolean;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ 
  images, 
  onRemoveImage, 
  onAddClick, 
  maxImages,
  isLoading
}) => {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {images.map((image) => (
        <ImagePreview 
          key={image.id} 
          image={image} 
          onRemove={onRemoveImage} 
        />
      ))}
      
      {images.length < maxImages && (
        <AddImageButton 
          onClick={onAddClick} 
          disabled={isLoading} 
        />
      )}
    </div>
  );
};

export default ImageGallery;
