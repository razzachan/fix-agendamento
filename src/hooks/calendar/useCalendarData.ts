
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Technician, ScheduledService } from '@/types';
import { scheduledServiceService } from '@/services';
import { technicianService } from '@/services/technician/technicianService';
import { User } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAppData } from '@/hooks/useAppData';
import { format } from 'date-fns';

export const useCalendarData = (user: User | null) => {
  const { scheduledServices, isScheduledServicesLoading: isLoading, technicianId, refreshScheduledServices } = useAppData();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const { toast } = useToast();

  // Fetch technicians for admin users
  useEffect(() => {
    const fetchTechnicians = async () => {
      if (user?.role === 'admin') {
        try {
          const techsData = await technicianService.getAll();
          setTechnicians(techsData);
        } catch (error) {
          console.error('Erro ao carregar técnicos:', error);
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar a lista de técnicos.',
            variant: 'destructive'
          });
        }
      }
    };

    fetchTechnicians();
  }, [toast, user?.role]);

  // Debug our loaded services
  useEffect(() => {
    console.log('useCalendarData - serviços carregados:', scheduledServices.length);
    if (scheduledServices.length > 0) {
      console.log('Exemplo dos serviços carregados:', scheduledServices.slice(0, 2));
      console.log('Datas dos serviços carregados:', scheduledServices.map(service => ({
        id: service.id,
        startDate: new Date(service.scheduledStartTime).toISOString(),
        normalizedStartDate: format(new Date(service.scheduledStartTime), 'yyyy-MM-dd'),
        endDate: new Date(service.scheduledEndTime).toISOString()
      })));
    }
  }, [scheduledServices]);

  // Check supabase directly for debugging purposes
  useEffect(() => {
    if (technicianId) {
      const checkDbDirectly = async () => {
        console.log('Verificando diretamente no banco de dados para o técnico:', technicianId);
        const { data, error } = await supabase
          .from('scheduled_services')
          .select('*')
          .eq('technician_id', technicianId);
          
        if (error) {
          console.error('Erro na verificação direta:', error);
        } else {
          console.log('Resultado da verificação direta no banco:', data?.length || 0, 'serviços');
          if (data && data.length > 0) {
            console.log('Amostra dos dados do banco:', data.slice(0, 2));
            console.log('Datas dos serviços no banco:', data.map(service => ({
              id: service.id,
              startTime: service.scheduled_start_time,
              normalizedStartTime: format(new Date(service.scheduled_start_time), 'yyyy-MM-dd')
            })));
          }
        }
      };
      
      checkDbDirectly();
    }
  }, [technicianId]);

  return {
    services: scheduledServices,
    technicians,
    isLoading,
    technicianId,
    refreshServices: refreshScheduledServices
  };
};
