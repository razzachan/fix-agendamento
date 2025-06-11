
import React from 'react';
import { ServiceOrder } from '@/types';
import StatusDropdown from './StatusDropdown';

interface OrderStatusCardsProps {
  serviceOrders: ServiceOrder[];
}

const OrderStatusCards: React.FC<OrderStatusCardsProps> = ({ serviceOrders }) => {
  return (
    <div className="w-full flex justify-end mb-4">
      <StatusDropdown serviceOrders={serviceOrders} />
    </div>
  );
};

export default OrderStatusCards;
