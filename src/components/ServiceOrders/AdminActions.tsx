
import React from 'react';
import NewOrderDialog from './NewOrderDialog';
import { ServiceOrder } from '@/types';

interface AdminActionsProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  onCreateOrder: (data: Partial<ServiceOrder>) => Promise<ServiceOrder | null>;
  onDeleteAllClick: () => void;
}

const AdminActions: React.FC<AdminActionsProps> = ({
  isDialogOpen,
  setIsDialogOpen,
  onCreateOrder,
  onDeleteAllClick
}) => {
  return (
    <div className="flex gap-2">
      <NewOrderDialog 
        isOpen={isDialogOpen} 
        setIsOpen={setIsDialogOpen} 
        onCreateOrder={onCreateOrder} 
      />
    </div>
  );
};

export default AdminActions;
