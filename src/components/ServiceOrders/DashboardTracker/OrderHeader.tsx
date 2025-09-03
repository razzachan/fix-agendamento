
import React from 'react';
import { ServiceOrder } from '@/types';
import { Badge } from '@/components/ui/badge';
import { getServiceFlow, getStatusColor } from '@/utils/serviceFlowUtils';

interface OrderHeaderProps {
  serviceOrder: ServiceOrder;
  orderNumber: number;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({ serviceOrder, orderNumber }) => {
  const attendanceType = serviceOrder.serviceAttendanceType || 'em_domicilio';
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType) 
    ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
    : "em_domicilio";
  
  const serviceFlow = getServiceFlow(validType);

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">OS #{orderNumber}</h3>
          <p className="text-sm text-muted-foreground">
            {serviceOrder.equipmentType} {serviceOrder.equipmentModel && `- ${serviceOrder.equipmentModel}`}
          </p>
        </div>
        <Badge variant="outline" className={getStatusColor(serviceOrder.status)}>
          {serviceFlow.find(step => step.status === serviceOrder.status)?.label || serviceOrder.status}
        </Badge>
        {serviceOrder.serviceAttendanceType && (
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {serviceOrder.serviceAttendanceType === 'em_domicilio' ? 'Em Domicílio' : serviceOrder.serviceAttendanceType === 'coleta_conserto' ? 'Coleta Conserto' : 'Coleta Diagnóstico'}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">{serviceOrder.clientName}</p>
        <p className="text-xs text-gray-500">
          Tipo de Atendimento: {validType === "em_domicilio" ? "Serviço em Domicílio" : 
          validType === "coleta_conserto" ? "Coleta para Conserto" : 
          validType === "coleta_diagnostico" ? "Coleta para Diagnóstico" : validType}
        </p>
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
