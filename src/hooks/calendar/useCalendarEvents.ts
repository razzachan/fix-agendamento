/**
 * 🎯 HOOK UNIFICADO DE EVENTOS DO CALENDÁRIO
 * 
 * FONTE ÚNICA DA VERDADE - Todos os componentes usam este hook
 * Elimina complexidade de sincronização entre múltiplas tabelas
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { convertToLegacyCalendarEvent } from '@/utils/calendarStatusMapping';

// Tipo simplificado baseado na nova tabela
export interface CalendarEvent {
  id: string;
  clientName: string;
  clientPhone?: string;
  clientId?: string;
  technicianId?: string;
  technicianName: string;
  startTime: Date;
  endTime: Date;
  address: string;
  addressComplement?: string;
  description?: string;
  equipmentType?: string;
  status: 'scheduled' | 'on_the_way' | 'in_progress' | 'at_workshop' | 'diagnosis' |
          'awaiting_approval' | 'in_repair' | 'ready_delivery' | 'completed' | 'cancelled';
  serviceOrderId?: string;
  originalAiId?: string;
  isUrgent?: boolean;
  logisticsGroup?: string;
  finalCost?: number;
  eventType?: 'service' | 'delivery' | 'collection' | 'diagnosis'; // ✅ Campo que estava faltando!
  parentEventId?: string; // ✅ Campo que estava faltando!
  createdAt: Date;
  updatedAt: Date;

  // Propriedades para compatibilidade com componentes existentes
  title?: string;
  equipment?: string;
  problem?: string;
}

interface UseCalendarEventsProps {
  startDate: Date;
  endDate: Date;
  technicianId?: string;
}

interface UseCalendarEventsReturn {
  events: any[]; // Eventos convertidos para compatibilidade com componentes existentes
  rawEvents: CalendarEvent[]; // Eventos originais da nova estrutura
  loading: boolean;
  error: string | null;
  refreshEvents: () => Promise<void>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  createEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByTimeSlot: (date: Date, hour: number) => any[];
}

export function useCalendarEvents({
  startDate,
  endDate,
  technicianId
}: UseCalendarEventsProps): UseCalendarEventsReturn {

  const [rawEvents, setRawEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Converter eventos para formato compatível com componentes existentes
  const events = rawEvents.map(convertToLegacyCalendarEvent);

  // Converter dados do banco para o tipo CalendarEvent
  const mapDatabaseToEvent = (data: any): CalendarEvent => ({
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
    eventType: data.event_type || 'service', // ✅ Campo que estava faltando!
    parentEventId: data.parent_event_id, // ✅ Campo que estava faltando!
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),

    // Propriedades de compatibilidade
    title: data.client_name,
    equipment: data.equipment_type || 'Não especificado',
    problem: data.description || 'Sem descrição'
  });

  // Converter CalendarEvent para dados do banco
  const mapEventToDatabase = (event: Partial<CalendarEvent>) => ({
    client_name: event.clientName,
    client_phone: event.clientPhone,
    client_id: event.clientId,
    technician_id: event.technicianId,
    technician_name: event.technicianName,
    start_time: event.startTime?.toISOString(),
    end_time: event.endTime?.toISOString(),
    address: event.address,
    address_complement: event.addressComplement,
    description: event.description,
    equipment_type: event.equipmentType,
    status: event.status,
    service_order_id: event.serviceOrderId,
    original_ai_id: event.originalAiId,
    is_urgent: event.isUrgent,
    logistics_group: event.logisticsGroup,
    final_cost: event.finalCost
  });

  // Carregar eventos do banco
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 [useCalendarEvents] Carregando eventos: ${startDate.toISOString()} até ${endDate.toISOString()}`);

      let query = supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      // Filtrar por técnico se especificado
      if (technicianId && technicianId !== 'all') {
        query = query.eq('technician_id', technicianId);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const calendarEvents = (data || []).map(mapDatabaseToEvent);

      console.log(`✅ [useCalendarEvents] Carregados ${calendarEvents.length} eventos`);
      setRawEvents(calendarEvents);

    } catch (err) {
      console.error('❌ [useCalendarEvents] Erro ao carregar eventos:', err);
      setError('Erro ao carregar eventos do calendário');
      setRawEvents([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, technicianId]);

  // Atualizar evento
  const updateEvent = useCallback(async (id: string, updates: Partial<CalendarEvent>) => {
    try {
      console.log(`🔄 [useCalendarEvents] Atualizando evento ${id}:`, updates);

      // 2. Salvar no banco PRIMEIRO (sem atualização otimista)
      const { error: updateError } = await supabase
        .from('calendar_events')
        .update(mapEventToDatabase(updates))
        .eq('id', id);

      if (updateError) throw updateError;

      console.log(`✅ [useCalendarEvents] Evento ${id} salvo no banco com sucesso`);

      // 3. Recarregar eventos para garantir sincronização
      await loadEvents();

      // Toast de sucesso
      if (updates.startTime) {
        toast.success(
          `Agendamento movido para ${format(updates.startTime, "dd/MM 'às' HH:mm", { locale: ptBR })}`,
          { duration: 3000 }
        );
      }

      console.log(`✅ [useCalendarEvents] Interface atualizada após reload`);

    } catch (err) {
      console.error('❌ [useCalendarEvents] Erro ao atualizar evento:', err);

      toast.error('Erro ao atualizar agendamento');
      throw err;
    }
  }, [loadEvents]);

  // Criar novo evento
  const createEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      console.log(`🔄 [useCalendarEvents] Criando novo evento:`, event);

      const { data, error: insertError } = await supabase
        .from('calendar_events')
        .insert(mapEventToDatabase(event))
        .select()
        .single();

      if (insertError) throw insertError;

      const newEvent = mapDatabaseToEvent(data);
      setRawEvents(prevEvents => [...prevEvents, newEvent]);

      console.log(`✅ [useCalendarEvents] Evento criado com sucesso: ${data.id}`);
      toast.success('Agendamento criado com sucesso');

      return data.id;

    } catch (err) {
      console.error('❌ [useCalendarEvents] Erro ao criar evento:', err);
      toast.error('Erro ao criar agendamento');
      throw err;
    }
  }, []);

  // Deletar evento
  const deleteEvent = useCallback(async (id: string) => {
    try {
      console.log(`🔄 [useCalendarEvents] Deletando evento ${id}`);

      // 1. Remoção otimista da interface
      setRawEvents(prevEvents => prevEvents.filter(event => event.id !== id));

      // 2. Deletar do banco
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      console.log(`✅ [useCalendarEvents] Evento ${id} deletado com sucesso`);
      toast.success('Agendamento removido com sucesso');

    } catch (err) {
      console.error('❌ [useCalendarEvents] Erro ao deletar evento:', err);
      
      // 3. Reverter remoção otimista em caso de erro
      await loadEvents();
      
      toast.error('Erro ao remover agendamento');
      throw err;
    }
  }, [loadEvents]);

  // Buscar eventos por slot de tempo
  const getEventsByTimeSlot = useCallback((date: Date, hour: number): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString() && 
             eventDate.getHours() === hour;
    });
  }, [events]);

  // Refresh manual
  const refreshEvents = useCallback(async () => {
    await loadEvents();
  }, [loadEvents]);

  // Carregar eventos quando parâmetros mudam
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events, // Eventos convertidos para compatibilidade
    rawEvents, // Eventos originais da nova estrutura
    loading,
    error,
    refreshEvents,
    updateEvent,
    createEvent,
    deleteEvent,
    getEventsByTimeSlot
  };
}

export default useCalendarEvents;
