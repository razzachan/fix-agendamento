
import React, { useState } from 'react';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import OrdersTable from '@/components/ServiceOrders/OrdersTable';
import LoadingState from '@/components/ServiceOrders/LoadingState';
import OrderDetails from '@/components/ServiceOrders/OrderDetails';
import TrackingView from '@/components/ServiceOrders/TrackingView';
import TrelloView from '@/components/ServiceOrders/TrelloView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, Kanban, BarChart3 } from 'lucide-react';

interface ServiceOrderContentProps {
  selectedOrder: ServiceOrder | null;
  isTracking: boolean;
  handleBackToList: () => void;
  handleTrackingClick: (order: ServiceOrder) => void;
  isLoading: boolean;
  sortedOrders: ServiceOrder[];
  formatDate: (date: string) => string;
  handleOrderClick: (order: ServiceOrder) => void;
  sortConfig: { key: keyof ServiceOrder | null; direction: 'ascending' | 'descending' | null };
  handleSort: (key: keyof ServiceOrder) => void;
  showAllColumns: boolean;
  toggleColumnVisibility: () => void;
  refreshKey?: number;
  onUpdateOrderStatus?: (id: string, status: ServiceOrderStatus) => Promise<void>;
}

const ServiceOrderContent: React.FC<ServiceOrderContentProps> = ({
  selectedOrder,
  isTracking,
  handleBackToList,
  handleTrackingClick,
  isLoading,
  sortedOrders,
  formatDate,
  handleOrderClick,
  sortConfig,
  handleSort,
  showAllColumns,
  toggleColumnVisibility,
  refreshKey,
  onUpdateOrderStatus
}) => {
  const [activeTab, setActiveTab] = useState('table');

  if (isLoading) {
    return <LoadingState />;
  }

  if (selectedOrder && isTracking) {
    return (
      <TrackingView
        order={selectedOrder}
        onBack={handleBackToList}
        onUpdateStatus={onUpdateOrderStatus}
      />
    );
  }

  if (selectedOrder) {
    return (
      <OrderDetails
        orderId={selectedOrder.id}
        refreshKey={refreshKey}
      />
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="table" className="flex items-center gap-2">
          <Table className="h-4 w-4" />
          Tabela
        </TabsTrigger>
        <TabsTrigger value="cards" className="flex items-center gap-2">
          <Kanban className="h-4 w-4" />
          Cards
        </TabsTrigger>
        <TabsTrigger value="tracking" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Rastreamento
        </TabsTrigger>
      </TabsList>

      <TabsContent value="table" className="mt-0">
        <OrdersTable
          orders={sortedOrders}
          formatDate={formatDate}
          onOrderClick={handleOrderClick}
          onUpdateOrderStatus={onUpdateOrderStatus}
          onDeleteOrder={async (id) => {
            // Handle delete order logic (if needed)
            return false;
          }}
          sortConfig={sortConfig}
          onSort={handleSort}
          showAllColumns={showAllColumns}
          toggleColumnVisibility={toggleColumnVisibility}
          key={refreshKey}
        />
      </TabsContent>

      <TabsContent value="cards" className="mt-0">
        <TrelloView
          orders={sortedOrders}
          onOrderClick={handleOrderClick}
          onUpdateOrderStatus={onUpdateOrderStatus}
        />
      </TabsContent>

      <TabsContent value="tracking" className="mt-0">
        <TrackingView
          groupedOrders={sortedOrders.reduce((acc, order) => {
            const location = order.currentLocation || 'unknown';
            if (!acc[location]) acc[location] = [];
            acc[location].push(order);
            return acc;
          }, {} as Record<string, ServiceOrder[]>)}
          formatDate={formatDate}
          onUpdateStatus={onUpdateOrderStatus}
        />
      </TabsContent>
    </Tabs>
  );
};

export default ServiceOrderContent;
