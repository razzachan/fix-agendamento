
import { useState } from 'react';
import { ServiceOrderStatus } from '@/types';

interface UseStatusUpdateProps {
  onUpdateStatus?: (orderId: string, newStatus: ServiceOrderStatus) => Promise<void>;
}

export const useStatusUpdate = ({ onUpdateStatus }: UseStatusUpdateProps) => {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  
  const handleStatusChange = async (
    orderId: string, 
    currentStatus: ServiceOrderStatus, 
    newStatus: ServiceOrderStatus
  ) => {
    // Ignore if already updating or no update handler provided
    if (isUpdating || !onUpdateStatus) return;
    
    // If status already matches, nothing to do
    if (currentStatus === newStatus) return;
    
    try {
      setIsUpdating(true);
      setCurrentOrderId(orderId);
      
      // Only allow status change if current status is valid
      if (currentStatus !== 'pending') {
        await onUpdateStatus(orderId, newStatus);
      }
      
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
      setCurrentOrderId(null);
    }
  };
  
  return {
    handleStatusChange,
    isUpdating,
    currentOrderId
  };
};
