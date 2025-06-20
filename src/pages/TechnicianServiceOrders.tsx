
import React, { useEffect } from 'react';
import { useTechnicianOrders } from '@/hooks/useTechnicianOrders';
import { SmartProgressTracker } from '@/components/ServiceOrders/ProgressTracker';
import LoadingState from '@/components/ServiceOrders/LoadingState';
import OrderList from '@/components/technician/OrderList';
import EmptyOrdersState from '@/components/technician/EmptyOrdersState';
import NoOrderSelected from '@/components/technician/NoOrderSelected';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TechnicianMainCalendarView from '@/components/technician/TechnicianMainCalendarView';
import { useLocation } from 'react-router-dom';

const TechnicianServiceOrders: React.FC = () => {
  const {
    technicianOrders,
    selectedOrder,
    selectedOrderId,
    setSelectedOrderId,
    isLoading,
    handleUpdateOrderStatus,
    technicianId
  } = useTechnicianOrders();
  
  const location = useLocation();
  
  // Set selected order ID from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const orderId = searchParams.get('orderId');

    if (orderId && technicianOrders.some(order => order.id === orderId)) {
      setSelectedOrderId(orderId);
    }
  }, [location.search, technicianOrders, setSelectedOrderId]);

  // Funções de ação rápida
  const handleNavigateToAddress = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const handleCallClient = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  const handleViewRoute = () => {
    // TODO: Implementar visualização de rota otimizada
    console.log('Ver rota otimizada');
  };

  // Função para encontrar ordens relacionadas (mesmo endereço/cliente)
  const getRelatedOrders = (currentOrder: any) => {
    if (!technicianOrders || !currentOrder) return [];

    return technicianOrders.filter(order =>
      order.id !== currentOrder.id && // Excluir a ordem atual
      order.clientName === currentOrder.clientName && // Mesmo cliente
      order.clientAddress === currentOrder.clientAddress && // Mesmo endereço
      order.status !== 'cancelled' && // Não incluir canceladas
      order.status !== 'completed' // Não incluir concluídas
    );
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (technicianOrders.length === 0) {
    return <EmptyOrdersState />;
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Suas Ordens de Serviço</h1>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4 md:mb-6">
          <TabsTrigger value="list" className="text-sm md:text-base">Lista de Ordens</TabsTrigger>
          <TabsTrigger value="calendar" className="text-sm md:text-base">Calendário</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          {/* Barra de estatísticas - Mobile Otimizada */}
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gradient-to-r from-[#e5b034] to-[#d4a02a] text-white rounded-lg">
            <h3 className="font-semibold mb-3 text-sm md:text-base">📊 Estatísticas do Técnico</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="text-center md:text-left">
                <div className="text-xl md:text-2xl font-bold">{technicianOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length}</div>
                <div className="opacity-90 text-xs md:text-sm">Ordens Ativas</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-xl md:text-2xl font-bold">{technicianOrders.filter(o => o.status === 'completed').length}</div>
                <div className="opacity-90 text-xs md:text-sm">Concluídas</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-xl md:text-2xl font-bold">{new Set(technicianOrders.map(o => o.clientName)).size}</div>
                <div className="opacity-90 text-xs md:text-sm">Clientes</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-xl md:text-2xl font-bold">{Math.round((technicianOrders.filter(o => o.status === 'completed').length / Math.max(1, technicianOrders.length)) * 100)}%</div>
                <div className="opacity-90 text-xs md:text-sm">Taxa Conclusão</div>
              </div>
            </div>
          </div>

          {/* Layout responsivo: mobile = stack, desktop = side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
            <div className="lg:col-span-2">
              <OrderList
                technicianOrders={technicianOrders}
                selectedOrderId={selectedOrderId}
                onSelectOrder={setSelectedOrderId}
                technicianId={technicianId}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onOrderUpdate={(updatedOrder) => {
                  // Recarregar dados quando uma ordem for reciclada
                  window.location.reload();
                }}
              />
            </div>

            <div className="lg:col-span-3">
              {selectedOrder ? (
                <div className="space-y-3 md:space-y-4">
                  {/* Header mobile com informações rápidas */}
                  <div className="lg:hidden bg-gradient-to-r from-[#e5b034] to-[#d4a02a] text-white p-3 md:p-4 rounded-lg">
                    <h2 className="font-semibold text-base md:text-lg">{selectedOrder.clientName}</h2>
                    <p className="text-sm opacity-90">{selectedOrder.equipmentType}</p>
                    <div className="flex items-center gap-2 md:gap-4 mt-2 text-xs md:text-sm">
                      <span>OS #{selectedOrder.id.substring(0, 8)}</span>
                      <span>•</span>
                      <span className="truncate">{selectedOrder.serviceAttendanceType.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <SmartProgressTracker
                    serviceOrder={selectedOrder}
                    onUpdateStatus={handleUpdateOrderStatus}
                    relatedOrders={getRelatedOrders(selectedOrder)}
                  />
                </div>
              ) : (
                <NoOrderSelected />
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="calendar">
          {technicianId && <TechnicianMainCalendarView technicianId={technicianId} />}
        </TabsContent>
      </Tabs>

      {/* Barra de ações rápidas (mobile) - TESTE */}
      {selectedOrder && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-t-[#e5b034] p-4 shadow-lg z-50">
          <div className="flex gap-2">
            {selectedOrder.clientFullAddress && (
              <button
                onClick={() => handleNavigateToAddress(selectedOrder.clientFullAddress!)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                🧭 Navegar
              </button>
            )}
            {selectedOrder.clientPhone && (
              <button
                onClick={() => handleCallClient(selectedOrder.clientPhone)}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                📞 Ligar
              </button>
            )}
          </div>
          <div className="text-xs text-center mt-2 text-gray-600">
            {selectedOrder.clientName} - {selectedOrder.equipmentType}
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianServiceOrders;
