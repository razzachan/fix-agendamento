
import React, { useEffect } from 'react';
import { useTechnicianOrders } from '@/hooks/useTechnicianOrders';
import { ServiceProgressTracker } from '@/components/ServiceOrders/ProgressTracker';
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

  if (isLoading) {
    return <LoadingState />;
  }

  if (technicianOrders.length === 0) {
    return <EmptyOrdersState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Suas Ordens de Serviço</h1>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-6">
          <TabsTrigger value="list">Lista de Ordens</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <OrderList
                technicianOrders={technicianOrders}
                selectedOrderId={selectedOrderId}
                onSelectOrder={setSelectedOrderId}
                technicianId={technicianId}
                onOrderUpdate={(updatedOrder) => {
                  // Recarregar dados quando uma ordem for reciclada
                  window.location.reload();
                }}
              />
            </div>

            <div className="lg:col-span-3">
              {selectedOrder ? (
                <ServiceProgressTracker 
                  serviceOrder={selectedOrder} 
                  onUpdateStatus={handleUpdateOrderStatus}
                />
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
    </div>
  );
};

export default TechnicianServiceOrders;
