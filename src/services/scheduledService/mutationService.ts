import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mapScheduledService } from './utils';
import { format, startOfDay, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { convertLocalDateToUTCString } from '@/utils/timezoneUtils';

export const scheduledServiceMutationService = {
  async createScheduledService(
    description: string,
    clientId: string | null,
    clientName: string,
    address: string,
    technicianId: string | null,
    technicianName: string,
    scheduledStartTime: Date,
    scheduledEndTime: Date,
    status: string = 'scheduled'
  ) {
    try {
      console.log(`Criando serviço agendado para ${format(scheduledStartTime, 'yyyy-MM-dd HH:mm:ss')}`);
      
      // 🎯 NOVA ARQUITETURA: Criar em calendar_events (fonte única da verdade)
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          description,
          client_id: clientId,
          client_name: clientName,
          address,
          technician_id: technicianId,
          technician_name: technicianName,
          start_time: scheduledStartTime.toISOString(),
          end_time: scheduledEndTime.toISOString(),
          status
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`Serviço agendado criado com sucesso: ${data.id}`);
      return mapScheduledService(data);
    } catch (error) {
      console.error('Erro ao criar serviço agendado:', error);
      toast.error('Erro ao criar serviço agendado.');
      throw error;
    }
  },

  async createFromServiceOrder(
    serviceOrderId: string,
    clientName: string,
    description: string,
    address: string,
    technicianId: string,
    technicianName: string,
    scheduledDate: Date,
    clientId?: string | null  // 🔧 CORREÇÃO: Adicionar clientId como parâmetro
  ) {
    try {
      console.log(`🔍 [mutationService] Criando agendamento a partir da ordem de serviço ${serviceOrderId}`);
      console.log(`🔍 [mutationService] Data fornecida: ${scheduledDate.toString()}`);
      console.log(`🔍 [mutationService] Data fornecida formatada: ${format(scheduledDate, 'yyyy-MM-dd HH:mm:ss')}`);
      console.log(`🔍 [mutationService] Tipo da data: ${typeof scheduledDate}`);
      console.log(`🔍 [mutationService] Data é válida: ${!isNaN(scheduledDate.getTime())}`);

      // Usar a data e hora exatas fornecidas (já processadas no NewOrderDialog)
      const startTime = new Date(scheduledDate);

      // Criar horário de término adicionando 1 hora (padrão do sistema)
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hora

      console.log(`🔍 [mutationService] Data de início: ${startTime.toISOString()} (${format(startTime, 'yyyy-MM-dd HH:mm:ss')})`);
      console.log(`🔍 [mutationService] Data de término: ${endTime.toISOString()} (${format(endTime, 'yyyy-MM-dd HH:mm:ss')})`);

      // 🎯 NOVA ARQUITETURA: Criar em calendar_events (fonte única da verdade)
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          service_order_id: serviceOrderId,
          description,
          client_id: clientId,
          client_name: clientName,
          address,
          technician_id: technicianId,
          technician_name: technicianName,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'scheduled',
          event_type: 'service'
        })
        .select()
        .single();

      if (error) {
        console.error('Erro na inserção:', error);
        throw error;
      }

      console.log('Serviço agendado criado com sucesso:', data);
      return data ? mapScheduledService(data) : null;
    } catch (error) {
      console.error('Erro ao criar serviço agendado a partir da ordem de serviço:', error);
      return null;
    }
  },

  async updateServiceStatus(serviceId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('scheduled_services')
        .update({ status: newStatus })
        .eq('id', serviceId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error(`Erro ao atualizar status do serviço ${serviceId}:`, error);
      return false;
    }
  },

  async updateServiceDateTime(serviceId: string, newStartTime: Date, newEndTime?: Date) {
    try {
      console.warn(`🎯 [NOVA ARQUITETURA] === ATUALIZANDO EVENTO ===`);
      console.warn(`🎯 [NOVA ARQUITETURA] Event ID: ${serviceId}`);
      console.warn(`🎯 [NOVA ARQUITETURA] Nova data: ${newStartTime.toISOString()}`);

      // Validações básicas
      if (!serviceId || typeof serviceId !== 'string') {
        throw new Error(`Event ID inválido: ${serviceId}`);
      }

      if (!newStartTime || !(newStartTime instanceof Date)) {
        throw new Error(`Data inválida: ${newStartTime}`);
      }

      // Se não foi fornecida uma nova hora de fim, calcular baseado na duração padrão (1 hora)
      const endTime = newEndTime || new Date(newStartTime.getTime() + 60 * 60 * 1000);

      // 🎯 NOVA ARQUITETURA: Atualização SIMPLES em calendar_events (fonte única da verdade)
      const { data, error } = await supabase
        .from('calendar_events')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: endTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)
        .select()
        .single();

      if (error) {
        console.error('❌ [NOVA ARQUITETURA] Erro ao atualizar evento:', error);
        throw new Error(`Falha ao atualizar evento: ${error.message}`);
      }

      console.warn(`✅ [NOVA ARQUITETURA] Evento atualizado com sucesso!`);
      return data;


    } catch (error) {
      console.error(`❌ [NOVA ARQUITETURA] ERRO:`, error);
      throw error;
    }
  },

  // Outras funções podem ser adicionadas aqui no futuro
};
