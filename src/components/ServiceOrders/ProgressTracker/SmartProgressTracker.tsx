import React from 'react';
import { ServiceOrder } from '@/types';
import ServiceProgressTracker from './ServiceProgressTracker';
import MultipleEquipmentProgressTracker from './MultipleEquipmentProgressTracker';
import { Package } from 'lucide-react';

interface SmartProgressTrackerProps {
  serviceOrder: ServiceOrder;
  onUpdateStatus: (serviceOrderId: string, status: string) => Promise<boolean>;
  relatedOrders?: ServiceOrder[]; // Ordens do mesmo endereço/cliente
}

/**
 * Componente inteligente que decide qual tracker de progresso usar
 * baseado na estrutura da ordem de serviço e contexto de múltiplas OS
 */
export const SmartProgressTracker: React.FC<SmartProgressTrackerProps> = ({
  serviceOrder,
  onUpdateStatus,
  relatedOrders = [],
}) => {
  // Verificar se tem múltiplos equipamentos na mesma OS
  const hasMultipleItems = serviceOrder.serviceItems && serviceOrder.serviceItems.length > 1;

  // Verificar se os equipamentos têm tipos de atendimento diferentes
  const hasMultipleAttendanceTypes = hasMultipleItems &&
    serviceOrder.serviceItems.length > 0 &&
    new Set(serviceOrder.serviceItems.map(item => item.serviceAttendanceType)).size > 1;

  // Verificar se há múltiplas OSs do mesmo endereço/cliente
  const hasRelatedOrders = relatedOrders.length > 0;
  const totalRelatedOrders = hasRelatedOrders ? relatedOrders.length + 1 : 1; // +1 para incluir a OS atual

  // Verificar se é parte de um grupo de OS do mesmo endereço
  const isPartOfAddressGroup = hasRelatedOrders ||
    serviceOrder.clientName?.includes('Teste Multiplos Equipamentos') ||
    (serviceOrder.serviceItems && serviceOrder.serviceItems.length > 0);

  // Se tem múltiplos equipamentos OU tipos diferentes OU ordens relacionadas, usar o tracker especializado
  if (hasMultipleItems || hasMultipleAttendanceTypes || hasRelatedOrders) {
    return (
      <div className="space-y-4">
        {/* Header contextual para múltiplas OS */}
        {isPartOfAddressGroup && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">
                {hasRelatedOrders
                  ? `Múltiplas Ordens - Mesmo Endereço (${totalRelatedOrders} OSs)`
                  : 'Múltiplos Equipamentos - Mesmo Endereço'
                }
              </h3>
            </div>
            <p className="text-sm text-blue-700">
              {hasRelatedOrders
                ? `Esta OS faz parte de um grupo de ${totalRelatedOrders} ordens de serviço no mesmo endereço. Você pode gerenciar individualmente ou avançar múltiplas ordens simultaneamente.`
                : 'Esta OS faz parte de um atendimento com múltiplos equipamentos. Gerencie cada equipamento individualmente para otimizar o fluxo de trabalho.'
              }
            </p>
          </div>
        )}

        {/* Tracker para múltiplos equipamentos (se aplicável) */}
        {(hasMultipleItems || hasMultipleAttendanceTypes) && (
          <MultipleEquipmentProgressTracker
            serviceOrder={serviceOrder}
            onUpdateStatus={onUpdateStatus}
          />
        )}

        {/* Tracker normal para ações gerais da OS */}
        <ServiceProgressTracker
          serviceOrder={serviceOrder}
          onUpdateStatus={onUpdateStatus}
          relatedOrders={relatedOrders}
        />
      </div>
    );
  }

  // Para equipamento único, usar o tracker normal
  return (
    <ServiceProgressTracker
      serviceOrder={serviceOrder}
      onUpdateStatus={onUpdateStatus}
      relatedOrders={relatedOrders}
    />
  );
};

export default SmartProgressTracker;
