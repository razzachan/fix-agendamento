import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, addDays, startOfDay, eachDayOfInterval, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TechnicianTimeSlotsProps {
  selectedTechnicianId: string;
  selectedDate: string;
  selectedTime: string;
  onTimeSlotSelect: (date: string, time: string) => void;
  currentWeek: Date;
  onWeekChange: (direction: 'prev' | 'next') => void;
}

const TechnicianTimeSlots: React.FC<TechnicianTimeSlotsProps> = ({
  selectedTechnicianId,
  selectedDate,
  selectedTime,
  onTimeSlotSelect,
  currentWeek,
  onWeekChange
}) => {
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  // Buscar eventos do calendário para o técnico
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!selectedTechnicianId) return;

      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('technician_id', selectedTechnicianId)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .neq('status', 'cancelled');

      if (!error && data) {
        setCalendarEvents(data);
      }
    };

    fetchCalendarEvents();
  }, [selectedTechnicianId, currentWeek]);

  // Horários disponíveis (9h às 17h)
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  // Obter dias da semana atual
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Segunda-feira
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Domingo
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Verificar se um horário está ocupado
  const isTimeSlotOccupied = (date: Date, time: string) => {
    if (!selectedTechnicianId) return false;
    const dateStr = format(date, 'yyyy-MM-dd');

    // 🎯 NOVA ARQUITETURA: Usar apenas calendar_events (fonte única da verdade)
    // Não verificar service_orders para evitar duplicação e inconsistências
    const hasCalendarEvent = calendarEvents.some(event => {
      const eventDate = format(new Date(event.start_time), 'yyyy-MM-dd');
      const eventTime = format(new Date(event.start_time), 'HH:mm');
      const isMatch = eventDate === dateStr && eventTime === time;

      // Debug para Denise Deibler
      if (event.client_name?.includes('Denise') && event.client_name?.includes('Deibler')) {
        console.log(`🔍 [TechnicianTimeSlots] Denise Deibler - Evento:`, {
          eventId: event.id,
          eventDate,
          eventTime,
          checkingDate: dateStr,
          checkingTime: time,
          isMatch,
          startTime: event.start_time
        });
      }

      return isMatch;
    });

    return hasCalendarEvent;
  };

  // Verificar se é horário de almoço
  const isLunchTime = (time: string) => {
    return time === '12:00';
  };

  // Obter classe CSS para o slot de tempo
  const getTimeSlotClass = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isSelected = selectedDate === dateStr && selectedTime === time;
    const isOccupied = isTimeSlotOccupied(date, time);
    const isLunch = isLunchTime(time);
    
    if (isSelected) {
      return 'bg-[#e5b034] text-white border-[#e5b034] hover:bg-[#d4a02a]';
    }
    
    if (isOccupied) {
      return 'bg-red-100 text-red-800 border-red-200 cursor-not-allowed';
    }
    
    if (isLunch) {
      return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
    }
    
    return 'bg-white hover:bg-gray-50 border-gray-200 hover:border-[#e5b034]';
  };

  // Lidar com clique no slot de tempo
  const handleTimeSlotClick = (date: Date, time: string) => {
    if (isTimeSlotOccupied(date, time)) {
      return; // Não permitir seleção de horários ocupados
    }
    
    const dateStr = format(date, 'yyyy-MM-dd');
    onTimeSlotSelect(dateStr, time);
  };

  if (!selectedTechnicianId) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-gray-500">
          Selecione um técnico para ver os horários disponíveis
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Horários Disponíveis</h4>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onWeekChange('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[200px] text-center">
              {format(weekStart, 'dd/MM', { locale: ptBR })} - {format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}
            </span>
            <Button variant="outline" size="sm" onClick={() => onWeekChange('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => (
            <div key={day.toISOString()} className="space-y-2">
              <div className={`text-center p-2 rounded-lg text-sm font-medium ${
                isToday(day) 
                  ? 'bg-[#e5b034] text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                <div>{format(day, 'EEE', { locale: ptBR })}</div>
                <div>{format(day, 'dd')}</div>
              </div>
              
              <div className="space-y-1">
                {timeSlots.map(time => {
                  const isOccupied = isTimeSlotOccupied(day, time);
                  const isLunch = isLunchTime(time);
                  
                  return (
                    <Button
                      key={time}
                      variant="outline"
                      size="sm"
                      className={`w-full h-8 text-xs ${getTimeSlotClass(day, time)}`}
                      onClick={() => handleTimeSlotClick(day, time)}
                      disabled={isOccupied}
                      title={
                        isOccupied 
                          ? 'Horário ocupado' 
                          : isLunch 
                            ? 'Horário de almoço' 
                            : `Agendar para ${time}`
                      }
                    >
                      {isOccupied ? (
                        <span className="text-xs">Ocupado</span>
                      ) : isLunch ? (
                        <span className="text-xs">Almoço</span>
                      ) : (
                        time
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legenda */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#e5b034] rounded"></div>
            <span>Selecionado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
            <span>Ocupado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
            <span>Almoço</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white border border-gray-200 rounded"></div>
            <span>Disponível</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TechnicianTimeSlots;
