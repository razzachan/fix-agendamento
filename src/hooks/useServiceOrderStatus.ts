
import { useState } from 'react';
import { toast } from 'sonner';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import { getServiceFlow } from '@/utils/serviceFlowUtils';

interface UseServiceOrderStatusProps {
  serviceOrder: ServiceOrder;
  onUpdateStatus: (serviceOrderId: string, status: string) => Promise<boolean>;
}

export const useServiceOrderStatus = ({ serviceOrder, onUpdateStatus }: UseServiceOrderStatusProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  
  const attendanceType = serviceOrder.serviceAttendanceType || 'em_domicilio';
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType) 
    ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
    : "em_domicilio";
  
  const serviceFlow = getServiceFlow(validType);
  const currentStatusIndex = serviceFlow.findIndex(step => step.status === serviceOrder.status);
  const progressPercentage = currentStatusIndex >= 0 
    ? (currentStatusIndex / Math.max(1, serviceFlow.length - 1)) * 100 
    : 0;

  const getNextStatus = (): string | null => {
    if (currentStatusIndex === -1 || currentStatusIndex === serviceFlow.length - 1) {
      return null;
    }
    const nextStatus = serviceFlow[currentStatusIndex + 1].status;
    console.log(`Next status for ${serviceOrder.id} (${validType}): ${nextStatus}`);
    return nextStatus;
  };

  const handleUpdateStatus = async () => {
    const nextStatus = getNextStatus();
    if (!nextStatus || isUpdating) return;
    
    if (serviceOrder.status === 'collected' && nextStatus === 'at_workshop') {
      setPendingStatus(nextStatus);
      return true; // Return true to indicate workshop verification is needed
    }

    if (nextStatus === 'collected') {
      setPendingStatus(nextStatus);
      return true; // Return true to indicate photo capture is needed
    }
    
    setIsUpdating(true);
    try {
      console.log(`Trying to update order ${serviceOrder.id} to status: ${nextStatus}`);
      const success = await onUpdateStatus(serviceOrder.id, nextStatus);
      
      if (success) {
        const nextStep = serviceFlow.find(step => step.status === nextStatus);
        toast.success(`Status atualizado para: ${nextStep?.label || nextStatus}`);
      } else {
        toast.error('Não foi possível atualizar o status.');
      }
      return success;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do serviço.');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusConfirmation = async () => {
    if (!pendingStatus) return false;
    
    setIsUpdating(true);
    try {
      const success = await onUpdateStatus(serviceOrder.id, pendingStatus);
      
      if (success) {
        const nextStep = serviceFlow.find(step => step.status === pendingStatus);
        toast.success(`Status atualizado para: ${nextStep?.label || pendingStatus}`);
      } else {
        toast.error('Não foi possível atualizar o status.');
      }
      return success;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do serviço.');
      return false;
    } finally {
      setIsUpdating(false);
      setPendingStatus(null);
    }
  };

  return {
    isUpdating,
    pendingStatus,
    setPendingStatus,
    progressPercentage,
    serviceFlow,
    getNextStatus,
    handleUpdateStatus,
    handleStatusConfirmation
  };
};
