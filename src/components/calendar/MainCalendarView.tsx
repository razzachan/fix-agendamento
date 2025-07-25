import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Wrench,
  AlertCircle,
  Filter,
  RefreshCcw,
  BarChart3,
  Settings,
  Maximize2,
  Minimize2,
  Search,
  Move,
  DollarSign,
  Phone,
  Edit
} from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, addMonths, subMonths, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useMainCalendar } from '@/hooks/calendar/useMainCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { CalendarEvent, CalendarViewMode } from '@/types/calendar';
import { SLOT_COLORS } from '@/types/calendar';
import { toast } from 'sonner';
import CalendarViewSelector from './CalendarViewSelector';
import MonthView from './MonthView';
import DayView from './DayView';
import ListView from './ListView';
import CalendarAnalytics from './CalendarAnalytics';
import CalendarNotifications from './CalendarNotifications';
import DragDropCalendar from './DragDropCalendar';
import { EditOrderValueModal } from './EditOrderValueModal';
import { scheduledServiceService } from '@/services/scheduledService';

interface MainCalendarViewProps {
  className?: string;
}

const MainCalendarView: React.FC<MainCalendarViewProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('day');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEditValueModalOpen, setIsEditValueModalOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragDropEnabled, setIsDragDropEnabled] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Calcular datas baseadas na visualização atual
  const getDateRange = useCallback(() => {
    switch (viewMode) {
      case 'month':
        return {
          startDate: startOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), { weekStartsOn: 1 }),
          endDate: endOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), { weekStartsOn: 1 })
        };
      case 'week':
        return {
          startDate: startOfWeek(currentDate, { weekStartsOn: 1 }),
          endDate: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
      case 'day':
        return {
          startDate: startOfDay(currentDate),
          endDate: endOfDay(currentDate)
        };
      case 'list':
        return {
          startDate: subDays(currentDate, 30),
          endDate: addDays(currentDate, 30)
        };
      default:
        return {
          startDate: startOfWeek(currentDate, { weekStartsOn: 1 }),
          endDate: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
    }
  }, [currentDate, viewMode]);

  const { startDate, endDate } = getDateRange();

  const {
    events,
    technicians,
    isLoading,
    refreshEvents,
    updateEvent,
    getEventsForDay,
    getEventsByTimeSlot
  } = useMainCalendar({
    startDate,
    endDate,
    technicianId: selectedTechnicianId,
    user
  });

  // Horários de trabalho (6h às 18h, incluindo slot do almoço para separação visual)
  const workHours = [
    6, 7, 8, 9, 10, 11, // Manhã (expandido para incluir 6h e 7h)
    12, // Almoço (separação visual)
    13, 14, 15, 16, 17 // Tarde
  ];

  // Dias da semana atual
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 })
  });

  // Navegação baseada na visualização atual
  const navigatePrevious = useCallback(() => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(prev => subMonths(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => subWeeks(prev, 1));
        break;
      case 'day':
        setCurrentDate(prev => subDays(prev, 1));
        break;
      default:
        setCurrentDate(prev => subWeeks(prev, 1));
    }
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(prev => addMonths(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => addWeeks(prev, 1));
        break;
      case 'day':
        setCurrentDate(prev => addDays(prev, 1));
        break;
      default:
        setCurrentDate(prev => addWeeks(prev, 1));
    }
  }, [viewMode]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Função para atualizar evento (drag & drop)
  const handleEventUpdate = useCallback(async (eventId: string, newStartTime: Date) => {
    console.warn(`🔄 [MAIN UPDATE] Atualizando ${eventId} para ${newStartTime.toISOString()}`);

    // 1. ATUALIZAÇÃO OTIMISTA - Atualizar interface imediatamente
    const newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000); // +1 hora
    updateEvent(eventId, {
      startTime: newStartTime,
      endTime: newEndTime
    });
    console.warn(`🔄 [MAIN UPDATE] Interface atualizada otimisticamente`);

    // Forçar re-render do calendário
    setRefreshKey(prev => prev + 1);

    try {
      // 2. SALVAR NO BANCO DE DADOS
      const updatedService = await scheduledServiceService.updateServiceDateTime(eventId, newStartTime);

      if (!updatedService) {
        throw new Error('Falha ao atualizar serviço no banco de dados');
      }

      console.warn('✅ [MAIN UPDATE] Serviço atualizado no banco!');

      // 3. SINCRONIZAR COM BACKEND (em background)
      setTimeout(async () => {
        try {
          await refreshEvents();
          console.warn('✅ [MAIN UPDATE] Dados sincronizados com backend');
        } catch (syncError) {
          console.warn('⚠️ [MAIN UPDATE] Erro na sincronização (interface já atualizada):', syncError);
        }
      }, 1000);

      console.warn('✅ [MAIN UPDATE] Update completed - INTERFACE E BANCO ATUALIZADOS!');
    } catch (error) {
      console.error('❌ [MAIN UPDATE] Erro ao atualizar agendamento:', error);

      // 4. REVERTER ATUALIZAÇÃO OTIMISTA EM CASO DE ERRO
      console.warn('🔄 [MAIN UPDATE] Revertendo mudança na interface...');
      await refreshEvents(); // Recarregar dados originais

      // Mostrar toast de erro
      toast.error('❌ Erro ao atualizar agendamento no banco de dados');
      throw error; // Re-throw para que o DragDropCalendar saiba que houve erro
    }
  }, [refreshEvents, updateEvent]);

  // Abrir modal de evento
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleEditValue = () => {
    if (selectedEvent?.serviceOrderId) {
      setIsEditValueModalOpen(true);
    }
  };

  const handleValueUpdated = (newValue: number) => {
    if (selectedEvent) {
      // Atualizar o evento selecionado com o novo valor
      setSelectedEvent({
        ...selectedEvent,
        finalCost: newValue
      });

      // Forçar refresh dos dados
      setRefreshKey(prev => prev + 1);
    }
  };

  // Atalhos de teclado
  useKeyboardShortcuts({
    onViewChange: setViewMode,
    onNavigate: (direction) => {
      switch (direction) {
        case 'prev':
          navigatePrevious();
          break;
        case 'next':
          navigateNext();
          break;
        case 'today':
          navigateToday();
          break;
      }
    },
    onRefresh: refreshEvents,
    onToggleAnalytics: () => setShowAnalytics(prev => !prev),
    onSearch: () => {
      // Implementar busca se necessário
      toast.info('Funcionalidade de busca em desenvolvimento');
    },
    currentView: viewMode
  });

  // Função para alternar fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  // Função para lidar com clique em data (para criar novo evento)
  const handleDateClick = useCallback((date: Date) => {
    // Implementar criação de novo evento
    toast.info(`Criar novo agendamento para ${format(date, 'dd/MM/yyyy', { locale: ptBR })}`);
  }, []);

  // Obter título baseado na visualização
  const getViewTitle = useCallback(() => {
    switch (viewMode) {
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: ptBR });
      case 'week':
        return `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM', { locale: ptBR })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd/MM/yyyy', { locale: ptBR })}`;
      case 'day':
        return format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      case 'list':
        return 'Lista de Agendamentos';
      default:
        return 'Calendário';
    }
  }, [viewMode, currentDate]);



  // Renderizar evento no calendário
  const renderCalendarEvent = (event: CalendarEvent, index: number) => {
    const statusColors = {
      confirmed: 'bg-blue-100 border-blue-300 text-blue-800',
      suggested: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      completed: 'bg-green-100 border-green-300 text-green-800',
      cancelled: 'bg-red-100 border-red-300 text-red-800',
      in_progress: 'bg-orange-100 border-orange-300 text-orange-800'
    };

    const urgencyIcon = event.isUrgent ? (
      <AlertCircle className="h-3 w-3 text-red-500" />
    ) : null;

    return (
      <div
        key={event.id}
        className={`
          p-1 rounded-md border-l-4 cursor-pointer transition-all duration-200
          hover:shadow-md hover:scale-[1.02] text-xs relative z-20
          ${statusColors[event.status] || statusColors.confirmed}
        `}
        onClick={() => handleEventClick(event)}
        title={`${event.clientName} - ${event.equipment} - ${format(event.startTime, 'HH:mm')}`}
        style={{
          minHeight: '35px',
          marginBottom: '1px'
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              {urgencyIcon}
              <span className="font-medium truncate">
                {event.clientName}
              </span>
            </div>
            <div className="text-xs opacity-75 truncate">
              {event.equipment}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <User className="h-3 w-3" />
              <span className="text-xs truncate">
                {event.technicianName}
              </span>
            </div>

            {/* ✅ Valor da OS - Design Limpo */}
            {(event.finalCost && event.finalCost > 0) && (
              <div className="flex items-center gap-1 mt-1">
                <DollarSign className="h-3 w-3 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">
                  R$ {event.finalCost.toFixed(2)}
                </span>
              </div>
            )}

            {/* ✅ Telefone do Cliente - Design Limpo */}
            {event.clientPhone && (
              <div className="flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">
                  {event.clientPhone}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className={`space-y-4 pb-20 ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-4 overflow-auto' : ''}`} style={{ transform: 'scale(0.85)', transformOrigin: 'top left', width: '117.6%' }}>
        {/* Header com controles avançados */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-lg shadow-md">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                    Calendário Principal
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getViewTitle()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Seletor de visualização */}
                <CalendarViewSelector
                  currentView={viewMode}
                  onViewChange={setViewMode}
                />

                {/* Seletor de técnico */}
                {user?.role === 'admin' && (
                  <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Selecionar técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os técnicos</SelectItem>
                      {technicians.map(tech => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Notificações - ✅ TEMPORARIAMENTE DESABILITADO PARA CORRIGIR SPAM */}
                {/* <CalendarNotifications
                  events={events}
                  onEventClick={handleEventClick}
                /> */}

                {/* Controles adicionais */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDragDropEnabled(prev => !prev)}
                        className={isDragDropEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                      >
                        <Move className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isDragDropEnabled ? 'Desabilitar Drag & Drop' : 'Habilitar Drag & Drop'}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAnalytics(prev => !prev)}
                        className={showAnalytics ? 'bg-blue-100 text-blue-700' : ''}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Analytics</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDragDropEnabled(prev => !prev)}
                        className={isDragDropEnabled ? 'bg-green-100 text-green-700' : ''}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isDragDropEnabled ? 'Desabilitar' : 'Habilitar'} Drag & Drop
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleFullscreen}
                      >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isFullscreen ? 'Sair do' : 'Entrar em'} Tela Cheia
                    </TooltipContent>
                  </Tooltip>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshEvents}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Analytics (se habilitado) */}
        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <CalendarAnalytics
                events={events}
                technicians={technicians}
                currentDate={currentDate}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navegação */}
        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigatePrevious}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {viewMode === 'month' ? 'Mês Anterior' :
                   viewMode === 'day' ? 'Dia Anterior' : 'Anterior'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateToday}
                  className="px-4"
                >
                  Hoje
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateNext}
                  className="flex items-center gap-2"
                >
                  {viewMode === 'month' ? 'Próximo Mês' :
                   viewMode === 'day' ? 'Próximo Dia' : 'Próximo'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-lg font-semibold">
                {getViewTitle()}
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {events.length} agendamento{events.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo principal baseado na visualização */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewMode}-${refreshKey}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {viewMode === 'month' && (
              <>
                {isDragDropEnabled ? (
                  <DragDropCalendar
                    key={`drag-drop-month-${refreshKey}`}
                    events={events}
                    weekDays={weekDays}
                    workHours={workHours}
                    onEventUpdate={handleEventUpdate}
                    onEventClick={handleEventClick}
                    getEventsByTimeSlot={getEventsByTimeSlot}
                  />
                ) : (
                  <MonthView
                    currentDate={currentDate}
                    events={events}
                    onEventClick={handleEventClick}
                    onDateClick={handleDateClick}
                  />
                )}
              </>
            )}

            {viewMode === 'day' && (
              <DayView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
              />
            )}

            {viewMode === 'list' && (
              <>
                {isDragDropEnabled ? (
                  <DragDropCalendar
                    key={`drag-drop-list-${refreshKey}`}
                    events={events}
                    weekDays={weekDays}
                    workHours={workHours}
                    onEventUpdate={handleEventUpdate}
                    onEventClick={handleEventClick}
                    getEventsByTimeSlot={getEventsByTimeSlot}
                  />
                ) : (
                  <ListView
                    events={events}
                    onEventClick={handleEventClick}
                  />
                )}
              </>
            )}

            {viewMode === 'week' && (
              <>
                {isDragDropEnabled ? (
                  <DragDropCalendar
                    key={`drag-drop-week-${refreshKey}`}
                    events={events}
                    weekDays={weekDays}
                    workHours={workHours}
                    onEventUpdate={handleEventUpdate}
                    onEventClick={handleEventClick}
                    getEventsByTimeSlot={getEventsByTimeSlot}
                  />
                ) : (
                  // Calendário semanal tradicional (sem drag & drop)
                  <Card className="shadow-lg border-0 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="grid grid-cols-8 border-b bg-gray-50">
                        {/* Coluna de horários */}
                        <div className="border-r bg-gray-100 p-2 text-center font-medium text-xs">
                          Horário
                        </div>

                        {/* Cabeçalho dos dias */}
                        {weekDays.map(day => (
                          <div key={day.toISOString()} className="border-r p-2 text-center">
                            <div className="font-medium text-xs">
                              {format(day, 'EEE', { locale: ptBR })}
                            </div>
                            <div className="text-sm font-bold mt-0.5">
                              {format(day, 'dd')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(day, 'MMM', { locale: ptBR })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Grid de horários e eventos */}
                      <div className="overflow-y-visible">
                        {workHours.map(hour => (
                          <div key={hour} className="grid grid-cols-8 border-b min-h-[45px]">
                            {/* Coluna de horário */}
                            <div className={`border-r p-1 text-center text-xs font-medium ${
                              hour === 12
                                ? 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700'
                                : 'bg-gray-50'
                            }`}>
                              {hour}:00
                              {hour === 12 && (
                                <div className="text-xs text-orange-500 mt-0.5">Almoço</div>
                              )}
                            </div>

                            {/* Células dos dias */}
                            {weekDays.map(day => {
                              const dayEvents = getEventsByTimeSlot(day, hour);

                              return (
                                <div
                                  key={`${day.toISOString()}-${hour}`}
                                  className={`border-r p-1 relative ${hour === 12 ? 'bg-gray-50' : ''}`}
                                >
                                  {/* Indicador de horário de almoço */}
                                  {hour === 12 && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-200 pointer-events-none flex items-center justify-center z-0">
                                      <div className="text-center">
                                        <span className="text-xs text-orange-600 font-semibold block">🍽️ ALMOÇO</span>
                                        <span className="text-xs text-orange-500">12:00 - 13:00</span>
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-1 relative z-10">
                                    {hour !== 12 && dayEvents.map((event, index) => renderCalendarEvent(event, index))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

      {/* Legenda de cores */}
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Legenda:</h3>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span className="text-sm">Confirmado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="text-sm">Sugerido</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
                <span className="text-sm">Em Progresso</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-sm">Concluído</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span className="text-sm">Cancelado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-r from-orange-100 to-yellow-100 border border-orange-200 rounded"></div>
                <span className="text-sm">🍽️ Almoço</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalhes do evento */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-600" />
              Detalhes do Agendamento
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Cliente</label>
                  <p className="font-medium">{selectedEvent.clientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Técnico</label>
                  <p className="font-medium">{selectedEvent.technicianName}</p>
                </div>
              </div>

              {/* ✅ Telefone do Cliente no Modal */}
              {selectedEvent.clientPhone && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Telefone</label>
                  <p className="font-medium flex items-center gap-2 text-blue-600">
                    <Phone className="h-4 w-4" />
                    {selectedEvent.clientPhone}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">Equipamento</label>
                <p className="font-medium">{selectedEvent.equipment}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Problema</label>
                <p className="text-sm">{selectedEvent.problem}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Endereço</label>
                <p className="text-sm flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-gray-500" />
                  {selectedEvent.address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Data</label>
                  <p className="font-medium">
                    {format(selectedEvent.startTime, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Horário</label>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4 text-gray-500" />
                    {format(selectedEvent.startTime, 'HH:mm')} - {format(selectedEvent.endTime, 'HH:mm')}
                  </p>
                </div>
              </div>

              {/* ✅ Valor da OS no Modal - Design Elegante com Edição */}
              {selectedEvent.serviceOrderId && (
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-emerald-800">Valor do Serviço</label>
                    {user?.role === 'admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditValue}
                        className="h-8 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    )}
                  </div>
                  <p className="font-bold text-2xl flex items-center gap-2 text-emerald-700">
                    <DollarSign className="h-6 w-6" />
                    {selectedEvent.finalCost && selectedEvent.finalCost > 0
                      ? `R$ ${selectedEvent.finalCost.toFixed(2)}`
                      : 'R$ 0,00'
                    }
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <Badge
                  variant="outline"
                  className={
                    selectedEvent.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    selectedEvent.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                    selectedEvent.status === 'suggested' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    selectedEvent.status === 'in_progress' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }
                >
                  {selectedEvent.status === 'confirmed' ? 'Confirmado' :
                   selectedEvent.status === 'completed' ? 'Concluído' :
                   selectedEvent.status === 'suggested' ? 'Sugerido' :
                   selectedEvent.status === 'in_progress' ? 'Em Progresso' : 'Cancelado'}
                </Badge>

                {selectedEvent.isUrgent && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Urgente
                  </Badge>
                )}
              </div>

              {selectedEvent.serviceOrderId && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      // Navegar para a OS
                      window.open(`/orders/${selectedEvent.serviceOrderId}`, '_blank');
                    }}
                  >
                    Ver Ordem de Serviço
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Valor */}
      {selectedEvent?.serviceOrderId && (
        <EditOrderValueModal
          isOpen={isEditValueModalOpen}
          onClose={() => setIsEditValueModalOpen(false)}
          serviceOrderId={selectedEvent.serviceOrderId}
          currentValue={selectedEvent.finalCost || null}
          clientName={selectedEvent.clientName}
          onValueUpdated={handleValueUpdated}
        />
      )}
      </div>
    </TooltipProvider>
  );
};

export default MainCalendarView;
