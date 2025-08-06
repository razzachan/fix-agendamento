/**
 * 🎯 SERVIÇO SIMPLIFICADO DE EVENTOS DO CALENDÁRIO
 * 
 * FONTE ÚNICA DA VERDADE - Operações diretas na tabela calendar_events
 * Elimina complexidade de múltiplas tabelas e sincronização
 */

import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent } from '@/hooks/calendar/useCalendarEvents';

export class CalendarEventsService {
  
  /**
   * Buscar eventos por intervalo de datas
   */
  static async getEventsByDateRange(
    startDate: Date, 
    endDate: Date, 
    technicianId?: string
  ): Promise<CalendarEvent[]> {
    try {
      let query = supabase
        .from('calendar_events')
        .select('*, parent_event:parent_event_id(*)')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (technicianId && technicianId !== 'all') {
        query = query.eq('technician_id', technicianId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(this.mapDatabaseToEvent);
    } catch (error) {
      console.error('❌ [CalendarEventsService] Erro ao buscar eventos:', error);
      return [];
    }
  }

  /**
   * Buscar evento por ID
   */
  static async getEventById(id: string): Promise<CalendarEvent | null> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data ? this.mapDatabaseToEvent(data) : null;
    } catch (error) {
      console.error('❌ [CalendarEventsService] Erro ao buscar evento:', error);
      return null;
    }
  }

  /**
   * Criar novo evento
   */
  static async createEvent(
    event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(this.mapEventToDatabase(event))
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('❌ [CalendarEventsService] Erro ao criar evento:', error);
      throw error;
    }
  }

  /**
   * Atualizar evento
   */
  static async updateEvent(
    id: string, 
    updates: Partial<CalendarEvent>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update(this.mapEventToDatabase(updates))
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ [CalendarEventsService] Erro ao atualizar evento:', error);
      return false;
    }
  }

  /**
   * Deletar evento
   */
  static async deleteEvent(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ [CalendarEventsService] Erro ao deletar evento:', error);
      return false;
    }
  }

  /**
   * Atualizar apenas horário do evento (para drag & drop)
   */
  static async updateEventDateTime(
    id: string, 
    newStartTime: Date
  ): Promise<boolean> {
    try {
      const endTime = new Date(newStartTime.getTime() + 60 * 60 * 1000); // +1 hora

      const { error } = await supabase
        .from('calendar_events')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: endTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ [CalendarEventsService] Erro ao atualizar horário:', error);
      return false;
    }
  }

  /**
   * Atualizar status do evento
   */
  static async updateEventStatus(
    id: string, 
    newStatus: CalendarEvent['status']
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ [CalendarEventsService] Erro ao atualizar status:', error);
      return false;
    }
  }

  /**
   * Buscar eventos por técnico
   */
  static async getEventsByTechnician(
    technicianId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CalendarEvent[]> {
    try {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('technician_id', technicianId)
        .order('start_time', { ascending: true });

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('start_time', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(this.mapDatabaseToEvent);
    } catch (error) {
      console.error('❌ [CalendarEventsService] Erro ao buscar eventos do técnico:', error);
      return [];
    }
  }

  /**
   * Buscar eventos por status
   */
  static async getEventsByStatus(
    status: CalendarEvent['status'],
    startDate?: Date,
    endDate?: Date
  ): Promise<CalendarEvent[]> {
    try {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('status', status)
        .order('start_time', { ascending: true });

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('start_time', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(this.mapDatabaseToEvent);
    } catch (error) {
      console.error('❌ [CalendarEventsService] Erro ao buscar eventos por status:', error);
      return [];
    }
  }

  // ========================================
  // UTILITÁRIOS DE MAPEAMENTO
  // ========================================

  /**
   * Converter dados do banco para CalendarEvent
   */
  private static mapDatabaseToEvent(data: any): CalendarEvent {
    return {
      id: data.id,
      clientName: data.client_name,
      clientPhone: data.client_phone,
      clientId: data.client_id,
      technicianId: data.technician_id,
      technicianName: data.technician_name,
      startTime: new Date(data.start_time),
      endTime: new Date(data.end_time),
      address: data.address,
      addressComplement: data.address_complement,
      description: data.description,
      equipmentType: data.equipment_type,
      status: data.status,
      serviceOrderId: data.service_order_id,
      originalAiId: data.original_ai_id,
      isUrgent: data.is_urgent || false,
      logisticsGroup: data.logistics_group,
      finalCost: data.final_cost,
      eventType: data.event_type || 'service', // ✅ Novo campo
      parentEventId: data.parent_event_id, // ✅ Novo campo
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Converter CalendarEvent para dados do banco
   */
  private static mapEventToDatabase(event: Partial<CalendarEvent>) {
    const data: any = {};

    if (event.clientName !== undefined) data.client_name = event.clientName;
    if (event.clientPhone !== undefined) data.client_phone = event.clientPhone;
    if (event.clientId !== undefined) data.client_id = event.clientId;
    if (event.technicianId !== undefined) data.technician_id = event.technicianId;
    if (event.technicianName !== undefined) data.technician_name = event.technicianName;
    if (event.startTime !== undefined) data.start_time = event.startTime.toISOString();
    if (event.endTime !== undefined) data.end_time = event.endTime.toISOString();
    if (event.address !== undefined) data.address = event.address;
    if (event.addressComplement !== undefined) data.address_complement = event.addressComplement;
    if (event.description !== undefined) data.description = event.description;
    if (event.equipmentType !== undefined) data.equipment_type = event.equipmentType;
    if (event.status !== undefined) data.status = event.status;
    if (event.serviceOrderId !== undefined) data.service_order_id = event.serviceOrderId;
    if (event.originalAiId !== undefined) data.original_ai_id = event.originalAiId;
    if (event.isUrgent !== undefined) data.is_urgent = event.isUrgent;
    if (event.logisticsGroup !== undefined) data.logistics_group = event.logisticsGroup;
    if (event.finalCost !== undefined) data.final_cost = event.finalCost;
    if (event.eventType !== undefined) data.event_type = event.eventType; // ✅ Novo campo
    if (event.parentEventId !== undefined) data.parent_event_id = event.parentEventId; // ✅ Novo campo

    return data;
  }
}

export default CalendarEventsService;
