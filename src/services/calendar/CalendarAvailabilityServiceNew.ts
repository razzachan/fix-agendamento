/**
 * 🎯 NOVA ARQUITETURA - Serviço de Disponibilidade do Calendário
 * 
 * FONTE ÚNICA DA VERDADE - Usa apenas calendar_events
 * Substitui CalendarAvailabilityService com arquitetura simplificada
 */

import { supabase } from '@/integrations/supabase/client';

export class CalendarAvailabilityServiceNew {
  
  /**
   * 🎯 NOVA ARQUITETURA: Verificar disponibilidade usando calendar_events
   */
  static async checkTechnicianAvailability(technicianId: string, date: string): Promise<boolean> {
    try {
      console.log(`🔍 [CalendarAvailabilityServiceNew] Verificando disponibilidade do técnico ${technicianId} na data ${date}`);

      // 🎯 BUSCAR EVENTOS NO CALENDÁRIO (fonte única da verdade)
      const { data: calendarEvents, error } = await supabase
        .from('calendar_events')
        .select('id, client_name, start_time, technician_id, status')
        .eq('technician_id', technicianId)
        .gte('start_time', `${date}T00:00:00`)
        .lt('start_time', `${date}T23:59:59`)
        .not('status', 'eq', 'cancelled');

      if (error) {
        console.error('❌ Erro ao buscar eventos do calendário:', error);
        throw error;
      }

      console.log(`📊 Encontrados ${calendarEvents?.length || 0} eventos para o técnico ${technicianId}`);
      
      if (calendarEvents && calendarEvents.length > 0) {
        console.log('📋 Eventos encontrados:', calendarEvents.map(event => ({
          id: event.id,
          client: event.client_name,
          date: event.start_time,
          status: event.status
        })));
      }

      // Técnico está disponível se não tem eventos agendados
      const isAvailable = !calendarEvents || calendarEvents.length === 0;
      
      console.log(`${isAvailable ? '✅' : '❌'} Técnico ${technicianId} ${isAvailable ? 'disponível' : 'ocupado'} em ${date}`);
      
      return isAvailable;

    } catch (error) {
      console.error('❌ Erro ao verificar disponibilidade:', error);
      return false;
    }
  }

  /**
   * 🎯 NOVA ARQUITETURA: Buscar horários ocupados de um técnico
   */
  static async getTechnicianBusySlots(technicianId: string, startDate: string, endDate: string): Promise<any[]> {
    try {
      console.log(`🔍 [CalendarAvailabilityServiceNew] Buscando horários ocupados do técnico ${technicianId}`);

      const { data: calendarEvents, error } = await supabase
        .from('calendar_events')
        .select('id, client_name, start_time, end_time, status')
        .eq('technician_id', technicianId)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .not('status', 'eq', 'cancelled')
        .order('start_time', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar horários ocupados:', error);
        throw error;
      }

      console.log(`📊 Encontrados ${calendarEvents?.length || 0} horários ocupados`);
      
      return calendarEvents || [];

    } catch (error) {
      console.error('❌ Erro ao buscar horários ocupados:', error);
      return [];
    }
  }

  /**
   * 🎯 NOVA ARQUITETURA: Verificar conflito de horário específico
   */
  static async checkTimeSlotConflict(
    technicianId: string, 
    datetime: string, 
    excludeEventId?: string
  ): Promise<boolean> {
    try {
      console.log(`🔍 [CalendarAvailabilityServiceNew] Verificando conflito para ${datetime}`);

      let query = supabase
        .from('calendar_events')
        .select('id, client_name, start_time')
        .eq('technician_id', technicianId)
        .eq('start_time', datetime)
        .not('status', 'eq', 'cancelled');

      // Excluir evento específico (para atualizações)
      if (excludeEventId) {
        query = query.neq('id', excludeEventId);
      }

      const { data: conflictingEvents, error } = await query;

      if (error) {
        console.error('❌ Erro ao verificar conflito:', error);
        throw error;
      }

      const hasConflict = conflictingEvents && conflictingEvents.length > 0;
      
      if (hasConflict) {
        console.log(`❌ Conflito encontrado para ${datetime}:`, conflictingEvents);
      } else {
        console.log(`✅ Sem conflitos para ${datetime}`);
      }

      return hasConflict;

    } catch (error) {
      console.error('❌ Erro ao verificar conflito:', error);
      return true; // Em caso de erro, assumir que há conflito (segurança)
    }
  }

  /**
   * 🎯 NOVA ARQUITETURA: Buscar todos os técnicos disponíveis em uma data/hora
   */
  static async getAvailableTechnicians(datetime: string): Promise<string[]> {
    try {
      console.log(`🔍 [CalendarAvailabilityServiceNew] Buscando técnicos disponíveis para ${datetime}`);

      // Buscar todos os técnicos ocupados neste horário
      const { data: busyTechnicians, error } = await supabase
        .from('calendar_events')
        .select('technician_id')
        .eq('start_time', datetime)
        .not('status', 'eq', 'cancelled');

      if (error) {
        console.error('❌ Erro ao buscar técnicos ocupados:', error);
        throw error;
      }

      const busyTechnicianIds = (busyTechnicians || []).map(event => event.technician_id);
      
      // Buscar todos os técnicos
      const { data: allTechnicians, error: techError } = await supabase
        .from('technicians')
        .select('id')
        .eq('active', true);

      if (techError) {
        console.error('❌ Erro ao buscar técnicos:', techError);
        throw techError;
      }

      // Filtrar técnicos disponíveis
      const availableTechnicians = (allTechnicians || [])
        .filter(tech => !busyTechnicianIds.includes(tech.id))
        .map(tech => tech.id);

      console.log(`✅ Técnicos disponíveis: ${availableTechnicians.length}`);
      
      return availableTechnicians;

    } catch (error) {
      console.error('❌ Erro ao buscar técnicos disponíveis:', error);
      return [];
    }
  }

  /**
   * 🎯 NOVA ARQUITETURA: Estatísticas de ocupação de técnicos
   */
  static async getTechnicianWorkloadStats(startDate: string, endDate: string): Promise<any[]> {
    try {
      console.log(`🔍 [CalendarAvailabilityServiceNew] Calculando estatísticas de ocupação`);

      const { data: events, error } = await supabase
        .from('calendar_events')
        .select('technician_id, technician_name, start_time, status')
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .not('status', 'eq', 'cancelled');

      if (error) {
        console.error('❌ Erro ao buscar eventos para estatísticas:', error);
        throw error;
      }

      // Agrupar por técnico
      const technicianStats = new Map();

      (events || []).forEach(event => {
        const techId = event.technician_id;
        if (!technicianStats.has(techId)) {
          technicianStats.set(techId, {
            technician_id: techId,
            technician_name: event.technician_name,
            total_events: 0,
            scheduled: 0,
            in_progress: 0,
            completed: 0
          });
        }

        const stats = technicianStats.get(techId);
        stats.total_events++;
        
        if (stats[event.status]) {
          stats[event.status]++;
        }
      });

      const result = Array.from(technicianStats.values());
      console.log(`📊 Estatísticas calculadas para ${result.length} técnicos`);
      
      return result;

    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas:', error);
      return [];
    }
  }
}

export default CalendarAvailabilityServiceNew;
