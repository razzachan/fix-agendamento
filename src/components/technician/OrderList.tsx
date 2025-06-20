
import React, { useState, useEffect } from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModernOrderCard } from './ModernOrderCard';
import { AddressGroupCard } from './AddressGroupCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, CheckCircle, XCircle, RefreshCw, MapPin, List } from 'lucide-react';
import RecycleOrderDialog, { RecycleType, RecycleOptions } from '@/components/ServiceOrders/RecycleOrderDialog';
import { recycleOrderService } from '@/services/recycleOrderService';
import { useAuth } from '@/contexts/AuthContext';
import { useRecycledOrders } from '@/hooks/useRecycledOrders';

interface OrderListProps {
  technicianOrders: ServiceOrder[];
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  onOrderUpdate?: (updatedOrder: ServiceOrder) => void;
  onUpdateOrderStatus?: (orderId: string, newStatus: string) => Promise<void>;
  technicianId?: string | null;
}

const OrderList: React.FC<OrderListProps> = ({ technicianOrders, selectedOrderId, onSelectOrder, onOrderUpdate, onUpdateOrderStatus, technicianId }) => {
  const [activeTab, setActiveTab] = useState('active');
  const [isRecycleDialogOpen, setIsRecycleDialogOpen] = useState(false);
  const [orderToRecycle, setOrderToRecycle] = useState<ServiceOrder | null>(null);
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
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

  // Função para agrupar ordens por endereço
  const groupOrdersByAddress = (orders: ServiceOrder[]) => {
    const groups: Record<string, ServiceOrder[]> = {};

    orders.forEach(order => {
      // Criar chave única baseada no endereço e cliente
      const addressKey = `${order.clientName}-${order.clientFullAddress || order.pickupAddress || 'Endereço não informado'}`;

      if (!groups[addressKey]) {
        groups[addressKey] = [];
      }
      groups[addressKey].push(order);
    });

    return groups;
  };

  // Agrupar ordens ativas por endereço
  const groupedActiveOrders = groupOrdersByAddress(activeOrders);

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

  // Função para atualizar status de equipamento individual
  const handleUpdateEquipmentStatus = async (orderId: string, equipmentId: string, newStatus: string) => {
    console.log('🎯 OrderList - handleUpdateEquipmentStatus chamada:', { orderId, equipmentId, newStatus });
    try {
      if (onUpdateOrderStatus) {
        console.log('📡 OrderList - Chamando onUpdateOrderStatus da prop...');
        await onUpdateOrderStatus(orderId, newStatus);
        console.log(`✨ OrderList - Status atualizado com sucesso: OS ${orderId} -> ${newStatus}`);
      } else {
        console.warn('⚠️ OrderList - Função onUpdateOrderStatus não disponível');
      }
    } catch (error) {
      console.error('💥 OrderList - Erro ao atualizar status do equipamento:', error);
      throw error;
    }
  };

  // Adaptador para converter a função de atualização para o formato do QuickProgressButton
  const handleUpdateOrderStatusAdapter = async (orderId: string, newStatus: string): Promise<boolean> => {
    console.log('🔄 OrderList - Adaptador chamado:', { orderId, newStatus });
    try {
      console.log('📞 OrderList - Chamando handleUpdateEquipmentStatus...');
      await handleUpdateEquipmentStatus(orderId, 'default', newStatus);
      console.log('✅ OrderList - Status atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ OrderList - Erro ao atualizar status da ordem:', error);
      return false;
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Serviços Atribuídos
          </CardTitle>

          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant={viewMode === 'grouped' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grouped')}
              className={`h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm ${viewMode === 'grouped' ? 'bg-[#e5b034] hover:bg-[#d4a02a]' : ''}`}
            >
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="hidden sm:inline">Agrupado</span>
              <span className="sm:hidden">Grupo</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm ${viewMode === 'list' ? 'bg-[#e5b034] hover:bg-[#d4a02a]' : ''}`}
            >
              <List className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="hidden sm:inline">Lista</span>
              <span className="sm:hidden">List</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4 md:mb-6 h-10 md:h-12">
            <TabsTrigger value="active" className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-2">
              <Wrench className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Ativos</span>
              <span className="sm:hidden">Ativo</span>
              {activeOrders.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 md:ml-1 text-xs">
                  {activeOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-2">
              <CheckCircle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Concluídos</span>
              <span className="sm:hidden">OK</span>
              {completedOrders.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 md:ml-1 text-xs">
                  {completedOrders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-2">
              <XCircle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Cancelados</span>
              <span className="sm:hidden">X</span>
              {cancelledOrders.length > 0 && (
                <Badge variant="destructive" className="ml-0.5 md:ml-1 text-xs">
                  {cancelledOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeOrders.length > 0 ? (
              <div className="space-y-3">
                {/* Indicador do modo ativo */}
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  {viewMode === 'grouped' ? (
                    <>
                      <MapPin className="w-3 h-3" />
                      <span>Modo Agrupado - {Object.keys(groupedActiveOrders).length} endereço(s)</span>
                    </>
                  ) : (
                    <>
                      <List className="w-3 h-3" />
                      <span>Modo Lista - {activeOrders.length} ordem(ns)</span>
                    </>
                  )}
                </div>

                {viewMode === 'grouped' ? (
                  // Visualização agrupada por endereço
                  Object.entries(groupedActiveOrders).map(([addressKey, orders]) => {
                    const [clientName, address] = addressKey.split('-');
                    return (
                      <AddressGroupCard
                        key={addressKey}
                        address={address}
                        clientName={clientName}
                        orders={orders}
                        selectedOrderId={selectedOrderId}
                        onSelectOrder={onSelectOrder}
                        onUpdateEquipmentStatus={handleUpdateEquipmentStatus}
                      />
                    );
                  })
                ) : (
                  // Visualização em lista tradicional
                  activeOrders.map(order => (
                    <ModernOrderCard
                      key={order.id}
                      order={order}
                      isSelected={selectedOrderId === order.id}
                      onSelect={() => onSelectOrder(order.id)}
                      onUpdateStatus={handleUpdateOrderStatusAdapter}
                    />
                  ))
                )}
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
