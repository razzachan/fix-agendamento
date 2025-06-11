
import React from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import OrderHeader from './OrderHeader';
import ServiceTimelineDropdown from './ServiceTimelineDropdown';
import NextStatusButton from './NextStatusButton';
import AttendanceTypeInfo from './AttendanceTypeInfo';
import { CancelOrderButton } from '@/components/ServiceOrders/CancelOrder/CancelOrderButton';
import { cancelOrderService } from '@/services/serviceOrder/cancelOrderService';

interface ServiceProgressTrackerProps {
  serviceOrder: ServiceOrder;
  onUpdateStatus: (serviceOrderId: string, status: string) => Promise<boolean>;
}

export const ServiceProgressTracker: React.FC<ServiceProgressTrackerProps> = ({
  serviceOrder,
  onUpdateStatus,
}) => {
  const handleCancelOrder = async (orderId: string, cancellationReason: string) => {
    console.log('🎯 [ServiceProgressTracker] Processando cancelamento:', { orderId, cancellationReason });

    const success = await cancelOrderService.cancelOrder(orderId, cancellationReason, 'Técnico');

    if (success) {
      // Atualizar status para 'cancelled' através do callback
      await onUpdateStatus(orderId, 'cancelled');
    }
  };

  return (
    <Card className="shadow-md">
      <CardContent className="p-4 space-y-6">
        <OrderHeader serviceOrder={serviceOrder} />
        <ServiceTimelineDropdown serviceOrder={serviceOrder} />

        {/* Botões de ação */}
        <div className="flex flex-col gap-3">
          <NextStatusButton serviceOrder={serviceOrder} onUpdateStatus={onUpdateStatus} />

          {/* Botão de cancelamento */}
          <div className="flex justify-center">
            <CancelOrderButton
              serviceOrder={serviceOrder}
              onCancelOrder={handleCancelOrder}
            />
          </div>
        </div>

        <AttendanceTypeInfo serviceOrder={serviceOrder} />
      </CardContent>
    </Card>
  );
};

export default ServiceProgressTracker;
