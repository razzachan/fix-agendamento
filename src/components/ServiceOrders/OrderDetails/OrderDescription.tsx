
import React from 'react';
import { ServiceOrder } from '@/types';

interface OrderDescriptionProps {
  description: string;
}

const OrderDescription: React.FC<OrderDescriptionProps> = ({ description }) => {
  return (
    <div>
      <h3 className="font-medium text-sm text-muted-foreground mb-2">Descrição do Problema</h3>
      <div className="bg-accent/30 p-4 rounded-md whitespace-pre-wrap">
        {description}
      </div>
    </div>
  );
};

export default OrderDescription;
