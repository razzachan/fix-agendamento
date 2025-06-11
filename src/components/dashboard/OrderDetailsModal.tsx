import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ServiceProgressTracker } from '@/components/ServiceOrders/ProgressTracker';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderDetailsModalProps {
  order: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, newStatus: ServiceOrderStatus, notes?: string) => Promise<void>;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateStatus
}) => {
  if (!order) return null;

  const handleUpdateStatus = async (orderId: string, newStatus: ServiceOrderStatus, notes?: string): Promise<void> => {
    if (onUpdateStatus) {
      await onUpdateStatus(orderId, newStatus, notes);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Detalhes da Ordem - {order.clientName}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 px-6 pb-6">
          <ServiceProgressTracker 
            serviceOrder={order} 
            onUpdateStatus={handleUpdateStatus}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;
