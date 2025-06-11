
import React from 'react';
import { useAppData } from '@/hooks/useAppData';
import { useNavigate } from 'react-router-dom';
import TechnicianCalendarSelector from './calendar/TechnicianCalendarSelector';
import TechnicianEventsList from './calendar/TechnicianEventsList';
import { useTechnicianCalendar } from './calendar/useTechnicianCalendar';

interface TechnicianCalendarViewProps {
  technicianId: string;
}

const TechnicianCalendarView: React.FC<TechnicianCalendarViewProps> = ({ technicianId }) => {
  const { serviceOrders } = useAppData();
  const navigate = useNavigate();
  
  const {
    date,
    setDate,
    isLoading,
    filteredServices,
    getServiceOrder,
    hasScheduledServices,
    formatTime,
    getStatusColor,
    getStatusBadge
  } = useTechnicianCalendar({ 
    technicianId, 
    serviceOrders 
  });

  const handleServiceClick = (serviceOrderId: string | undefined) => {
    if (serviceOrderId) {
      navigate(`/technician?orderId=${serviceOrderId}`);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <TechnicianCalendarSelector
        date={date}
        setDate={setDate}
        hasScheduledServices={hasScheduledServices}
      />

      <TechnicianEventsList
        date={date}
        isLoading={isLoading}
        filteredServices={filteredServices}
        getServiceOrder={getServiceOrder}
        handleServiceClick={handleServiceClick}
        formatTime={formatTime}
        getStatusColor={getStatusColor}
        getStatusBadge={getStatusBadge}
      />
    </div>
  );
};

export default TechnicianCalendarView;
