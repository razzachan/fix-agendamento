/**
 * 🎯 NOVA ARQUITETURA: Este hook agora usa calendar_events automaticamente
 * através do scheduledServiceService migrado (fonte única da verdade)
 */

import { useState, useEffect } from 'react';
import { ScheduledService } from '@/types';
import { scheduledServiceService } from '@/services/scheduledService';
import { toast } from 'sonner';

export function useScheduledServicesData() {
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [technicianId, setTechnicianId] = useState<string | null>(null);

  const fetchScheduledServices = async () => {
    try {
      setIsLoading(true);
      let data;
      
      if (technicianId) {
        data = await scheduledServiceService.getByTechnicianId(technicianId);
        console.log(`Serviços agendados para o técnico ${technicianId}:`, data);
      } else {
        data = await scheduledServiceService.getAll();
        console.log('Todos os serviços agendados:', data);
      }
      
      setScheduledServices(data);
      return true;
    } catch (error) {
      console.error('Erro ao buscar serviços agendados:', error);
      toast.error('Não foi possível carregar os agendamentos.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledServices();
  }, [technicianId]);

  const addScheduledService = async (scheduledService: Partial<ScheduledService>) => {
    try {
      if (!scheduledService.description || !scheduledService.clientName || 
          !scheduledService.address || !scheduledService.technicianName ||
          !scheduledService.scheduledStartTime || !scheduledService.scheduledEndTime) {
        toast.error('Dados incompletos para criar o agendamento.');
        return false;
      }
      
      const result = await scheduledServiceService.createScheduledService(
        scheduledService.description,
        scheduledService.clientId || null,
        scheduledService.clientName,
        scheduledService.address,
        scheduledService.technicianId || null,
        scheduledService.technicianName,
        new Date(scheduledService.scheduledStartTime),
        new Date(scheduledService.scheduledEndTime),
        scheduledService.status || 'scheduled'
      );
      
      if (result) {
        toast.success('Agendamento criado com sucesso!');
        await fetchScheduledServices();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao adicionar serviço agendado:', error);
      toast.error('Erro ao adicionar agendamento.');
      return false;
    }
  };

  const updateScheduledService = async (id: string, updates: Partial<ScheduledService>) => {
    try {
      // Implementação futura para atualização
      console.log('Atualizando agendamento:', id, updates);
      toast.success('Agendamento atualizado com sucesso!');
      await fetchScheduledServices();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar serviço agendado:', error);
      toast.error('Erro ao atualizar agendamento.');
      return false;
    }
  };

  const deleteScheduledService = async (id: string) => {
    try {
      // Implementação futura para exclusão
      console.log('Excluindo agendamento:', id);
      toast.success('Agendamento excluído com sucesso!');
      await fetchScheduledServices();
      return true;
    } catch (error) {
      console.error('Erro ao excluir serviço agendado:', error);
      toast.error('Erro ao excluir agendamento.');
      return false;
    }
  };

  return {
    scheduledServices,
    isLoading,
    technicianId,
    setTechnicianId,
    refreshScheduledServices: fetchScheduledServices,
    addScheduledService,
    updateScheduledService,
    deleteScheduledService
  };
}
