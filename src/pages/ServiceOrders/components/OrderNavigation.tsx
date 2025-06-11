
import React from 'react';
import { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';

interface OrderNavigationProps {
  handleBackToList: () => void;
  handleTrackingClick: () => void;
  isTracking: boolean;
}

const OrderNavigation: React.FC<OrderNavigationProps> = ({
  handleBackToList,
  handleTrackingClick,
  isTracking,
}) => {
  return (
    <div className="flex justify-between items-center">
      <Button onClick={handleBackToList}>Voltar para a lista</Button>
      <Button
        variant="secondary"
        onClick={handleTrackingClick}
        disabled={isTracking}
      >
        {isTracking ? "Rastreamento Ativo" : "Mostrar Rastreamento"}
      </Button>
    </div>
  );
};

export default OrderNavigation;
