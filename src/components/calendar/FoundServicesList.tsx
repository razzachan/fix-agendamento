
import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { ScheduledService } from '@/types';
import { format } from 'date-fns';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface FoundServicesListProps {
  services: ScheduledService[];
}

const FoundServicesList: React.FC<FoundServicesListProps> = ({ services }) => {
  if (services.length === 0) return null;

  return (
    <div className="mt-6 border rounded-md p-5 max-w-md mx-auto text-left bg-white shadow-sm">
      <h4 className="font-medium mb-3 text-green-700 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Serviços agendados encontrados ({services.length}):
      </h4>
      <ul className="divide-y">
        {services.map((service) => {
          const startDate = new Date(service.scheduledStartTime);
          
          return (
            <li key={service.id} className="py-3">
              <p className="font-medium text-gray-800">{service.description}</p>
              <p className="text-sm text-gray-600 mt-1">
                Cliente: {service.clientName}
              </p>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Data: {format(startDate, 'dd/MM/yyyy')} às {format(startDate, 'HH:mm')}
              </p>
              {service.serviceOrderId && (
                <p className="text-xs text-gray-500 mt-1">
                  <DisplayNumber item={{id: service.serviceOrderId}} variant="inline" size="sm" showIcon={true} />
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default FoundServicesList;
