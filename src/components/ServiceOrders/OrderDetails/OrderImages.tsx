
import React, { useState, useEffect } from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image as ImageIcon, ExternalLink, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

interface OrderImagesProps {
  serviceOrder: ServiceOrder;
}

const OrderImages: React.FC<OrderImagesProps> = ({ serviceOrder }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [images, setImages] = useState<ServiceOrder['images']>(serviceOrder.images || []);
  const queryClient = useQueryClient();

  // Update images when serviceOrder changes
  useEffect(() => {
    setImages(serviceOrder.images || []);
  }, [serviceOrder]);
  
  if (!images || images.length === 0) {
    return null;
  }

  const handleImageClick = (imageUrl: string, imageId: string) => {
    setSelectedImage(imageUrl);
    setSelectedImageId(imageId);
  };

  const handleDeleteImage = async () => {
    if (!selectedImageId || isDeleting) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('service_order_images')
        .delete()
        .eq('id', selectedImageId);

      if (error) throw error;

      // Update local state immediately to remove the deleted image
      setImages(currentImages => 
        currentImages?.filter(img => img.id !== selectedImageId) || []
      );

      // Close the dialog
      setSelectedImage(null);
      setSelectedImageId(null);
      
      // Refresh the service order data in the background
      await queryClient.invalidateQueries({ queryKey: ['serviceOrder', serviceOrder.id] });
      await queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      
      toast.success('Imagem excluída com sucesso');
    } catch (error) {
      console.error('Erro ao excluir imagem:', error);
      toast.error('Erro ao excluir imagem. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5" />
            Imagens da Ordem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative aspect-square group">
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover rounded-lg border border-gray-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <button
                    onClick={() => handleImageClick(image.url, image.id)}
                    className="text-white text-sm bg-black/60 px-4 py-2 rounded-full hover:bg-black/80 transition-colors flex items-center gap-1"
                  >
                    Ver imagem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedImage} onOpenChange={(open) => {
        if (!open) {
          setSelectedImage(null);
          setSelectedImageId(null);
        }
      }}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>Visualização da Imagem</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center">
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Imagem ampliada" 
                className="max-h-[70vh] max-w-full object-contain rounded-md"
              />
            )}
            <div className="mt-4 flex justify-between w-full">
              <Button 
                variant="destructive" 
                onClick={handleDeleteImage} 
                disabled={isDeleting}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Excluindo...' : 'Excluir imagem'}
              </Button>
              
              <a
                href={selectedImage || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir em nova aba
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrderImages;
