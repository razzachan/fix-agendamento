import React from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import OrderCard from './OrderCard';
import { translateStatus } from '@/utils/translations';

interface TrelloViewProps {
  orders: ServiceOrder[];
  onOrderClick: (order: ServiceOrder) => void;
  onUpdateOrderStatus?: (id: string, status: string) => Promise<void>;
}

const TrelloView: React.FC<TrelloViewProps> = ({
  orders,
  onOrderClick,
  onUpdateOrderStatus
}) => {
  // Definir as colunas de status em ordem lógica
  const statusColumns = [
    { key: 'pending', label: 'Pendente', color: 'bg-slate-50 border-slate-200' },
    { key: 'scheduled', label: 'Agendado', color: 'bg-blue-50 border-blue-200' },
    { key: 'on_the_way', label: 'A Caminho', color: 'bg-indigo-50 border-indigo-200' },
    { key: 'in_progress', label: 'Em Andamento', color: 'bg-yellow-50 border-yellow-200' },
    { key: 'collected', label: 'Coletado', color: 'bg-cyan-50 border-cyan-200' },
    { key: 'at_workshop', label: 'Na Oficina', color: 'bg-purple-50 border-purple-200' },
    { key: 'diagnosis_completed', label: 'Diagnóstico Concluído', color: 'bg-pink-50 border-pink-200' },
    { key: 'awaiting_quote_approval', label: 'Aguardando Aprovação', color: 'bg-orange-50 border-orange-200' },
    { key: 'quote_approved', label: 'Aprovado', color: 'bg-green-50 border-green-200' },
    { key: 'ready_for_delivery', label: 'Pronto para Entrega', color: 'bg-teal-50 border-teal-200' },
    { key: 'delivery_scheduled', label: 'Entrega Agendada', color: 'bg-blue-100 border-blue-300' },
    { key: 'collected_for_delivery', label: 'Coletado para Entrega', color: 'bg-cyan-100 border-cyan-300' },
    { key: 'completed', label: 'Concluído', color: 'bg-emerald-50 border-emerald-200' },
    { key: 'cancelled', label: 'Cancelado', color: 'bg-red-50 border-red-200' }
  ];

  // Agrupar ordens por status
  const groupedOrders = statusColumns.reduce((acc, column) => {
    acc[column.key] = orders.filter(order => order.status === column.key);
    return acc;
  }, {} as Record<string, ServiceOrder[]>);

  // Verificar se há ordens com status não mapeados
  const mappedStatuses = statusColumns.map(col => col.key);
  const unmappedOrders = orders.filter(order => !mappedStatuses.includes(order.status));

  // Se houver ordens não mapeadas, criar uma coluna "Outros"
  if (unmappedOrders.length > 0) {
    statusColumns.push({
      key: 'others',
      label: 'Outros',
      color: 'bg-gray-50 border-gray-300'
    });
    groupedOrders['others'] = unmappedOrders;
  }

  return (
    <div className="h-full">
      <div className="flex gap-4 h-full overflow-x-auto pb-4 px-1">
        {statusColumns.map((column) => {
          const columnOrders = groupedOrders[column.key] || [];

          return (
            <div key={column.key} className="flex-shrink-0 w-72 md:w-80">
              <Card className={`h-full ${column.color} shadow-sm`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{column.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {columnOrders.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-200px)]">
                    <div className="p-3 space-y-3">
                      {columnOrders.length === 0 ? (
                        <div className="text-center text-gray-500 text-sm py-8">
                          Nenhuma ordem neste status
                        </div>
                      ) : (
                        columnOrders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            onClick={() => onOrderClick(order)}
                            onUpdateStatus={onUpdateOrderStatus}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrelloView;
