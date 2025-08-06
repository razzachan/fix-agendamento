/**
 * 🎯 SERVIÇO UNIFICADO DE CALENDÁRIO
 * 
 * Este serviço resolve o problema de fragmentação de dados de agendamento
 * usando APENAS a tabela scheduled_services como fonte única da verdade.
 * 
 * BENEFÍCIOS:
 * ✅ Eliminação de inconsistências de timezone
 * ✅ Fonte única da verdade para agendamentos  
 * ✅ Consultas mais simples e rápidas
 * ✅ Manutenção mais fácil
 */

import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent, ScheduledService } from '@/types';
import { createDateFromUTCString, convertLocalDateToUTCString } from '@/utils/timezoneUtils';
import { format, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export class UnifiedCalendarService {
  
  // ========================================
  // CONSULTAS DE DADOS
  // ========================================

  /**
   * 🎯 NOVA ARQUITETURA: Buscar todos os eventos ativos do calendário
   */
  static async getAllScheduledServices(): Promise<ScheduledService[]> {
    try {
      console.warn('⚠️ [UnifiedCalendarService] DEPRECATED: Use CalendarEventsService.getEventsByDateRange()');

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .not('status', 'in', '(cancelled,completed)')
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Converter calendar_events para formato ScheduledService (compatibilidade)
      return data.map(this.mapCalendarEventToScheduledService);
    } catch (error) {
      console.error('❌ [UnifiedCalendarService] Erro ao buscar eventos:', error);
      return [];
    }
  }

  /**
   * Buscar agendamentos por intervalo de datas
   */
  static async getScheduledServicesByDateRange(startDate: Date, endDate: Date): Promise<ScheduledService[]> {
    try {
      const startIso = convertLocalDateToUTCString(startOfDay(startDate));
      const endIso = convertLocalDateToUTCString(endOfDay(endDate));
      
      console.log(`🔍 [UnifiedCalendarService] Buscando agendamentos: ${format(startDate, 'dd/MM')} até ${format(endDate, 'dd/MM')}`);
      
      // 🎯 NOVA ARQUITETURA: Usar calendar_events (fonte única da verdade)
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', startIso)
        .lte('start_time', endIso)
        .not('status', 'in', '(cancelled)')
        .order('start_time', { ascending: true });

      if (error) throw error;

      console.log(`✅ [UnifiedCalendarService] Encontrados ${data.length} eventos`);
      return data.map(this.mapCalendarEventToScheduledService);
    } catch (error) {
      console.error('❌ [UnifiedCalendarService] Erro ao buscar por intervalo:', error);
      return [];
    }
  }

  /**
   * Buscar agendamentos de um técnico específico por data
   */
  static async getScheduledServicesByTechnicianAndDate(technicianId: string, date: Date): Promise<ScheduledService[]> {
    try {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const { data, error } = await supabase
        .from('scheduled_services')
        .select(`
          *,
          service_orders!service_order_id(
            final_cost,
            client_phone,
            equipment_type,
            description,
            status
          )
        `)
        .eq('technician_id', technicianId)
        .gte('scheduled_start_time', convertLocalDateToUTCString(dayStart))
        .lte('scheduled_start_time', convertLocalDateToUTCString(dayEnd))
        .not('status', 'in', '(cancelled)')
        .order('scheduled_start_time', { ascending: true });

      if (error) throw error;

      console.log(`✅ [UnifiedCalendarService] Técnico ${technicianId}: ${data.length} agendamentos em ${format(date, 'dd/MM')}`);
      return data.map(this.mapScheduledService);
    } catch (error) {
      console.error('❌ [UnifiedCalendarService] Erro ao buscar por técnico:', error);
      return [];
    }
  }

  // ========================================
  // CONVERSÃO PARA CALENDAR EVENTS
  // ========================================

  /**
   * Converter ScheduledService para CalendarEvent
   */
  static convertToCalendarEvents(scheduledServices: ScheduledService[]): CalendarEvent[] {
    return scheduledServices.map(service => {
      const startTime = createDateFromUTCString(service.scheduledStartTime);
      const endTime = createDateFromUTCString(service.scheduledEndTime);

      // Mapear status do banco para status do calendário
      const mapStatus = (status: string, isFromServiceOrder: boolean = false) => {
        switch (status) {
          // 🟡 AMARELO - Agendado
          case 'pending':
          case 'scheduled':
          case 'scheduled_collection':
            return 'scheduled';

          // 🔵 AZUL - A caminho
          case 'on_the_way':
            return 'on_the_way';

          // 🟣 ROXO - Em andamento/coleta
          case 'collected':
          case 'collected_for_diagnosis':
            return 'in_progress';

          // 🟠 LARANJA - Na oficina (recebido)
          case 'at_workshop':
          case 'received_at_workshop':
            return 'at_workshop';

          // Status 'in_progress' - Em andamento
          case 'in_progress':
            return 'in_progress';

          // 🟡 AMARELO - Aguardando aprovação do cliente
          case 'diagnosis_completed':
          case 'quote_sent':
            return 'awaiting_approval';

          // 🟢 VERDE - Orçamento aprovado / Em reparo
          case 'quote_approved':
          case 'needs_workshop':
          case 'in_repair':
            return 'in_repair';

          // 🔷 AZUL ESCURO - Pronto para entrega
          case 'ready_for_delivery':
          case 'delivery_scheduled':
          case 'collected_for_delivery':
          case 'on_the_way_to_deliver':
          case 'payment_pending':
            return 'ready_delivery';

          // ✅ VERDE ESCURO - Concluído
          case 'completed':
          case 'delivered':
            return 'completed';

          // 🔴 VERMELHO - Cancelado
          case 'cancelled':
          case 'quote_rejected':
          case 'returned':
            return 'cancelled';

          default:
            console.warn(`⚠️ [unifiedCalendarService] Status desconhecido: "${status}", usando 'scheduled' como fallback`);
            return 'scheduled';
        }
      };

      // Priorizar status da service_order quando disponível
      let finalStatus: string;
      let isFromServiceOrder: boolean;

      if (service.orderStatus) {
        finalStatus = service.orderStatus;
        isFromServiceOrder = true;
      } else {
        finalStatus = service.status;
        isFromServiceOrder = false;
      }

      const mappedStatus = mapStatus(finalStatus, isFromServiceOrder);

      // Log apenas para casos problemáticos (pode ser removido após verificação)
      if (finalStatus === 'in_progress' && service.orderStatus && service.orderStatus !== 'in_progress') {
        console.log(`⚠️ [UnifiedCalendarService] Status inconsistente para ${service.clientName}: scheduled=${service.status}, order=${service.orderStatus}`);
      }

      return {
        id: service.serviceOrderId || service.id,
        title: service.clientName,
        startTime,
        endTime,
        clientName: service.clientName,
        technicianId: service.technicianId || '',
        technicianName: service.technicianName || 'Não atribuído',
        equipment: service.equipmentType || 'Não especificado',
        problem: service.description || 'Sem descrição',
        address: service.address,
        status: mappedStatus,
        serviceOrderId: service.serviceOrderId,
        finalCost: service.finalCost,
        clientPhone: service.clientPhone
      };
    });
  }

  /**
   * Obter eventos por slot de tempo (para drag and drop)
   */
  static getEventsByTimeSlot(events: CalendarEvent[], date: Date, hour: number): CalendarEvent[] {
    return events.filter(event => {
      const eventDate = event.startTime;
      return isSameDay(eventDate, date) && eventDate.getHours() === hour;
    });
  }

  // ========================================
  // OPERAÇÕES DE ATUALIZAÇÃO
  // ========================================

  /**
   * Atualizar data/hora de um agendamento
   */
  static async updateScheduledServiceDateTime(serviceId: string, newStartTime: Date): Promise<boolean> {
    try {
      const endTime = new Date(newStartTime.getTime() + 60 * 60 * 1000); // +1 hora
      
      console.log(`🔄 [UnifiedCalendarService] Atualizando agendamento ${serviceId}:`);
      console.log(`🔄 [UnifiedCalendarService] Nova data: ${format(newStartTime, 'dd/MM/yyyy HH:mm')}`);
      
      // Atualizar scheduled_services (fonte única da verdade)
      const { error: ssError } = await supabase
        .from('scheduled_services')
        .update({
          scheduled_start_time: convertLocalDateToUTCString(newStartTime),
          scheduled_end_time: convertLocalDateToUTCString(endTime)
        })
        .eq('id', serviceId);

      if (ssError) throw ssError;

      // Sincronizar com service_orders para manter compatibilidade
      const { error: soError } = await supabase
        .from('service_orders')
        .update({
          scheduled_date: convertLocalDateToUTCString(newStartTime)
        })
        .eq('id', serviceId);

      // Não falhar se a OS não existir (pode ser um agendamento independente)
      if (soError && !soError.message.includes('No rows updated')) {
        console.warn('⚠️ [UnifiedCalendarService] Aviso ao sincronizar OS:', soError);
      }

      console.log('✅ [UnifiedCalendarService] Agendamento atualizado com sucesso!');
      return true;
    } catch (error) {
      console.error('❌ [UnifiedCalendarService] Erro ao atualizar agendamento:', error);
      return false;
    }
  }

  // ========================================
  // UTILITÁRIOS PRIVADOS
  // ========================================

  /**
   * 🎯 NOVA ARQUITETURA: Mapear calendar_events para ScheduledService (compatibilidade)
   */
  private static mapCalendarEventToScheduledService(data: any): ScheduledService {
    return {
      id: data.id,
      serviceOrderId: data.service_order_id,
      technicianId: data.technician_id,
      technicianName: data.technician_name,
      clientId: data.client_id,
      clientName: data.client_name,
      scheduledStartTime: data.start_time,
      scheduledEndTime: data.end_time,
      address: data.address,
      description: data.description,
      status: data.status,
      finalCost: data.final_cost || null,
      clientPhone: data.client_phone || null,
      equipmentType: data.equipment_type || null,
      orderStatus: data.status // Em calendar_events, status já é o status final
    };
  }

  /**
   * DEPRECATED: Mapear dados do Supabase para ScheduledService (tabela antiga)
   */
  private static mapScheduledService(data: any): ScheduledService {
    console.warn('⚠️ [UnifiedCalendarService] DEPRECATED: mapScheduledService - Use mapCalendarEventToScheduledService');
    return {
      id: data.id,
      serviceOrderId: data.service_order_id,
      technicianId: data.technician_id,
      technicianName: data.technician_name,
      clientId: data.client_id,
      clientName: data.client_name,
      scheduledStartTime: data.scheduled_start_time,
      scheduledEndTime: data.scheduled_end_time,
      address: data.address,
      description: data.description,
      status: data.status,
      finalCost: data.service_orders?.final_cost || null,
      clientPhone: data.service_orders?.client_phone || null,
      equipmentType: data.service_orders?.equipment_type || null,
      orderStatus: data.service_orders?.status || null
    };
  }

  // ========================================
  // MÉTODOS DE COMPATIBILIDADE
  // ========================================

  /**
   * Método de compatibilidade para substituir useMainCalendar
   */
  static async getCalendarData(startDate: Date, endDate: Date) {
    const scheduledServices = await this.getScheduledServicesByDateRange(startDate, endDate);
    const events = this.convertToCalendarEvents(scheduledServices);
    
    return {
      events,
      getEventsByTimeSlot: (date: Date, hour: number) => this.getEventsByTimeSlot(events, date, hour),
      updateEvent: this.updateScheduledServiceDateTime
    };
  }
}

export default UnifiedCalendarService;
