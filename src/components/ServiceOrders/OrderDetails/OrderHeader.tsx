
import React, { useEffect } from 'react';
import { ServiceOrder } from '@/types';
import { Badge } from '@/components/ui/badge';
import { getServiceFlow, getStatusColor } from '@/utils/serviceFlowUtils';
import StatusChangeButton from './StatusChangeButton';
import WarrantyBadge from '../WarrantyBadge';
import { useDisplayNumber } from '@/hooks/useOrderNumber';

interface OrderHeaderProps {
  order: ServiceOrder;
  onOrderUpdated?: (updatedOrder: ServiceOrder) => void;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({ order, onOrderUpdated }) => {
  const attendanceType = order.serviceAttendanceType;

  const validAttendanceType = attendanceType && ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
    ? attendanceType
    : "em_domicilio";

  const serviceFlow = getServiceFlow(validAttendanceType as any);
  const currentStep = serviceFlow.find(step => step.status === order.status);

  // Usar o hook para obter o número correto da ordem
  const orderNumber = useDisplayNumber(order);

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">{orderNumber}</h3>
          <p className="text-sm text-muted-foreground">
            {order.equipmentType} {order.equipmentModel && `- ${order.equipmentModel}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getStatusColor(order.status)}>
            {currentStep?.label || order.status}
          </Badge>
          {order.serviceAttendanceType && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              {order.serviceAttendanceType === 'em_domicilio' ? 'Em Domicílio' : order.serviceAttendanceType === 'coleta_conserto' ? 'Coleta Conserto' : 'Coleta Diagnóstico'}
            </Badge>
          )}
          <WarrantyBadge serviceOrder={order} />
          {onOrderUpdated && (
            <StatusChangeButton order={order} onOrderUpdated={onOrderUpdated} />
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">{order.clientName}</p>
        {order.pickupAddress && (
          <p className="text-xs text-muted-foreground">
            {order.pickupAddress}, {order.pickupCity} - {order.pickupState}
          </p>
        )}
      </div>
    </div>
  );
};

export default OrderHeader;
