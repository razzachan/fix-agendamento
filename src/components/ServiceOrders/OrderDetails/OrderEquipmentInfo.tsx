
import React from 'react';
import { CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { formatDate } from '../utils';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface OrderEquipmentInfoProps {
  order: ServiceOrder;
  orderIndex: number;
}

const OrderEquipmentInfo: React.FC<OrderEquipmentInfoProps> = ({ order, orderIndex }) => {
  // Verificar se temos múltiplos equipamentos
  const hasMultipleItems = order.serviceItems && order.serviceItems.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-muted-foreground">
            <DisplayNumber item={order} index={orderIndex} variant="inline" size="sm" showIcon={true} />
          </p>
          <CardTitle className="text-2xl">
            {hasMultipleItems
              ? `Múltiplos Equipamentos (${order.serviceItems.length})`
              : order.equipmentType}
          </CardTitle>
          {!hasMultipleItems && order.equipmentModel && (
            <p className="text-muted-foreground">Modelo: {order.equipmentModel}</p>
          )}
          {!hasMultipleItems && order.equipmentSerial && (
            <p className="text-xs text-muted-foreground">Número de Série: {order.equipmentSerial}</p>
          )}
          <p className="text-sm mt-2">
            <span className="font-medium">Tipo de Atendimento: </span>
            {order.serviceAttendanceType === 'em_domicilio' && 'Atendimento em Domicílio'}
            {order.serviceAttendanceType === 'coleta_conserto' && 'Coleta para Conserto'}
            {order.serviceAttendanceType === 'coleta_diagnostico' && 'Coleta para Diagnóstico'}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1.5 text-muted-foreground" />
            <span>Criado em: {formatDate(order.createdAt)}</span>
          </div>
          <div className="flex items-center mt-1">
            <Clock className="h-4 w-4 mr-1.5 text-muted-foreground" />
            <span>
              {new Date(order.createdAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          {order.scheduledDate && (
            <div className="flex items-center mt-2">
              <Calendar className="h-4 w-4 mr-1.5 text-muted-foreground" />
              <span>Agendado para: {formatDate(order.scheduledDate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lista de equipamentos se houver múltiplos */}
      {hasMultipleItems && (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-md font-medium mb-2">Equipamentos:</h3>
          <div className="space-y-3">
            {order.serviceItems.map((item, index) => (
              <div key={index} className="border-l-2 border-muted pl-3 py-1">
                <div className="font-medium">{item.equipmentType}</div>
                {item.equipmentModel && (
                  <div className="text-sm text-muted-foreground">
                    Modelo: {item.equipmentModel}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  Problema: {item.clientDescription}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Tipo: </span>
                  {item.serviceAttendanceType === 'em_domicilio' && 'Atendimento em Domicílio'}
                  {item.serviceAttendanceType === 'coleta_conserto' && 'Coleta para Conserto'}
                  {item.serviceAttendanceType === 'coleta_diagnostico' && 'Coleta para Diagnóstico'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderEquipmentInfo;
