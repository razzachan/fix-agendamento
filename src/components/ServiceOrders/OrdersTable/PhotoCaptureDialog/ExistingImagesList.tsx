
import React from 'react';
import { Trash2 } from 'lucide-react';
import { ServiceOrderImage } from '@/types';

interface ExistingImagesListProps {
  images: ServiceOrderImage[];
  onDelete: (id: string) => void;
  isDeletingImage: boolean;
}

const ExistingImagesList: React.FC<ExistingImagesListProps> = ({
  images,
  onDelete,
  isDeletingImage
}) => {
  if (images.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Fotos existentes:</h3>
      <div className="grid grid-cols-2 gap-2">
        {images.map((image) => (
          <div key={image.id} className="relative aspect-square rounded-md overflow-hidden border">
            <img
              src={image.url}
              alt={image.name}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => onDelete(image.id)}
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
  );
};

export default ExistingImagesList;
