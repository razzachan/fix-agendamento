
import React, { useEffect } from 'react';
import { ServiceOrder } from '@/types';
import { Badge } from '@/components/ui/badge';
import { getServiceFlow, getStatusColor } from '@/utils/serviceFlowUtils';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface OrderHeaderProps {
  serviceOrder: ServiceOrder;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({ serviceOrder }) => {
  // Não usar fallback aqui para visualizar explicitamente se o valor está vindo undefined
  const attendanceType = serviceOrder.serviceAttendanceType;

  // Se não houver tipo de atendimento definido, agora usamos um fallback explícito
  const validAttendanceType = attendanceType && ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
    ? attendanceType
    : "em_domicilio";

  const serviceFlow = getServiceFlow(validAttendanceType as any);
  const currentStep = serviceFlow.find(step => step.status === serviceOrder.status);

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            <DisplayNumber item={serviceOrder} variant="inline" size="md" showIcon={false} />
          </h3>
          <p className="text-sm text-muted-foreground">
            {serviceOrder.equipmentType} {serviceOrder.equipmentModel && `- ${serviceOrder.equipmentModel}`}
          </p>
        </div>
        <Badge variant="outline" className={getStatusColor(serviceOrder.status)}>
          {currentStep?.label || serviceOrder.status}
        </Badge>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">{serviceOrder.clientName}</p>
        {serviceOrder.pickupAddress && (
          <p className="text-xs text-muted-foreground">
            {serviceOrder.pickupAddress}, {serviceOrder.pickupCity} - {serviceOrder.pickupState}
          </p>
        )}
      </div>

      {serviceOrder.description && (
        <p className="text-sm bg-accent/20 p-2 rounded-md">{serviceOrder.description}</p>
      )}
    </div>
  );
};

export default OrderHeader;
