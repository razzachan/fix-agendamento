
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Wrench, MapPin } from 'lucide-react';
import { ScheduledService, ServiceOrder } from '@/types';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface ServiceEventItemProps {
  service: ScheduledService;
  relatedOrder?: ServiceOrder;
  formatTime: (isoString: string) => string;
  getStatusColor: (status: string) => string;
  getStatusBadge: (status: string) => { label: string; className: string };
  onClick: () => void;
}

const ServiceEventItem: React.FC<ServiceEventItemProps> = ({
  service,
  relatedOrder,
  formatTime,
  getStatusColor,
  getStatusBadge,
  onClick
}) => {
  const badgeData = getStatusBadge(service.status);
  
  return (
    <div 
      className={`border rounded-md p-4 transition-all hover:shadow-md cursor-pointer ${getStatusColor(service.status)}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{service.description}</h3>
          <p className="text-sm mt-1">Cliente: {service.clientName}</p>
          <div className="flex items-center text-sm mt-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            <span className="truncate max-w-[250px]">{service.address}</span>
          </div>
          {relatedOrder && (
            <div className="flex items-center text-xs mt-1 text-muted-foreground">
              <Wrench className="h-3 w-3 mr-1" />
              <DisplayNumber item={relatedOrder} variant="inline" size="sm" showIcon={false} />
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className={badgeData.className}>
            {badgeData.label}
          </Badge>
          <div className="flex items-center text-sm font-medium mt-1">
            <CalendarClock className="h-4 w-4 mr-1" />
            {formatTime(service.scheduledStartTime)} - {formatTime(service.scheduledEndTime)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceEventItem;
