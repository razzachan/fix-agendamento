
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Wrench, MapPin, UserCheck } from 'lucide-react';
import { ScheduledService } from '@/types';
import { useNavigate } from 'react-router-dom';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface EventItemProps {
  service: ScheduledService;
  getStatusBadge: (status: string) => { label: string; className: string };
  formatTime: (isoString: string) => string;
  getStatusColor: (status: string) => string;
  user: any;
}

const EventItem: React.FC<EventItemProps> = ({
  service,
  getStatusBadge,
  formatTime,
  getStatusColor,
  user
}) => {
  const navigate = useNavigate();
  const badgeData = getStatusBadge(service.status);
  
  const handleClick = () => {
    if (user?.role === 'technician') {
      navigate(`/technician?orderId=${service.serviceOrderId}`);
    } else if (user?.role === 'admin') {
      navigate(`/orders/${service.serviceOrderId}`);
    }
  };
  
  return (
    <div 
      key={service.id} 
      className={`border rounded-lg p-5 transition-all hover:shadow-lg cursor-pointer bg-white ${getStatusColor(service.status)} hover:scale-[1.01] duration-200`}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{service.description}</h3>
          
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <UserCheck className="h-4 w-4 text-gray-500" />
            <span>Cliente: <span className="font-medium">{service.clientName}</span></span>
          </div>
          
          {user?.role === 'admin' && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <UserCheck className="h-4 w-4 text-indigo-500" />
              <span>Técnico: <span className="font-medium">{service.technicianName}</span></span>
            </div>
          )}
          
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-red-500" />
            <span className="truncate max-w-[250px]">{service.address}</span>
          </div>
          
          {service.serviceOrderId && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
              <Wrench className="h-3.5 w-3.5" />
              <DisplayNumber item={{id: service.serviceOrderId}} variant="inline" size="sm" showIcon={true} />
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <Badge variant="outline" className={`${badgeData.className} px-3 py-1 text-xs font-medium`}>
            {badgeData.label}
          </Badge>
          
          <div className="flex items-center text-sm font-medium mt-1 bg-gray-50 px-3 py-1.5 rounded-full">
            <CalendarClock className="h-4 w-4 mr-1.5 text-purple-500" />
            {formatTime(service.scheduledStartTime)} - {formatTime(service.scheduledEndTime)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventItem;
