import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppData } from '@/hooks/useAppData';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, User, Clock } from 'lucide-react';

interface TechnicianCalendarProps {
  onTimeSlotSelect: (date: string, time: string, technicianId: string) => void;
  selectedTechnicianId: string;
  selectedDate: string;
  selectedTime: string;
}

const TechnicianCalendar: React.FC<TechnicianCalendarProps> = ({
  onTimeSlotSelect,
  selectedTechnicianId,
  selectedDate,
  selectedTime
}) => {
  const { technicians, serviceOrders } = useAppData();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Horários disponíveis (9h às 17h)
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  // Obter dias da semana atual
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Segunda-feira
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Domingo
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Navegar semanas
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  // Verificar se um horário está ocupado
  const isTimeSlotOccupied = (date: Date, time: string, technicianId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return serviceOrders.some(order => 
      order.technician_id === technicianId &&
      order.scheduled_date === dateStr &&
      order.scheduled_time === time &&
      order.status !== 'cancelled'
    );
  };

  // Verificar se é horário de almoço
  const isLunchTime = (time: string) => {
    return time === '12:00';
  };

  // Obter classe CSS para o slot de tempo
  const getTimeSlotClass = (date: Date, time: string, technicianId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isSelected = selectedDate === dateStr && selectedTime === time && selectedTechnicianId === technicianId;
    const isOccupied = isTimeSlotOccupied(date, time, technicianId);
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
  const handleTimeSlotClick = (date: Date, time: string, technicianId: string) => {
    if (isTimeSlotOccupied(date, time, technicianId)) {
      return; // Não permitir seleção de horários ocupados
    }
    
    const dateStr = format(date, 'yyyy-MM-dd');
    onTimeSlotSelect(dateStr, time, technicianId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Calendário de Técnicos</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[200px] text-center">
              {format(weekStart, 'dd/MM', { locale: ptBR })} - {format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}
            </span>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {technicians.map(technician => (
            <div key={technician.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#e5b034]" />
                <h4 className="font-medium text-gray-900">{technician.name}</h4>
                <Badge variant="outline">{technician.specialty || 'Geral'}</Badge>
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
                        const isOccupied = isTimeSlotOccupied(day, time, technician.id);
                        const isLunch = isLunchTime(time);
                        
                        return (
                          <Button
                            key={time}
                            variant="outline"
                            size="sm"
                            className={`w-full h-8 text-xs ${getTimeSlotClass(day, time, technician.id)}`}
                            onClick={() => handleTimeSlotClick(day, time, technician.id)}
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
            </div>
          ))}
        </div>
        
        {/* Legenda */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs">
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

export default TechnicianCalendar;
