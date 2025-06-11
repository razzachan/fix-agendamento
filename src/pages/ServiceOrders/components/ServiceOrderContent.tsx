
import React from 'react';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import OrdersTable from '@/components/ServiceOrders/OrdersTable';
import LoadingState from '@/components/ServiceOrders/LoadingState';
import OrderDetails from '@/components/ServiceOrders/OrderDetails';
import TrackingView from '@/components/ServiceOrders/TrackingView';

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
  );
};

export default ServiceOrderContent;
