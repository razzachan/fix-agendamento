import React from 'react';
import { ServiceOrder } from '@/types';
import { Image as ImageIcon } from 'lucide-react';

interface OrderEquipmentImageProps {
  order: ServiceOrder;
  className?: string;
}

const OrderEquipmentImage: React.FC<OrderEquipmentImageProps> = ({ order, className = '' }) => {
  // Pegar a primeira imagem se existir
  const firstImage = order.images && order.images.length > 0 ? order.images[0] : null;

  if (!firstImage) {
    return (
      <div className={`aspect-square bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-400">
          <ImageIcon className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Sem imagem</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`aspect-square rounded-lg overflow-hidden ${className}`}>
      <img
        src={firstImage.url}
        alt={firstImage.name || 'Imagem do equipamento'}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
};

export default OrderEquipmentImage;
