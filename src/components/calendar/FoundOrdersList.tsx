
import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { format } from 'date-fns';

interface FoundOrdersListProps {
  orders: ServiceOrder[];
}

const FoundOrdersList: React.FC<FoundOrdersListProps> = ({ orders }) => {
  if (orders.length === 0) return null;

  return (
    <div className="mt-6 border rounded-md p-5 max-w-md mx-auto text-left bg-white shadow-sm">
      <h4 className="font-medium mb-3 text-purple-700 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Ordens de serviço encontradas ({orders.length}):
      </h4>
      <ul className="divide-y">
        {orders.map((order) => (
          <li key={order.id} className="py-3">
            <p className="font-medium text-gray-800">{order.description}</p>
            <p className="text-sm text-gray-600 mt-1">
              Cliente: {order.clientName}
            </p>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Data agendada: {order.scheduledDate 
                ? format(new Date(order.scheduledDate), 'dd/MM/yyyy') 
                : 'Não agendado'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FoundOrdersList;
