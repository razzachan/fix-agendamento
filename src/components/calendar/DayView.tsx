import React, { useEffect, useRef, useState } from 'react';
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
  getEventsByTimeSlot?: (date: Date, hour: number) => CalendarEvent[];
}

const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onEventClick,
  getEventsByTimeSlot
}) => {
  const workHours = Array.from({ length: 10 }, (_, i) => i + 9); // 9h às 18h
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const dayEvents = events.filter(event => isSameDay(event.startTime, currentDate));

  // Atualizar horário atual a cada minuto
  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(new Date());
    updateCurrentTime(); // Atualização inicial

    const interval = setInterval(updateCurrentTime, 60000); // A cada minuto
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll para o horário atual quando o componente monta
  useEffect(() => {
    if (scrollContainerRef.current && currentTimeRef.current) {
      const container = scrollContainerRef.current;
      const currentTimeElement = currentTimeRef.current;

      // Scroll suave para o horário atual
      setTimeout(() => {
        currentTimeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300); // Delay para permitir que a animação termine
    }
  }, [currentDate]); // Re-executar quando a data mudar

  // Verificar se é hoje para mostrar a linha do horário atual
  const isToday = isSameDay(currentDate, new Date());

  // Calcular posição da linha do horário atual
  const getCurrentTimePosition = () => {
    if (!isToday) return null;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Só mostrar se estiver dentro do horário de trabalho (9h-18h)
    if (currentHour < 9 || currentHour >= 18) return null;

    // Calcular posição relativa dentro da hora
    const hourIndex = workHours.indexOf(currentHour);
    if (hourIndex === -1) return null;

    // Posição em pixels (altura de cada slot é ~100px no desktop, ~80px no mobile)
    const slotHeight = typeof window !== 'undefined' && window.innerWidth >= 640 ? 100 : 80;
    const minuteOffset = (currentMinutes / 60) * slotHeight;
    const topPosition = (hourIndex * slotHeight) + minuteOffset;

    return {
      top: topPosition,
      time: format(now, 'HH:mm', { locale: ptBR })
    };
  };

  const currentTimePosition = getCurrentTimePosition();

  // Debug: Log eventos do dia com mais detalhes
  console.log(`📅 [DayView] Data atual: ${format(currentDate, 'dd/MM/yyyy')} (${currentDate.toISOString()})`);
  console.log(`📅 [DayView] Total eventos recebidos: ${events.length}, Eventos do dia: ${dayEvents.length}`);

  if (events.length > 0) {
    console.log('📋 [DayView] Todos os eventos recebidos:', events.map(e => ({
      id: e.id,
      clientName: e.clientName,
      startTime: format(e.startTime, 'dd/MM/yyyy HH:mm'),
      startTimeISO: e.startTime.toISOString(),
      status: e.status,
      isSameDay: isSameDay(e.startTime, currentDate)
    })));
  }

  if (dayEvents.length > 0) {
    console.log('📋 [DayView] Eventos filtrados para o dia:', dayEvents.map(e => ({
      id: e.id,
      clientName: e.clientName,
      startTime: format(e.startTime, 'HH:mm'),
      status: e.status
    })));
  }

  const getEventsForHour = (hour: number) => {
    // 🔧 CORREÇÃO: Usar a mesma função que o DragDropCalendar para consistência
    if (getEventsByTimeSlot) {
      const hourEvents = getEventsByTimeSlot(currentDate, hour);

      // Debug: Log eventos por hora apenas se houver eventos
      if (hourEvents.length > 0) {
        console.log(`⏰ [DayView] Hora ${hour}h: ${hourEvents.length} eventos (via getEventsByTimeSlot)`, hourEvents.map(e => ({
          clientName: e.clientName,
          startTime: format(e.startTime, 'HH:mm')
        })));
      }

      return hourEvents;
    }

    // Fallback para compatibilidade (caso getEventsByTimeSlot não seja fornecida)
    const hourEvents = dayEvents.filter(event => {
      const eventHour = event.startTime.getHours();
      return eventHour === hour;
    });

    // Debug: Log eventos por hora apenas se houver eventos
    if (hourEvents.length > 0) {
      console.log(`⏰ [DayView] Hora ${hour}h: ${hourEvents.length} eventos (fallback)`, hourEvents.map(e => ({
        clientName: e.clientName,
        startTime: format(e.startTime, 'HH:mm')
      })));
    }

    return hourEvents;
  };

  const getEventColor = (status: string, eventType?: string) => {
    // Cores específicas por tipo de evento
    if (eventType === 'delivery') {
      switch (status) {
        case 'scheduled': return 'border-l-blue-500 bg-blue-50 hover:bg-blue-100';
        case 'on_the_way': return 'border-l-blue-600 bg-blue-100 hover:bg-blue-150';
        case 'completed': return 'border-l-blue-700 bg-blue-200 hover:bg-blue-250';
        default: return 'border-l-blue-400 bg-blue-50 hover:bg-blue-100';
      }
    }

    if (eventType === 'collection') {
      switch (status) {
        case 'scheduled': return 'border-l-green-500 bg-green-50 hover:bg-green-100';
        case 'on_the_way': return 'border-l-green-600 bg-green-100 hover:bg-green-150';
        case 'completed': return 'border-l-green-700 bg-green-200 hover:bg-green-250';
        default: return 'border-l-green-400 bg-green-50 hover:bg-green-100';
      }
    }

    if (eventType === 'diagnosis') {
      switch (status) {
        case 'scheduled': return 'border-l-purple-500 bg-purple-50 hover:bg-purple-100';
        case 'in_progress': return 'border-l-purple-600 bg-purple-100 hover:bg-purple-150';
        case 'completed': return 'border-l-purple-700 bg-purple-200 hover:bg-purple-250';
        default: return 'border-l-purple-400 bg-purple-50 hover:bg-purple-100';
      }
    }

    // Cores padrão por status (para eventos de serviço)
    switch (status) {
      case 'scheduled': return 'border-l-blue-500 bg-blue-50 hover:bg-blue-100';
      case 'on_the_way': return 'border-l-purple-500 bg-purple-50 hover:bg-purple-100';
      case 'in_progress': return 'border-l-purple-600 bg-purple-100 hover:bg-purple-150';
      case 'completed': return 'border-l-emerald-500 bg-emerald-50 hover:bg-emerald-100';
      case 'cancelled': return 'border-l-red-500 bg-red-50 hover:bg-red-100';
      case 'at_workshop': return 'border-l-orange-500 bg-orange-50 hover:bg-orange-100';
      case 'awaiting_approval': return 'border-l-yellow-500 bg-yellow-50 hover:bg-yellow-100';
      case 'in_repair': return 'border-l-green-500 bg-green-50 hover:bg-green-100';
      case 'ready_delivery': return 'border-l-indigo-500 bg-indigo-50 hover:bg-indigo-100';
      default: return 'border-l-gray-500 bg-gray-50 hover:bg-gray-100';
    }
  };

  const getContextualStatusText = (status: string, eventType?: string) => {
    const statusMap = {
      service: {
        scheduled: 'Visita Agendada',
        on_the_way: 'Técnico a Caminho',
        in_progress: 'Atendimento em Curso',
        completed: 'Serviço Concluído',
        cancelled: 'Visita Cancelada',
        at_workshop: 'Na Oficina',
        awaiting_approval: 'Aguardando Aprovação',
        in_repair: 'Em Reparo',
        ready_delivery: 'Pronto p/ Entrega'
      },
      collection: {
        scheduled: 'Coleta Agendada',
        on_the_way: 'Indo Coletar',
        in_progress: 'Coletando Equipamento',
        completed: 'Equipamento Coletado',
        cancelled: 'Coleta Cancelada'
      },
      delivery: {
        scheduled: 'Entrega Agendada',
        on_the_way: 'Saiu para Entrega',
        in_progress: 'Entregando',
        completed: 'Equipamento Entregue',
        cancelled: 'Entrega Cancelada'
      },
      diagnosis: {
        scheduled: 'Diagnóstico Agendado',
        in_progress: 'Diagnosticando',
        completed: 'Diagnóstico Pronto',
        cancelled: 'Diagnóstico Cancelado'
      }
    };

    const type = eventType || 'service';
    return statusMap[type]?.[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      // 🔵 AZUL - Agendado
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';

      // 🟣 ROXO - A caminho
      case 'on_the_way': return 'bg-purple-100 text-purple-800 border-purple-200';

      // 🟣 ROXO - Em andamento
      case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200';

      // 🟠 LARANJA - Na oficina (recebido)
      case 'at_workshop': return 'bg-orange-100 text-orange-800 border-orange-200';

      // 🟡 AMARELO - Aguardando aprovação do cliente
      case 'awaiting_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200';

      // 🟢 VERDE - Orçamento aprovado / Em reparo
      case 'in_repair': return 'bg-green-100 text-green-800 border-green-200';

      // 🔷 AZUL ESCURO - Pronto para entrega
      case 'ready_delivery': return 'bg-indigo-100 text-indigo-800 border-indigo-200';

      // ✅ VERDE ESCURO - Concluído
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';

      // 🔴 VERMELHO - Cancelado
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';

      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-2 sm:space-y-4">
      {/* Cabeçalho do dia - compacto no mobile */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-3 sm:p-6">
          <CardTitle className="text-lg sm:text-2xl font-bold text-center">
            {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </CardTitle>
          <div className="text-center text-xs sm:text-sm text-muted-foreground">
            {dayEvents.length} agendamento{dayEvents.length !== 1 ? 's' : ''} para hoje
          </div>
        </CardHeader>
      </Card>

      {/* Timeline do dia - otimizada para mobile */}
      <Card className="shadow-lg border-0 overflow-hidden">
        <CardContent className="p-0">
          <div
            ref={scrollContainerRef}
            className="max-h-[70vh] sm:max-h-[600px] overflow-y-auto relative"
          >
            {/* Linha do horário atual */}
            {currentTimePosition && (
              <motion.div
                ref={currentTimeRef}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${currentTimePosition.top}px` }}
              >
                <div className="flex items-center">
                  {/* Indicador de tempo com design melhorado */}
                  <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-white">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                      {currentTimePosition.time}
                    </div>
                  </div>
                  {/* Linha vermelha com gradiente */}
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-red-500 to-red-300 shadow-md"></div>
                  {/* Ponto final */}
                  <div className="w-2 h-2 bg-red-500 rounded-full shadow-sm"></div>
                </div>
              </motion.div>
            )}

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
                      flex border-b min-h-[80px] sm:min-h-[100px]
                      ${isLunchTime ? 'bg-gradient-to-r from-orange-50 to-yellow-50' : 'bg-white hover:bg-gray-50'}
                    `}
                  >
                    {/* Coluna de horário - compacta no mobile */}
                    <div className={`
                      w-12 sm:w-20 flex-shrink-0 p-2 sm:p-4 text-center border-r
                      ${isLunchTime ? 'bg-orange-100' : 'bg-gray-50'}
                    `}>
                      <div className="font-bold text-sm sm:text-lg">{hour}:00</div>
                      {isLunchTime && (
                        <div className="text-xs text-orange-600 mt-1 hidden sm:block">🍽️ Almoço</div>
                      )}
                    </div>

                    {/* Coluna de eventos - padding reduzido no mobile */}
                    <div className="flex-1 p-2 sm:p-4">
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
                                p-3 sm:p-4 rounded-lg border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md
                                ${getEventColor(event.status, event.eventType)}
                              `}
                              onClick={() => onEventClick(event)}
                            >
                              <div className="flex items-start justify-between mb-2 sm:mb-3">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                                  <span className="font-medium text-xs sm:text-sm">
                                    {format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
                                  </span>
                                </div>
                                <Badge variant="outline" className={`text-xs px-1 py-0 ${getBadgeColor(event.status)}`}>
                                  {getContextualStatusText(event.status, event.eventType)}
                                </Badge>
                              </div>

                              <div className="space-y-1 sm:space-y-2">
                                {/* 1. Nome do Equipamento */}
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <Wrench className="h-3 w-3 sm:h-4 sm:w-4 text-[#e5b034]" />
                                  <span className="font-semibold text-sm sm:text-lg">{event.equipment}</span>
                                </div>

                                {/* 2. Problema (logo após o equipamento) */}
                                {event.problem && (
                                  <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
                                    <strong>Problema:</strong> {event.problem}
                                  </div>
                                )}

                                {/* 3. Nome do Cliente */}
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <span>{event.clientName}</span>
                                </div>

                                {/* 4. Endereço */}
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                                  <span className="text-sm text-gray-600">{event.address}</span>
                                </div>

                                {/* 5. Técnico */}
                                {event.technicianName && (
                                  <div className="text-sm text-blue-600">
                                    <strong>Técnico:</strong> {event.technicianName}
                                  </div>
                                )}

                                {/* 6. Telefone do Cliente */}
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
