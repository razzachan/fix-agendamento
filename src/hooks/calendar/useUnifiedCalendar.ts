/**
 * 🎯 HOOK UNIFICADO DE CALENDÁRIO
 *
 * Este hook usa calendar_events como fonte única da verdade.
 *
 * BENEFÍCIOS:
 * ✅ Eliminação de inconsistências de timezone
 * ✅ Código mais simples e manutenível
 * ✅ Performance melhorada (menos consultas)
 * ✅ Fonte única da verdade: calendar_events
 */

import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { Technician, User } from '@/types';
import { technicianService } from '@/services/technician';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { isSameDay } from 'date-fns';

interface UseUnifiedCalendarProps {
  startDate: Date;
  endDate: Date;
  technicianId?: string;
  user: User | null;
}

interface UseUnifiedCalendarReturn {
  events: CalendarEvent[];
  technicians: Technician[];
  loading: boolean;
  error: string | null;
  refreshEvents: () => Promise<void>;
  getEventsByTimeSlot: (date: Date, hour: number) => CalendarEvent[];
  updateEvent: (eventId: string, newStartTime: Date) => Promise<void>;
}

export function useUnifiedCalendar({
  startDate,
  endDate,
  technicianId,
  user
}: UseUnifiedCalendarProps): UseUnifiedCalendarReturn {
  
  // ========================================
  // ESTADO
  // ========================================
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ========================================
  // FUNÇÕES DE CARREGAMENTO
  // ========================================

  const loadTechnicians = useCallback(async () => {
    try {
      const technicianData = await technicianService.getAll();
      setTechnicians(technicianData);
    } catch (err) {
      console.error('❌ [useUnifiedCalendar] Erro ao carregar técnicos:', err);
      setError('Erro ao carregar técnicos');
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 [useUnifiedCalendar] Carregando eventos: ${startDate.toISOString()} até ${endDate.toISOString()}`);

      // 🎯 NOVA ARQUITETURA: Usar calendar_events diretamente (fonte única da verdade)
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();

      let query = supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', startIso)
        .lte('start_time', endIso)
        .not('status', 'in', '(cancelled)')
        .order('start_time', { ascending: true });

      // Filtrar por técnico se especificado
      if (technicianId && technicianId !== 'all') {
        query = query.eq('technician_id', technicianId);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      // Converter para formato CalendarEvent
      const calendarEvents = (data || []).map(event => ({
        id: event.id,
        clientName: event.client_name,
        clientPhone: event.client_phone,
        clientId: event.client_id,
        technicianId: event.technician_id,
        technicianName: event.technician_name,
        startTime: new Date(event.start_time),
        endTime: new Date(event.end_time),
        address: event.address,
        addressComplement: event.address_complement,
        description: event.description,
        equipmentType: event.equipment_type,
        status: event.status,
        serviceOrderId: event.service_order_id,
        originalAiId: event.original_ai_id,
        isUrgent: event.is_urgent || false,
        logisticsGroup: event.logistics_group,
        finalCost: event.final_cost,
        eventType: event.event_type || 'service',
        parentEventId: event.parent_event_id,
        createdAt: new Date(event.created_at),
        updatedAt: new Date(event.updated_at)
      }));

      console.log(`✅ [useUnifiedCalendar] Carregados ${calendarEvents.length} eventos`);
      setEvents(calendarEvents);

    } catch (err) {
      console.error('❌ [useUnifiedCalendar] Erro ao carregar eventos:', err);
      setError('Erro ao carregar eventos do calendário');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [startDate.getTime(), endDate.getTime(), technicianId]);

  // ========================================
  // EFEITOS
  // ========================================

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // ========================================
  // FUNÇÕES UTILITÁRIAS
  // ========================================

  const getEventsByTimeSlot = useCallback((date: Date, hour: number): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = event.startTime;
      return isSameDay(eventDate, date) && eventDate.getHours() === hour;
    });
  }, [events]);

  const updateEvent = useCallback(async (eventId: string, newStartTime: Date): Promise<void> => {
    try {
      console.log(`🔄 [useUnifiedCalendar] Atualizando evento ${eventId} para ${newStartTime.toISOString()}`);
      
      // Atualização otimista na interface
      setEvents(prevEvents => {
        const updatedEvents = prevEvents.map(event => {
          if (event.id === eventId) {
            const duration = event.endTime.getTime() - event.startTime.getTime();
            const updatedEvent = {
              ...event,
              startTime: newStartTime,
              endTime: new Date(newStartTime.getTime() + duration)
            };
            console.log(`✅ [useUnifiedCalendar] Evento ${eventId} atualizado otimisticamente:`, {
              cliente: event.clientName,
              de: event.startTime.toISOString(),
              para: updatedEvent.startTime.toISOString()
            });
            return updatedEvent;
          }
          return event;
        });

        const eventFound = updatedEvents.some(e => e.id === eventId);
        if (!eventFound) {
          console.warn(`⚠️ [useUnifiedCalendar] Evento ${eventId} não encontrado na lista de eventos!`);
          console.log(`📋 [useUnifiedCalendar] IDs disponíveis:`, prevEvents.map(e => ({ id: e.id, cliente: e.clientName })));
        }

        return updatedEvents;
      });

      // 🎯 NOVA ARQUITETURA: Atualizar diretamente em calendar_events
      const duration = events.find(e => e.id === eventId)?.endTime.getTime() - events.find(e => e.id === eventId)?.startTime.getTime() || 60 * 60 * 1000;
      const newEndTime = new Date(newStartTime.getTime() + duration);

      const { error } = await supabase
        .from('calendar_events')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) {
        // Reverter mudança otimista em caso de erro
        await loadEvents();
        throw new Error(`Falha ao atualizar no banco de dados: ${error.message}`);
      }

      console.log('✅ [useUnifiedCalendar] Evento atualizado com sucesso');
      
    } catch (err) {
      console.error('❌ [useUnifiedCalendar] Erro ao atualizar evento:', err);
      
      // Reverter mudança otimista
      await loadEvents();
      
      toast.error('Erro ao atualizar agendamento');
      throw err;
    }
  }, [loadEvents]);

  const refreshEvents = useCallback(async (): Promise<void> => {
    await loadEvents();
  }, [loadEvents]);

  // ========================================
  // RETORNO
  // ========================================

  return {
    events,
    technicians,
    loading,
    error,
    refreshEvents,
    getEventsByTimeSlot,
    updateEvent
  };
}

export default useUnifiedCalendar;
