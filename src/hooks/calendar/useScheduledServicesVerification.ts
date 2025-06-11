
import { useState } from 'react';
import { ScheduledService } from '@/types';
import { fetchScheduledServices } from './utils/serviceQueries';
import { toast } from 'sonner';

export const useScheduledServicesVerification = (selectedTechnicianId: string) => {
  const [foundServices, setFoundServices] = useState<ScheduledService[]>([]);
  const [hasAnyServices, setHasAnyServices] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const findExistingServices = async () => {
    if (!selectedTechnicianId || selectedTechnicianId === 'all') {
      setFoundServices([]);
      return [];
    }
    
    setIsVerifying(true);
    
    try {
      console.log(`Verificando serviços agendados para o técnico: ${selectedTechnicianId}`);
      const servicesData = await fetchScheduledServices(selectedTechnicianId);
      
      // Map to ScheduledService type with all required properties
      const mappedServices: ScheduledService[] = servicesData.map(service => ({
        id: service.id || '',
        description: service.description || '',
        clientId: service.client_id || '',
        clientName: service.client_name || '',
        address: service.address || '',
        technicianId: service.technician_id || '',
        technicianName: service.technician_name || '',
        scheduledStartTime: service.scheduled_start_time || '',
        scheduledEndTime: service.scheduled_end_time || '',
        serviceOrderId: service.service_order_id || '',
        status: service.status || 'scheduled',
        createdAt: service.created_at || new Date().toISOString()
      }));
      
      console.log(`Encontrados ${mappedServices.length} serviços agendados`);
      
      setFoundServices(mappedServices);
      setHasAnyServices(mappedServices.length > 0);
      return mappedServices;
    } catch (error) {
      console.error('Erro ao buscar serviços agendados:', error);
      toast.error('Falha ao verificar serviços agendados.');
      setFoundServices([]);
      setHasAnyServices(false);
      return [];
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    foundServices,
    hasAnyServices,
    findExistingServices,
    isVerifying
  };
};
