/**
 * 🎯 NOVA ARQUITETURA - Hook Principal do Calendário
 * 
 * FONTE ÚNICA DA VERDADE - Usa apenas calendar_events
 * Substitui useMainCalendar com arquitetura simplificada
 */

import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { Technician, User } from '@/types';
import { technicianService } from '@/services/technician';
import { isSameDay } from 'date-fns';
import { useCalendarEvents } from '@/hooks/calendar/useCalendarEvents';

interface UseMainCalendarNewProps {
  startDate: Date;
  endDate: Date;
  technicianId: string;
  user: User | null;
}

interface UseMainCalendarNewReturn {
  events: CalendarEvent[];
  technicians: Technician[];
  isLoading: boolean;
  error: string | null;
  refreshEvents: () => void;
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  getEventsForDay: (date: Date) => CalendarEvent[];
  getEventsByTimeSlot: (date: Date, hour: number) => CalendarEvent[];
}

export const useMainCalendarNew = ({
  startDate,
  endDate,
  technicianId,
  user
}: UseMainCalendarNewProps): UseMainCalendarNewReturn => {
  
  // 🎯 NOVA ARQUITETURA: Usar useCalendarEvents (fonte única da verdade)
  const {
    events,
    loading: isLoading,
    error,
    refreshEvents,
    updateEvent,
    getEventsByTimeSlot
  } = useCalendarEvents({
    startDate,
    endDate,
    technicianId
  });

  // Buscar técnicos separadamente (apenas para admins)
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  
  useEffect(() => {
    const loadTechnicians = async () => {
      if (user?.role === 'admin') {
        try {
          const techsData = await technicianService.getAll();
          setTechnicians(techsData);
        } catch (error) {
          console.error('Erro ao carregar técnicos:', error);
        }
      }
    };
    
    loadTechnicians();
  }, [user?.role]);

  // Buscar eventos por dia
  const getEventsForDay = useCallback((date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return isSameDay(eventDate, date);
    });
  }, [events]);

  return {
    events,
    technicians,
    isLoading,
    error,
    refreshEvents,
    updateEvent,
    getEventsForDay,
    getEventsByTimeSlot
  };
};

export default useMainCalendarNew;
