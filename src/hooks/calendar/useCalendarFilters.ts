
import { useState, useMemo, useEffect } from 'react';
import { isSameDay, format, parseISO, startOfDay } from 'date-fns';
import { ScheduledService } from '@/types';
import { User } from '@/types';

export const useCalendarFilters = (
  services: ScheduledService[],
  technicianId: string | null,
  user: User | null
) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('all');

  // Initialize selectedTechnicianId with technicianId if user is a technician
  useEffect(() => {
    if (user?.role === 'technician' && technicianId) {
      setSelectedTechnicianId(technicianId);
    }
  }, [technicianId, user?.role]);

  // Filter services based on selected technician and date
  const getFilteredServices = () => {
    if (!date || !services || services.length === 0) return [];
    
    console.log('Filtrando serviços para data:', date);
    console.log('Data selecionada formatada:', format(date, 'yyyy-MM-dd'));
    console.log('Total de serviços disponíveis:', services.length);
    
    // Log de todos os serviços disponíveis para debugging
    if (services.length > 0) {
      console.log('Serviços disponíveis:');
      services.forEach(service => {
        if (service.scheduledStartTime) {
          const serviceDate = new Date(service.scheduledStartTime);
          console.log(`ID: ${service.id}, Técnico: ${service.technicianId}, Data: ${format(serviceDate, 'yyyy-MM-dd')} (${service.description})`);
        }
      });
    }
    
    const filtered = services.filter(service => {
      // Garantir que temos uma data de serviço válida
      if (!service.scheduledStartTime) {
        console.log(`Serviço ${service.id} não tem data de agendamento`);
        return false;
      }
      
      // Converter ambas as datas para formato de string para comparação mais confiável
      const serviceDay = format(new Date(service.scheduledStartTime), 'yyyy-MM-dd');
      const selectedDay = format(date, 'yyyy-MM-dd');
      
      // Para debug, mostramos as datas normalizadas
      console.log(`Comparando: Serviço ${service.id} - ${serviceDay} com data selecionada ${selectedDay}`);
      
      // Comparar as strings de data
      const isMatchingDate = serviceDay === selectedDay;
      
      console.log(`Resultado da comparação para serviço ${service.id}: ${isMatchingDate ? 'MATCH' : 'NO MATCH'}`);
      
      const isMatchingTechnician = selectedTechnicianId === 'all' || service.technicianId === selectedTechnicianId;
      
      // Para técnicos, filtramos apenas os serviços deles
      if (user?.role === 'technician' && technicianId) {
        return isMatchingDate && service.technicianId === technicianId;
      }
      
      return isMatchingDate && isMatchingTechnician;
    });
    
    console.log(`Serviços filtrados para ${format(date, 'yyyy-MM-dd')}: ${filtered.length}`);
    if (filtered.length > 0) {
      filtered.forEach(service => {
        console.log(`Serviço filtrado: ${service.id}, ${service.description}`);
      });
    }
    
    return filtered;
  };

  // Check if date has scheduled services for calendar highlighting
  const hasScheduledServices = (day: Date) => {
    if (!services || services.length === 0) {
      return false;
    }
    
    // Formatar a data do dia para comparação de string
    const dayFormatted = format(day, 'yyyy-MM-dd');
    
    const result = services.some(service => {
      // Garantir que temos uma data válida
      if (!service.scheduledStartTime) return false;
      
      // Formatar a data do serviço para comparação de string
      const serviceDateFormatted = format(new Date(service.scheduledStartTime), 'yyyy-MM-dd');
      
      // Verificar correspondência por data
      const isMatchingDate = serviceDateFormatted === dayFormatted;
      
      // Verificar correspondência por técnico
      const isMatchingTechnician = selectedTechnicianId === 'all' || service.technicianId === selectedTechnicianId;
      
      // Para técnicos, verificamos apenas seus próprios serviços
      if (user?.role === 'technician' && technicianId) {
        return isMatchingDate && service.technicianId === technicianId;
      }
      
      return isMatchingDate && isMatchingTechnician;
    });
    
    return result;
  };

  // Create memoized filtered services to avoid unnecessary re-renders
  const filteredServices = useMemo(() => getFilteredServices(), [date, services, selectedTechnicianId, technicianId, user]);

  return {
    date,
    setDate,
    selectedTechnicianId,
    setSelectedTechnicianId,
    filteredServices,
    hasScheduledServices
  };
};
