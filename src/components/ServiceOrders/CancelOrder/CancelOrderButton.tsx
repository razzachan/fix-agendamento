import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceOrder } from '@/types';
import { CancelOrderModal } from './CancelOrderModal';

interface CancelOrderButtonProps {
  serviceOrder: ServiceOrder;
  onCancelOrder: (orderId: string, cancellationReason: string) => Promise<void>;
  isUpdating?: boolean;
}

export const CancelOrderButton: React.FC<CancelOrderButtonProps> = ({
  serviceOrder,
  onCancelOrder,
  isUpdating = false
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  console.log('🎯 [CancelOrderButton] Renderizando para ordem:', {
    id: serviceOrder.id,
    status: serviceOrder.status,
    clientName: serviceOrder.clientName
  });

  // Não mostrar botão para ordens já canceladas ou concluídas
  if (serviceOrder.status === 'cancelled' || serviceOrder.status === 'completed') {
    return null;
  }

  const handleCancelConfirm = async (cancellationReason: string) => {
    setIsCancelling(true);
    try {
      console.log('🎯 [CancelOrderButton] Processando cancelamento:', {
        orderId: serviceOrder.id,
        reason: cancellationReason
      });

      await onCancelOrder(serviceOrder.id, cancellationReason);
      
      toast.success(`Ordem de serviço cancelada: ${serviceOrder.clientName}`);
      setShowCancelModal(false);
    } catch (error) {
      console.error('❌ Erro ao cancelar ordem:', error);
      toast.error('Erro ao cancelar ordem de serviço.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowCancelModal(true)}
        disabled={isUpdating || isCancelling}
        className="flex items-center gap-2"
      >
        <AlertTriangle className="w-4 h-4" />
        {isCancelling ? 'Cancelando...' : 'Cancelar Ordem'}
      </Button>

      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        serviceOrder={serviceOrder}
        onConfirm={handleCancelConfirm}
        isLoading={isCancelling}
      />
    </>
  );
};
