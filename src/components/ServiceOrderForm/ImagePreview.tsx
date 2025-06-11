
import React from 'react';
import { X } from 'lucide-react';
import { ServiceOrderImage } from '@/types';

interface ImagePreviewProps {
  image: ServiceOrderImage;
  onRemove: (id: string) => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ image, onRemove }) => {
  return (
    <div className="relative group rounded-md border overflow-hidden aspect-square">
      <img 
        src={image.url} 
        alt={image.name}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Handle image loading errors
          const target = e.target as HTMLImageElement;
          target.src = '/placeholder.svg';
          target.alt = 'Imagem com erro';
        }}
      />
      <button
        type="button"
        onClick={() => onRemove(image.id)}
        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remover imagem"
      >
        <X className="h-4 w-4 text-white" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-2 text-xs text-white truncate">
        {image.name}
      </div>
    </div>
  );
};

export default ImagePreview;
