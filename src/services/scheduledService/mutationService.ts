import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mapScheduledService } from './utils';
import { format, startOfDay, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

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
      
      const { data, error } = await supabase
        .from('scheduled_services')
        .insert({
          description,
          client_id: clientId,
          client_name: clientName,
          address,
          technician_id: technicianId,
          technician_name: technicianName,
          scheduled_start_time: scheduledStartTime.toISOString(),
          scheduled_end_time: scheduledEndTime.toISOString(),
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

      const { data, error } = await supabase
        .from('scheduled_services')
        .insert({
          description,
          client_id: clientId,  // 🔧 CORREÇÃO: Incluir client_id que estava faltando
          client_name: clientName,
          address,
          technician_id: technicianId,
          technician_name: technicianName,
          scheduled_start_time: startTime.toISOString(),
          scheduled_end_time: endTime.toISOString(),
          service_order_id: serviceOrderId,
          status: 'scheduled'
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
      console.log(`🔄 [DRAG&DROP] Atualizando ${serviceId} para ${newStartTime.toISOString()}`);

      // Validações básicas
      if (!serviceId || typeof serviceId !== 'string') {
        throw new Error(`Service ID inválido: ${serviceId}`);
      }

      if (!newStartTime || !(newStartTime instanceof Date)) {
        throw new Error(`Data inválida: ${newStartTime}`);
      }

      // Se não foi fornecida uma nova hora de fim, calcular baseado na duração padrão (1 hora)
      const endTime = newEndTime || new Date(newStartTime.getTime() + 60 * 60 * 1000);

      // Verificar se é um ID de service_order (começa com "order-")
      if (serviceId.startsWith('order-')) {
        // Extrair o ID real da service_order (remover prefixo "order-")
        const realOrderId = serviceId.replace('order-', '');

        // Atualizar a service_order
        const { data: orderData, error: orderError } = await supabase
          .from('service_orders')
          .update({
            scheduled_date: newStartTime.toISOString()
          })
          .eq('id', realOrderId)
          .select()
          .single();

        if (orderError) {
          console.error('❌ [DRAG&DROP] Erro ao atualizar service_order:', orderError);
          throw new Error(`Falha ao atualizar service_order: ${orderError.message}`);
        }

        console.log(`✅ [DRAG&DROP] Service_order atualizada com sucesso!`);

        // Retornar um objeto compatível com ScheduledService
        return {
          id: serviceId, // Manter o ID original com prefixo
          createdAt: orderData.created_at || new Date().toISOString(),
          serviceOrderId: orderData.id,
          technicianId: orderData.technician_id,
          technicianName: orderData.technician_name || '',
          clientId: orderData.client_id,
          clientName: orderData.client_name,
          scheduledStartTime: newStartTime.toISOString(),
          scheduledEndTime: endTime.toISOString(),
          address: orderData.address || '',
          description: orderData.description || '',
          status: 'scheduled'
        };
      } else {
        // Lógica original para scheduled_services
        // Verificar se o serviço existe
        const { data: existingService, error: checkError } = await supabase
          .from('scheduled_services')
          .select('id, service_order_id, scheduled_start_time, scheduled_end_time')
          .eq('id', serviceId)
          .single();

        if (checkError) {
          console.error('❌ [DRAG&DROP] Erro ao verificar serviço existente:', checkError);
          throw new Error(`Serviço não encontrado: ${checkError.message}`);
        }

        // Atualizar o scheduled_service
        const updatePayload = {
          scheduled_start_time: newStartTime.toISOString(),
          scheduled_end_time: endTime.toISOString()
        };

        const { data, error } = await supabase
          .from('scheduled_services')
          .update(updatePayload)
          .eq('id', serviceId)
          .select()
          .single();

        if (error) {
          console.error('❌ [DRAG&DROP] Erro no UPDATE:', error);
          throw new Error(`Falha no UPDATE: ${error.message}`);
        }

        console.log(`✅ [DRAG&DROP] Scheduled service atualizado!`);
        return mapScheduledService(data);
      }
    } catch (error) {
      console.error(`❌ [DRAG&DROP] ERRO:`, error);
      throw error;
    }
  }
};
