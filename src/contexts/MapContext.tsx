import React, { createContext, useContext, useState, ReactNode } from 'react';
import AddressMapModal from '@/components/maps/AddressMapModal';

interface MapContextType {
  openAddressMap: (address: string, clientName?: string) => void;
  closeAddressMap: () => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

interface MapProviderProps {
  children: ReactNode;
}

export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapAddress, setMapAddress] = useState('');
  const [mapClientName, setMapClientName] = useState<string | undefined>(undefined);

  const openAddressMap = (address: string, clientName?: string) => {
    setMapAddress(address);
    setMapClientName(clientName);
    setIsMapModalOpen(true);
  };

  const closeAddressMap = () => {
    setIsMapModalOpen(false);
  };

  return (
    <MapContext.Provider value={{ openAddressMap, closeAddressMap }}>
      {children}
      <AddressMapModal
        isOpen={isMapModalOpen}
        onClose={closeAddressMap}
        address={mapAddress}
        clientName={mapClientName}
      />
    </MapContext.Provider>
  );
};

export const useMap = (): MapContextType => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
};
