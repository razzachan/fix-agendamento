import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertTriangle, GripVertical, User, MapPin, Loader2 } from 'lucide-react';
import { DisplayNumber } from '@/components/common/DisplayNumber';
import { calendarAvailabilityService } from '@/services/calendar/CalendarAvailabilityService';
import { dailyRouteOptimizer, DailyOptimizationResult } from '@/services/calendar/DailyRouteOptimizer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AgendamentoWithSchedule {
  id: number;
  nome: string;
  scheduledTime?: string;
  isSelected: boolean;
  sequenceOrder?: number;
}

interface WeeklyRouteCalendarProps {
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  availabilityData?: any;
  isLoading?: boolean;
  technicianId?: string;
  className?: string;
  onAgendamentoDrop?: (agendamentoId: number, date: Date, time: string) => void;
  onAgendamentoDragStart?: (agendamento: AgendamentoWithSchedule) => void;
  onAgendamentoDragEnd?: () => void;
  draggedAgendamento?: { id: number; name: string } | null;
  agendamentos?: AgendamentoWithSchedule[];
  selectedDateString?: string;
}

const WeeklyRouteCalendar: React.FC<WeeklyRouteCalendarProps> = ({
  selectedDate,
  onDateSelect,
  availabilityData,
  isLoading,
  technicianId,
  className = '',
  onAgendamentoDrop,
  onAgendamentoDragStart,
  onAgendamentoDragEnd,
  draggedAgendamento,
  agendamentos = [],
  selectedDateString
}) => {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const week = selectedDate ? startOfWeek(selectedDate, { weekStartsOn: 1 }) : startOfWeek(new Date(), { weekStartsOn: 1 });
    console.log(`🗓️ WeeklyRouteCalendar: Inicializando currentWeek:`, week);
    console.log(`🗓️ WeeklyRouteCalendar: selectedDate:`, selectedDate);
    return week;
  });

  // Estados para drag & drop
  const [dragOverSlot, setDragOverSlot] = useState<{ date: Date; time: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Estado para armazenar slots ocupados por ordens de serviço
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());

  // Estado para armazenar dados das ordens de serviço por slot
  const [serviceOrdersBySlot, setServiceOrdersBySlot] = useState<Map<string, any[]>>(new Map());

  // Estados para otimização de rota
  const [optimizingDay, setOptimizingDay] = useState<string | null>(null);
  const [optimizationResults, setOptimizationResults] = useState<Map<string, DailyOptimizationResult>>(new Map());

  // Gerar horários de 6:00 às 18:00
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour <= 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Gerar dias da semana
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(currentWeek, i);
      days.push(day);
    }
    console.log(`📅 WeeklyRouteCalendar: Dias da semana gerados:`, days.map(d => format(d, 'yyyy-MM-dd')));
    return days;
  }, [currentWeek]);

  // Carregar slots ocupados por ordens de serviço
  useEffect(() => {
    const loadOccupiedSlots = async () => {
      console.log(`🔄 WeeklyRouteCalendar: Carregando slots ocupados para técnico: ${technicianId}`);

      if (!technicianId) {
        console.log('⚠️ WeeklyRouteCalendar: Nenhum técnico selecionado');
        setOccupiedSlots(new Set());
        return;
      }

      const occupied = new Set<string>();
      const serviceOrdersMap = new Map<string, any[]>();

      // Verificar cada dia da semana
      for (const day of weekDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        console.log(`🔍 WeeklyRouteCalendar: Verificando dia ${dateStr} para técnico ${technicianId}`);

        try {
          console.log(`🔍 WeeklyRouteCalendar: Chamando checkTechnicianAvailability com technicianId="${technicianId}", dateStr="${dateStr}"`);

          const availability = await calendarAvailabilityService.checkTechnicianAvailability(
            technicianId,
            dateStr
          );

          console.log(`📊 WeeklyRouteCalendar: Disponibilidade para ${dateStr}:`, availability);

          // Marcar slots ocupados e armazenar dados das ordens
          availability.slots.forEach(slot => {
            if (!slot.isAvailable && slot.reason === 'Agendamento confirmado') {
              const slotKey = `${dateStr}-${slot.hour.toString().padStart(2, '0')}:00`;
              occupied.add(slotKey);
              console.log(`🔒 WeeklyRouteCalendar: Slot ocupado adicionado: ${slotKey}`);
            }
          });

          // Armazenar ordens de serviço por slot
          if (availability.serviceOrders && availability.serviceOrders.length > 0) {
            availability.serviceOrders.forEach(order => {
              if (order.scheduled_date) {
                // Extrair hora da data
                const isoMatch = order.scheduled_date.match(/T(\d{2}):(\d{2}):(\d{2})/);
                if (isoMatch) {
                  const hour = parseInt(isoMatch[1]);
                  const slotKey = `${dateStr}-${hour.toString().padStart(2, '0')}:00`;

                  if (!serviceOrdersMap.has(slotKey)) {
                    serviceOrdersMap.set(slotKey, []);
                  }
                  serviceOrdersMap.get(slotKey)!.push(order);
                  console.log(`📋 WeeklyRouteCalendar: Ordem adicionada ao slot ${slotKey}:`, order);
                }
              }
            });
          }
        } catch (error) {
          console.error(`❌ WeeklyRouteCalendar: Erro ao verificar disponibilidade para ${dateStr}:`, error);
        }
      }

      console.log(`📋 WeeklyRouteCalendar: Total de slots ocupados: ${occupied.size}`, Array.from(occupied));
      console.log(`📋 WeeklyRouteCalendar: Ordens por slot:`, serviceOrdersMap);
      setOccupiedSlots(occupied);
      setServiceOrdersBySlot(serviceOrdersMap);
    };

    loadOccupiedSlots();
  }, [technicianId, weekDays]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  const handleDateTimeClick = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hours, minutes, 0, 0);
    onDateSelect(dateTime);
  };

  const isSelectedDateTime = (date: Date, time: string) => {
    if (!selectedDate) return false;
    const [hours] = time.split(':').map(Number);
    return isSameDay(date, selectedDate) && selectedDate.getHours() === hours;
  };

  const isLunchTime = (time: string) => {
    return time === '12:00';
  };

  const isPastDateTime = (date: Date, time: string) => {
    const now = new Date();
    const [hours] = time.split(':').map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hours, 0, 0, 0);
    return dateTime < now;
  };

  // Função para verificar se um slot específico está ocupado por uma ordem de serviço
  const isSlotOccupied = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slotKey = `${dateStr}-${time}`;
    return occupiedSlots.has(slotKey);
  };

  // Função para obter ordens de serviço de um slot específico
  const getSlotServiceOrders = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slotKey = `${dateStr}-${time}`;
    return serviceOrdersBySlot.get(slotKey) || [];
  };

  // Função para otimizar rota de um dia específico
  const optimizeDayRoute = async (date: Date) => {
    if (!technicianId) {
      toast.error('Nenhum técnico selecionado');
      return;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    setOptimizingDay(dateStr);

    try {
      console.log(`🔄 Otimizando rota para ${dateStr}`);

      // Obter ordens de serviço do dia
      const dayServiceOrders: any[] = [];
      serviceOrdersBySlot.forEach((orders, slotKey) => {
        if (slotKey.startsWith(dateStr)) {
          dayServiceOrders.push(...orders);
        }
      });

      // Obter pré-agendamentos do dia
      const dayPreSchedules = agendamentos.filter(agendamento => {
        return selectedDateString === dateStr && agendamento.scheduledTime;
      });

      console.log(`📋 Dia ${dateStr}: ${dayServiceOrders.length} OS, ${dayPreSchedules.length} pré-agendamentos`);

      if (dayServiceOrders.length === 0 && dayPreSchedules.length === 0) {
        toast.info('Nenhum agendamento encontrado para este dia');
        return;
      }

      // Executar otimização
      const result = await dailyRouteOptimizer.optimizeDailyRoute(
        date,
        technicianId,
        dayServiceOrders,
        dayPreSchedules
      );

      console.log(`✅ Otimização concluída:`, result);

      // Armazenar resultado
      setOptimizationResults(prev => new Map(prev.set(dateStr, result)));

      // Aplicar mudanças aos agendamentos
      await applyOptimizationChanges(result, dateStr);

      // Mostrar resultado
      const distanceReduction = result.distanceReduction.toFixed(1);
      const timeReduction = Math.round(result.timeReduction);

      if (result.changes.moved.length > 0) {
        toast.success(
          `Rota otimizada! ${result.changes.moved.length} agendamentos reorganizados. ` +
          `Redução: ${distanceReduction}km, ${timeReduction}min`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `Rota recalculada! Distância total: ${result.totalDistance.toFixed(1)}km, ` +
          `Tempo estimado: ${Math.round(result.totalTime)}min`
        );
      }

    } catch (error) {
      console.error('Erro ao otimizar rota:', error);
      toast.error('Erro ao otimizar rota. Tente novamente.');
    } finally {
      setOptimizingDay(null);
    }
  };

  // Função para aplicar mudanças de otimização
  const applyOptimizationChanges = async (result: DailyOptimizationResult, dateStr: string) => {
    console.log(`🔄 Aplicando mudanças de otimização para ${dateStr}`);

    // Aplicar mudanças através do callback onAgendamentoDrop se disponível
    if (onAgendamentoDrop) {
      for (const optimizedPoint of result.optimizedSchedule) {
        if (optimizedPoint.type === 'pre_schedule') {
          // Encontrar o agendamento original
          const originalAgendamento = agendamentos.find(ag => ag.id.toString() === optimizedPoint.id);

          if (originalAgendamento && originalAgendamento.scheduledTime !== optimizedPoint.scheduledTime) {
            console.log(`📍 Movendo agendamento ${optimizedPoint.clientName} para ${optimizedPoint.scheduledTime}`);

            // Criar data para o novo horário - garantir que seja a data correta
            const [hours, minutes] = optimizedPoint.scheduledTime.split(':').map(Number);
            const newDate = new Date(dateStr + 'T00:00:00.000Z');
            newDate.setUTCHours(hours, minutes, 0, 0);

            // Converter para data local mantendo a data correta
            const localDate = new Date(newDate.getUTCFullYear(), newDate.getUTCMonth(), newDate.getUTCDate(), hours, minutes, 0, 0);

            console.log(`📅 Data de otimização: ${dateStr}, Nova data: ${format(localDate, 'yyyy-MM-dd')}, Horário: ${optimizedPoint.scheduledTime}`);

            // Aplicar mudança via callback
            try {
              await onAgendamentoDrop(originalAgendamento.id, localDate, optimizedPoint.scheduledTime);
            } catch (error) {
              console.error(`Erro ao mover agendamento ${optimizedPoint.id}:`, error);
            }
          }
        }
      }
    }

    console.log(`✅ Mudanças aplicadas para ${dateStr}`);
  };

  // Função para verificar se um dia tem agendamentos
  const getDayAppointmentCount = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    // Contar ordens de serviço
    let serviceOrderCount = 0;
    serviceOrdersBySlot.forEach((orders, slotKey) => {
      if (slotKey.startsWith(dateStr)) {
        serviceOrderCount += orders.length;
      }
    });

    // Contar pré-agendamentos selecionados para esta data
    const preScheduleCount = agendamentos.filter(agendamento => {
      return agendamento.isSelected &&
             agendamento.scheduledTime &&
             selectedDateString === dateStr;
    }).length;

    return { serviceOrders: serviceOrderCount, preSchedules: preScheduleCount, total: serviceOrderCount + preScheduleCount };
  };

  // Função para obter agendamentos de um slot específico
  const getSlotAgendamentos = (date: Date, time: string): AgendamentoWithSchedule[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const targetTime = time;

    return agendamentos.filter(agendamento => {
      if (!agendamento.scheduledTime) return false;
      if (!agendamento.isSelected) return false; // Só mostrar agendamentos selecionados

      // Para agendamentos selecionados, eles devem aparecer na data selecionada
      // independentemente do slot específico, pois são movidos via drag & drop
      const isCorrectDate = selectedDateString === dateStr;
      if (!isCorrectDate) return false;

      // Extrair hora do scheduledTime
      const scheduledTime = agendamento.scheduledTime;

      return scheduledTime === targetTime;
    });
  };

  // Funções para drag & drop
  const handleDragOver = (e: React.DragEvent, date: Date, time: string) => {
    e.preventDefault();
    if (!draggedAgendamento || isPastDateTime(date, time) || isLunchTime(time)) return;

    setDragOverSlot({ date, time });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, date: Date, time: string) => {
    e.preventDefault();
    setDragOverSlot(null);

    if (!draggedAgendamento || !onAgendamentoDrop) {
      // Garantir que o estado seja limpo mesmo se não houver callback
      onAgendamentoDragEnd && onAgendamentoDragEnd();
      return;
    }

    if (isPastDateTime(date, time) || isLunchTime(time)) {
      // Limpar estado se o drop for inválido
      onAgendamentoDragEnd && onAgendamentoDragEnd();
      return;
    }

    onAgendamentoDrop(draggedAgendamento.id, date, time);
  };

  const isSlotHighlighted = (date: Date, time: string) => {
    return dragOverSlot &&
           isSameDay(dragOverSlot.date, date) &&
           dragOverSlot.time === time;
  };

  const canDropInSlot = (date: Date, time: string) => {
    if (!draggedAgendamento) return false;
    if (isPastDateTime(date, time)) return false;
    if (isLunchTime(time)) return false;
    if (isSlotOccupied(date, time)) return false;

    return true;
  };

  const getDateAvailability = (date: Date) => {
    if (!availabilityData || !technicianId) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    return availabilityData[dateStr];
  };

  const getTimeSlotClass = (date: Date, time: string) => {
    const isSelected = isSelectedDateTime(date, time);
    const isLunch = isLunchTime(time);
    const isPast = isPastDateTime(date, time);
    const isOccupied = isSlotOccupied(date, time);
    const availability = getDateAvailability(date);
    const hour = parseInt(time.split(':')[0]);
    const isHighlighted = isSlotHighlighted(date, time);
    const canDrop = canDropInSlot(date, time);

    let classes = 'flex items-center justify-center relative transition-all duration-200 ';

    if (isPast) {
      classes += 'bg-gray-50 text-gray-400 cursor-not-allowed ';
    } else if (isLunch) {
      classes += 'bg-gradient-to-r from-orange-50 to-yellow-50 ';
      if (draggedAgendamento) {
        classes += 'border-2 border-dashed border-red-300 ';
      }
    } else if (isOccupied) {
      // Slot ocupado por ordem de serviço
      classes += 'bg-red-100 border border-red-300 cursor-not-allowed ';
      if (draggedAgendamento) {
        classes += 'border-2 border-dashed border-red-400 ';
      }
    } else {
      // Estados de drag & drop
      if (draggedAgendamento) {
        if (canDrop) {
          classes += 'border-2 border-dashed border-green-400 bg-green-100 cursor-copy ';
          if (isHighlighted) {
            classes += 'bg-green-200 border-green-500 shadow-lg scale-105 ';
          }
        } else {
          classes += 'border-2 border-dashed border-red-300 bg-red-50 cursor-not-allowed ';
        }
      } else {
        classes += 'hover:bg-gray-50 ';
      }

      // Adicionar indicador de disponibilidade (apenas quando não está em modo drag)
      if (!draggedAgendamento && availability) {
        if (availability.available === 0) {
          classes += 'bg-red-50 ';
        } else if (availability.available < availability.total * 0.5) {
          classes += 'bg-yellow-50 ';
        } else {
          classes += 'bg-green-50 ';
        }
      }
    }

    return classes;
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM/yyyy')}`;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-300 ${
      draggedAgendamento ? 'ring-2 ring-blue-300 ring-opacity-50 shadow-lg' : ''
    } ${className}`}>
      {/* Header do calendário */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-gray-700">
            {draggedAgendamento ? 'Solte no horário desejado' : 'Selecionar Data e Horário'}
          </span>
          {draggedAgendamento && (
            <div className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              Arrastando
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <ChevronLeft className="h-3 w-3 text-gray-600" />
          </button>

          <span className="text-sm font-semibold text-gray-900 min-w-[120px] text-center">
            {formatWeekRange()}
          </span>

          <button
            onClick={() => navigateWeek('next')}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <ChevronRight className="h-3 w-3 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendário semanal - Estilo similar ao do técnico */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header dos dias */}
          <div className="grid grid-cols-8 border-b bg-gray-50">
            <div className="border-r bg-gray-100 p-2 text-center font-medium text-xs">
              Horário
            </div>
            {weekDays.map((day, index) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const appointmentCount = getDayAppointmentCount(day);
              const isOptimizing = optimizingDay === dateStr;
              const hasOptimization = optimizationResults.has(dateStr);

              return (
                <div key={index} className="p-2 text-center border-r">
                  <div className="text-xs text-gray-600 mb-1">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div className={`text-sm font-semibold mb-1 ${
                    isSameDay(day, new Date())
                      ? 'text-green-600 bg-green-100 rounded-full w-6 h-6 flex items-center justify-center mx-auto'
                      : 'text-gray-900'
                  }`}>
                    {format(day, 'dd')}
                  </div>

                  {/* Contador de agendamentos */}
                  {appointmentCount.total > 0 && (
                    <div className="text-xs text-gray-500 mb-1">
                      {appointmentCount.serviceOrders > 0 && (
                        <span className="text-red-600">{appointmentCount.serviceOrders} OS</span>
                      )}
                      {appointmentCount.serviceOrders > 0 && appointmentCount.preSchedules > 0 && (
                        <span className="text-gray-400"> • </span>
                      )}
                      {appointmentCount.preSchedules > 0 && (
                        <span className="text-blue-600">{appointmentCount.preSchedules} AG</span>
                      )}
                    </div>
                  )}

                  {/* Botão de otimização */}
                  {appointmentCount.total > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-6 px-1.5 text-xs ${
                        hasOptimization
                          ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                          : 'hover:bg-blue-50 border-blue-300 text-blue-700'
                      }`}
                      onClick={() => optimizeDayRoute(day)}
                      disabled={isOptimizing}
                      title={`Reorganizar ${appointmentCount.total} agendamentos por proximidade geográfica`}
                    >
                      {isOptimizing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <MapPin className="h-3 w-3" />
                      )}
                      {!isOptimizing && (
                        <span className="ml-1">
                          {hasOptimization ? 'OK' : 'Rota'}
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid de horários */}
          <div className="overflow-y-visible">
            {timeSlots.map((time) => {
              const hour = parseInt(time.split(':')[0]);
              return (
                <div key={time} className="grid grid-cols-8 border-b min-h-[45px]">
                  <div className={`border-r p-1 text-center text-xs font-medium ${
                    hour === 12
                      ? 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700'
                      : 'bg-gray-50'
                  }`}>
                    {time}
                    {hour === 12 && (
                      <div className="text-xs text-orange-500 mt-0.5">Almoço</div>
                    )}
                  </div>
                  {weekDays.map((day, dayIndex) => (
                    <div
                      key={`${dayIndex}-${time}`}
                      className={`border-r p-1 min-h-[45px] cursor-pointer ${getTimeSlotClass(day, time)}`}
                      onClick={() => !isPastDateTime(day, time) && !draggedAgendamento && handleDateTimeClick(day, time)}
                      onDragOver={(e) => handleDragOver(e, day, time)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day, time)}
                      title={
                        isLunchTime(time)
                          ? 'Horário de Almoço'
                          : isSlotOccupied(day, time)
                            ? 'Horário ocupado por ordem de serviço'
                            : draggedAgendamento && !canDropInSlot(day, time)
                              ? 'Slot indisponível'
                              : `${format(day, 'dd/MM/yyyy')} às ${time}`
                      }
                    >
                      {/* Ordens de serviço no slot */}
                      {(() => {
                        const slotServiceOrders = getSlotServiceOrders(day, time);
                        const slotAgendamentos = getSlotAgendamentos(day, time);

                        // Renderizar ordens de serviço primeiro (prioridade)
                        if (slotServiceOrders.length > 0) {
                          return (
                            <div className="space-y-1 w-full">
                              {slotServiceOrders.slice(0, 2).map((order, orderIndex) => {
                                // Extrair primeiro e último nome do cliente
                                const nomeCompleto = order.client_name || '';
                                const partesNome = nomeCompleto.trim().split(' ');
                                const primeiroNome = partesNome[0] || '';
                                const ultimoNome = partesNome.length > 1 ? partesNome[partesNome.length - 1] : '';
                                const nomeExibicao = ultimoNome && ultimoNome !== primeiroNome
                                  ? `${primeiroNome} ${ultimoNome}`
                                  : primeiroNome;

                                // Limitar tamanho do nome
                                const nomeFormatado = nomeExibicao.length > 12
                                  ? `${nomeExibicao.substring(0, 12)}...`
                                  : nomeExibicao;

                                return (
                                  <div
                                    key={order.id}
                                    className="px-2 py-1.5 rounded-md text-xs font-medium text-center transition-all duration-200 bg-gradient-to-r from-red-100 to-red-200 text-red-900 border border-red-300 cursor-not-allowed"
                                    title={`🔧 Ordem de Serviço\n👤 Cliente: ${nomeCompleto}\n⏰ Horário: ${time}\n📋 Status: ${order.status}\n🚫 Slot ocupado - não é possível agendar`}
                                  >
                                    <div className="flex flex-col items-center space-y-0.5">
                                      <div className="flex items-center space-x-1">
                                        <DisplayNumber
                                          item={order}
                                          index={orderIndex}
                                          variant="inline"
                                          size="sm"
                                          className="text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded-full"
                                        />
                                      </div>
                                      <span className="font-semibold leading-tight text-[11px]">{nomeFormatado}</span>
                                      <div className="flex items-center space-x-1 mt-0.5">
                                        <Clock className="h-2 w-2" />
                                        <span className="text-[8px] opacity-90">{time}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Indicador de mais ordens */}
                              {slotServiceOrders.length > 2 && (
                                <div className="px-2 py-1 rounded-md text-[10px] font-medium text-center bg-red-200 text-red-700 border border-red-300">
                                  +{slotServiceOrders.length - 2} mais OS
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Renderizar agendamentos se não houver ordens de serviço
                        if (slotAgendamentos.length > 0) {
                          return (
                            <div className="space-y-1 w-full">
                              {slotAgendamentos.slice(0, 2).map((agendamento, agendamentoIndex) => {
                                // Extrair primeiro e último nome
                                const nomeCompleto = agendamento.nome || '';
                                const partesNome = nomeCompleto.trim().split(' ');
                                const primeiroNome = partesNome[0] || '';
                                const ultimoNome = partesNome.length > 1 ? partesNome[partesNome.length - 1] : '';
                                const nomeExibicao = ultimoNome && ultimoNome !== primeiroNome
                                  ? `${primeiroNome} ${ultimoNome}`
                                  : primeiroNome;

                                // Limitar tamanho do nome
                                const nomeFormatado = nomeExibicao.length > 12
                                  ? `${nomeExibicao.substring(0, 12)}...`
                                  : nomeExibicao;

                                return (
                                  <div
                                    key={agendamento.id}
                                    draggable
                                    onDragStart={() => onAgendamentoDragStart && onAgendamentoDragStart(agendamento)}
                                    onDragEnd={() => onAgendamentoDragEnd && onAgendamentoDragEnd()}
                                    className={`px-2 py-1.5 rounded-md text-xs font-medium text-center transition-all duration-200 hover:scale-105 cursor-move ${
                                      agendamento.isSelected
                                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white border border-green-800 shadow-lg'
                                        : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 border border-blue-300 hover:from-blue-100 hover:to-blue-200'
                                    } ${
                                      draggedAgendamento?.id === agendamento.id
                                        ? 'opacity-50 scale-95 border-dashed'
                                        : ''
                                    }`}
                                    title={`🎯 Pré-agendamento\n👤 Cliente: ${nomeCompleto}\n⏰ Horário: ${agendamento.scheduledTime || time}\n📍 Arraste para mover ou clique para detalhes`}
                                  >
                                    <div className="flex flex-col items-center space-y-0.5">
                                      <div className="flex items-center space-x-1">
                                        <DisplayNumber
                                          item={{...agendamento, isPreSchedule: true}}
                                          index={agendamento.sequenceOrder ? agendamento.sequenceOrder - 1 : agendamentoIndex}
                                          variant="inline"
                                          size="sm"
                                          className="text-[10px] font-bold text-white bg-green-600 px-1.5 py-0.5 rounded-full"
                                        />
                                      </div>
                                      <span className="font-semibold leading-tight text-[11px]">{nomeFormatado}</span>
                                      {agendamento.isSelected && (
                                        <div className="flex items-center space-x-1 mt-0.5">
                                          <Clock className="h-2 w-2" />
                                          <span className="text-[8px] opacity-90">{time}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Indicador de mais agendamentos */}
                              {slotAgendamentos.length > 2 && (
                                <div className="px-2 py-1 rounded-md text-[10px] font-medium text-center bg-gray-200 text-gray-700 border border-gray-300">
                                  +{slotAgendamentos.length - 2} mais
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Conteúdo padrão quando não há agendamentos
                        if (isSelectedDateTime(day, time) && !draggedAgendamento) {
                          return (
                            <div className="bg-green-500 text-white p-1 rounded-md text-xs font-medium text-center">
                              ✓ Selecionado
                            </div>
                          );
                        }

                        return null;
                      })()}

                      {/* Indicador de drag over */}
                      {isSlotHighlighted(day, time) && canDropInSlot(day, time) && (
                        <div className="absolute inset-0 bg-green-400 bg-opacity-30 rounded-md flex items-center justify-center z-10">
                          <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                            Soltar aqui
                          </div>
                        </div>
                      )}

                      {/* Indicador de slot inválido durante drag */}
                      {draggedAgendamento && !canDropInSlot(day, time) && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer com legenda */}
      <div className="p-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-green-400"></div>
              <span className="text-gray-600">Disponível</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-yellow-400"></div>
              <span className="text-gray-600">Parcial</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-red-400"></div>
              <span className="text-gray-600">Ocupado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-orange-400"></div>
              <span className="text-gray-600">Almoço</span>
            </div>
            {draggedAgendamento && (
              <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-blue-100 rounded">
                <GripVertical className="h-3 w-3 text-blue-600" />
                <span className="text-blue-600 font-medium">Arrastando: {draggedAgendamento.name}</span>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-xs text-blue-600">Verificando...</span>
            </div>
          )}
        </div>

        {selectedDate && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Data e horário selecionados: <span className="font-medium text-green-600">
              {format(selectedDate, 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyRouteCalendar;
