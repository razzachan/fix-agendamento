import React from 'react';
import { CalendarEvent } from '@/types/calendar';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onDateClick
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Gerar todas as datas do mês (incluindo dias da semana anterior/posterior para completar o grid)
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - monthStart.getDay());
  
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));
  
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(event.startTime, date));
  };

  const getEventColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'suggested': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'in_progress': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardContent className="p-0">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          {weekDays.map(day => (
            <div key={day} className="p-4 text-center font-semibold text-gray-700 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Grid do calendário */}
        <div className="grid grid-cols-7">
          <AnimatePresence mode="wait">
            {allDays.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              
              return (
                <motion.div
                  key={day.toISOString()}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.01 }}
                  className={`
                    min-h-[120px] border-r border-b last:border-r-0 p-2 cursor-pointer transition-all duration-200
                    ${isCurrentMonth ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}
                    ${isTodayDate ? 'bg-blue-50 ring-2 ring-blue-200' : ''}
                  `}
                  onClick={() => onDateClick?.(day)}
                >
                  {/* Número do dia */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`
                      text-sm font-medium
                      ${isTodayDate ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                      ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    `}>
                      {format(day, 'd')}
                    </span>
                    
                    {dayEvents.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {dayEvents.length}
                      </Badge>
                    )}
                  </div>

                  {/* Eventos do dia */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event, eventIndex) => (
                      <Tooltip key={event.id}>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: eventIndex * 0.1 }}
                            className={`
                              text-xs p-1 rounded cursor-pointer truncate transition-all duration-200 hover:scale-105
                              ${getEventColor(event.status)}
                            `}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                          >
                            <div className="font-medium truncate">
                              {format(event.startTime, 'HH:mm')} {event.clientName}
                            </div>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <div className="font-medium">{event.clientName}</div>
                            <div>{event.equipment}</div>
                            <div>{format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        +{dayEvents.length - 3} mais
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthView;
