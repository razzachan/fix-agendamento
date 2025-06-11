
import React, { useEffect } from 'react';
import { ScheduledService } from '@/types';
import EventItem from './EventItem';
import EventsLoading from './EventsLoading';
import EventsEmptyState from './EventsEmptyState';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface EventsListProps {
  isLoading: boolean;
  date: Date | undefined;
  filteredServices: ScheduledService[];
  getStatusBadge: (status: string) => { label: string; className: string };
  formatTime: (isoString: string) => string;
  getStatusColor: (status: string) => string;
  selectedTechnicianId: string;
  user: any;
}

const EventsList: React.FC<EventsListProps> = ({
  isLoading,
  filteredServices,
  getStatusBadge,
  formatTime,
  getStatusColor,
  selectedTechnicianId,
  user,
  date
}) => {
  // Log para debug com informações detalhadas
  useEffect(() => {
    console.log('EventsList rendering with:', {
      isLoading,
      servicesCount: filteredServices?.length || 0,
      selectedTechnicianId,
      userRole: user?.role,
      date: date ? format(date, 'yyyy-MM-dd') : 'undefined'
    });
    
    if (filteredServices && filteredServices.length > 0) {
      console.log('Filtered services details:');
      filteredServices.forEach(service => {
        const startDate = new Date(service.scheduledStartTime);
        console.log(`Service: ${service.id}, Date: ${format(startDate, 'yyyy-MM-dd')}, Formatted date: ${format(startDate, 'yyyy-MM-dd')}, Description: ${service.description}`);
      });
    } else {
      console.log('No filtered services found for date:', date ? format(date, 'yyyy-MM-dd') : 'undefined');
    }
  }, [isLoading, filteredServices, selectedTechnicianId, user, date]);
  
  if (isLoading) {
    return <EventsLoading />;
  }
  
  if (!filteredServices || filteredServices.length === 0) {
    return <EventsEmptyState user={user} selectedTechnicianId={selectedTechnicianId} date={date} />;
  }
  
  return (
    <div className="space-y-4">
      {filteredServices.map((service, index) => (
        <motion.div
          key={service.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <EventItem
            service={service}
            getStatusBadge={getStatusBadge}
            formatTime={formatTime}
            getStatusColor={getStatusColor}
            user={user}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default EventsList;
