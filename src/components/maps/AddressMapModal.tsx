import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import AddressMap from './AddressMap';

interface AddressMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  clientName?: string;
}

const AddressMapModal: React.FC<AddressMapModalProps> = ({
  isOpen,
  onClose,
  address,
  clientName,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Localização no Mapa</DialogTitle>
          <DialogDescription>
            {clientName ? `Endereço de ${clientName}` : 'Visualização do endereço'}
          </DialogDescription>
        </DialogHeader>
        <div className="h-[500px] mt-4">
          <AddressMap address={address} height="100%" width="100%" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressMapModal;
