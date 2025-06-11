
import React, { useState, useEffect } from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModernOrderCard } from './ModernOrderCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import RecycleOrderDialog, { RecycleType, RecycleOptions } from '@/components/ServiceOrders/RecycleOrderDialog';
import { recycleOrderService } from '@/services/recycleOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { useRecycledOrders } from '@/hooks/useRecycledOrders';

interface OrderListProps {
  technicianOrders: ServiceOrder[];
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  onOrderUpdate?: (updatedOrder: ServiceOrder) => void;
  technicianId?: string | null;
}

const OrderList: React.FC<OrderListProps> = ({ technicianOrders, selectedOrderId, onSelectOrder, onOrderUpdate, technicianId }) => {
  const [activeTab, setActiveTab] = useState('active');
  const [isRecycleDialogOpen, setIsRecycleDialogOpen] = useState(false);
  const [orderToRecycle, setOrderToRecycle] = useState<ServiceOrder | null>(null);
  const { user } = useAuth();
  const { filterNonRecycledOrders, markOrderAsRecycled } = useRecycledOrders(technicianId);

  const activeOrders = technicianOrders.filter(order =>
    order.status !== 'completed' && order.status !== 'cancelled'
  );

  const completedOrders = technicianOrders.filter(order =>
    order.status === 'completed'
  );

  // Filtrar ordens canceladas que não foram recicladas
  const allCancelledOrders = technicianOrders.filter(order =>
    order.status === 'cancelled'
  );
  const cancelledOrders = filterNonRecycledOrders(allCancelledOrders);

  // Verificar se a ordem selecionada está na aba ativa e limpar se necessário
  useEffect(() => {
    if (selectedOrderId) {
      const selectedOrder = technicianOrders.find(order => order.id === selectedOrderId);
      if (selectedOrder) {
        let shouldClearSelection = false;

        if (activeTab === 'active' && (selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled')) {
          shouldClearSelection = true;
        } else if (activeTab === 'completed' && selectedOrder.status !== 'completed') {
          shouldClearSelection = true;
        } else if (activeTab === 'cancelled' && selectedOrder.status !== 'cancelled') {
          shouldClearSelection = true;
        }

        if (shouldClearSelection) {
          onSelectOrder(''); // Limpar seleção
        }
      }
    }
  }, [activeTab, selectedOrderId, technicianOrders, onSelectOrder]);

  // Função para abrir dialog de reciclagem
  const handleRecycleOrder = (order: ServiceOrder) => {
    setOrderToRecycle(order);
    setIsRecycleDialogOpen(true);
  };

  // Função para processar reciclagem
  const handleRecycleSubmit = async (orderId: string, recycleType: RecycleType, options: RecycleOptions) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const updatedOrder = await recycleOrderService.recycleOrder(orderId, recycleType, options, user.id);

      // Marcar ordem como reciclada para atualização em tempo real
      markOrderAsRecycled(orderId);

      // Notificar componente pai sobre a atualização
      if (onOrderUpdate) {
        onOrderUpdate(updatedOrder);
      }

      // Mostrar notificação de sucesso
      console.log('Ordem reciclada com sucesso!');
    } catch (error) {
      console.error('Erro ao reciclar ordem:', error);
      throw error;
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Serviços Atribuídos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6 h-12">
            <TabsTrigger value="active" className="flex items-center justify-center gap-2 text-sm px-2">
              <Wrench className="w-4 h-4" />
              <span>Ativos</span>
              {activeOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {activeOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center justify-center gap-2 text-sm px-2">
              <CheckCircle className="w-4 h-4" />
              <span>Concluídos</span>
              {completedOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {completedOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center justify-center gap-2 text-sm px-2">
              <XCircle className="w-4 h-4" />
              <span>Cancelados</span>
              {cancelledOrders.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {cancelledOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeOrders.length > 0 ? (
              <div className="space-y-3">
                {activeOrders.map(order => (
                  <ModernOrderCard
                    key={order.id}
                    order={order}
                    isSelected={selectedOrderId === order.id}
                    onSelect={() => onSelectOrder(order.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Wrench className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">Nenhuma ordem ativa</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Todas as ordens foram concluídas
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedOrders.length > 0 ? (
              <div className="space-y-3">
                {completedOrders.map(order => (
                  <ModernOrderCard
                    key={order.id}
                    order={order}
                    isSelected={selectedOrderId === order.id}
                    onSelect={() => onSelectOrder(order.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">Nenhuma ordem concluída</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ordens finalizadas aparecerão aqui
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {cancelledOrders.length > 0 ? (
              <div className="space-y-3">
                {cancelledOrders.map(order => (
                  <div key={order.id} className="relative">
                    <ModernOrderCard
                      order={order}
                      isSelected={selectedOrderId === order.id}
                      onSelect={() => onSelectOrder(order.id)}
                    />
                    {/* Botão de Reciclagem */}
                    <div className="absolute bottom-2 right-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecycleOrder(order);
                        }}
                        className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 shadow-sm"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Reciclar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">Nenhuma ordem cancelada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ordens canceladas aparecerão aqui
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog de Reciclagem */}
      <RecycleOrderDialog
        isOpen={isRecycleDialogOpen}
        onClose={() => {
          setIsRecycleDialogOpen(false);
          setOrderToRecycle(null);
        }}
        order={orderToRecycle}
        onRecycle={handleRecycleSubmit}
      />
    </Card>
  );
};

export default OrderList;
