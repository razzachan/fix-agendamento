
import React from 'react';
import { HomeIcon, Truck, Settings, Package } from 'lucide-react';

interface LocationInfoProps {
  location: string | undefined;
}

export const getLocationIcon = (location: string | undefined) => {
  switch (location) {
    case 'client':
      return <HomeIcon className="h-4 w-4" />;
    case 'transit':
      return <Truck className="h-4 w-4" />;
    case 'workshop':
      return <Settings className="h-4 w-4" />;
    case 'delivered':
      return <Package className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
};

export const getLocationLabel = (location: string | undefined) => {
  switch (location) {
    case 'client':
      return 'Cliente';
    case 'transit':
      return 'Em Trânsito';
    case 'workshop':
      return 'Oficina';
    case 'delivered':
      return 'Entregue';
    default:
      return 'Desconhecido';
  }
};

const LocationInfo: React.FC<LocationInfoProps> = ({ location }) => {
  return (
    <div className="flex items-center gap-1.5">
      {getLocationIcon(location)}
      <span>{getLocationLabel(location)}</span>
    </div>
  );
};

export default LocationInfo;
