import React from 'react';
import { CalendarEvent } from '@/types/calendar';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, User, Wrench, DollarSign, Phone } from 'lucide-react';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onEventClick
}) => {
  const workHours = Array.from({ length: 10 }, (_, i) => i + 9); // 9h às 18h
  
  const dayEvents = events.filter(event => isSameDay(event.startTime, currentDate));

  const getEventsForHour = (hour: number) => {
    return dayEvents.filter(event => {
      const eventHour = event.startTime.getHours();
      return eventHour === hour;
    });
  };

  const getEventColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'border-l-blue-500 bg-blue-50 hover:bg-blue-100';
      case 'completed': return 'border-l-green-500 bg-green-50 hover:bg-green-100';
      case 'suggested': return 'border-l-yellow-500 bg-yellow-50 hover:bg-yellow-100';
      case 'cancelled': return 'border-l-red-500 bg-red-50 hover:bg-red-100';
      case 'in_progress': return 'border-l-orange-500 bg-orange-50 hover:bg-orange-100';
      default: return 'border-l-gray-500 bg-gray-50 hover:bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'completed': return 'Concluído';
      case 'suggested': return 'Sugerido';
      case 'cancelled': return 'Cancelado';
      case 'in_progress': return 'Em Progresso';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho do dia */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-2xl font-bold text-center">
            {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </CardTitle>
          <div className="text-center text-sm text-muted-foreground">
            {dayEvents.length} agendamento{dayEvents.length !== 1 ? 's' : ''} para hoje
          </div>
        </CardHeader>
      </Card>

      {/* Timeline do dia */}
      <Card className="shadow-lg border-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            <AnimatePresence>
              {workHours.map(hour => {
                const hourEvents = getEventsForHour(hour);
                const isLunchTime = hour === 12;
                
                return (
                  <motion.div
                    key={hour}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: hour * 0.05 }}
                    className={`
                      flex border-b min-h-[100px]
                      ${isLunchTime ? 'bg-gradient-to-r from-orange-50 to-yellow-50' : 'bg-white hover:bg-gray-50'}
                    `}
                  >
                    {/* Coluna de horário */}
                    <div className={`
                      w-20 flex-shrink-0 p-4 text-center border-r
                      ${isLunchTime ? 'bg-orange-100' : 'bg-gray-50'}
                    `}>
                      <div className="font-bold text-lg">{hour}:00</div>
                      {isLunchTime && (
                        <div className="text-xs text-orange-600 mt-1">🍽️ Almoço</div>
                      )}
                    </div>

                    {/* Coluna de eventos */}
                    <div className="flex-1 p-4">
                      {isLunchTime ? (
                        <div className="flex items-center justify-center h-full text-orange-600">
                          <div className="text-center">
                            <div className="text-2xl mb-2">🍽️</div>
                            <div className="font-medium">Horário de Almoço</div>
                            <div className="text-sm">12:00 - 13:00</div>
                          </div>
                        </div>
                      ) : hourEvents.length > 0 ? (
                        <div className="space-y-3">
                          {hourEvents.map((event, index) => (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={`
                                p-4 rounded-lg border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md
                                ${getEventColor(event.status)}
                              `}
                              onClick={() => onEventClick(event)}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium">
                                    {format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {getStatusText(event.status)}
                                </Badge>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <span className="font-semibold text-lg">{event.clientName}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4 text-gray-500" />
                                  <span>{event.equipment}</span>
                                </div>

                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                                  <span className="text-sm text-gray-600">{event.address}</span>
                                </div>

                                {event.problem && (
                                  <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
                                    <strong>Problema:</strong> {event.problem}
                                  </div>
                                )}

                                {event.technicianName && (
                                  <div className="text-sm text-blue-600">
                                    <strong>Técnico:</strong> {event.technicianName}
                                  </div>
                                )}

                                {/* ✅ Telefone do Cliente */}
                                {event.clientPhone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium text-blue-600">{event.clientPhone}</span>
                                  </div>
                                )}

                                {/* ✅ Valor da OS - Design Elegante */}
                                {event.finalCost && event.finalCost > 0 && (
                                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 p-2 rounded-lg border border-emerald-200">
                                    <DollarSign className="h-4 w-4" />
                                    <span className="font-semibold">R$ {event.finalCost.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <div className="text-center">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <div>Nenhum agendamento</div>
                          </div>
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
    </div>
  );
};

export default DayView;
