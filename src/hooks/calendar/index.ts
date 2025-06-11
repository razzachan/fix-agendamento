
import { useEffect } from 'react';
import { User } from '@/types';
import { useCalendarData } from './useCalendarData';
import { useCalendarFilters } from './useCalendarFilters';
import { useCalendarFormatting } from './useCalendarFormatting';

export const useCalendarView = (user: User | null) => {
  const { services, technicians, isLoading, technicianId, refreshServices } = useCalendarData(user);

  const {
    date,
    setDate,
    selectedTechnicianId,
    setSelectedTechnicianId,
    filteredServices,
    hasScheduledServices
  } = useCalendarFilters(services, technicianId, user);

  const { formatTime, getStatusColor, getStatusBadge } = useCalendarFormatting();

  // Debugging - log when filteredServices changes
  useEffect(() => {
    console.log('Serviços filtrados atualizados:', filteredServices.length);
  }, [filteredServices]);

  return {
    // Data
    date,
    setDate,
    isLoading,
    services,
    technicians,
    selectedTechnicianId,
    setSelectedTechnicianId,
    technicianId,
    filteredServices,

    // Functions
    hasScheduledServices,
    formatTime,
    getStatusColor,
    getStatusBadge,
    refreshServices
  };
};

// Export individual hooks
export { useCalendarData } from './useCalendarData';
export { useCalendarFilters } from './useCalendarFilters';
export { useCalendarFormatting } from './useCalendarFormatting';
export { useMainCalendar } from './useMainCalendar';
