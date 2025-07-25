import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  RefreshCcw,
  Settings,
  Maximize2,
  Minimize2,
  Move
} from 'lucide-react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, addMonths, subMonths, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useMainCalendar } from '@/hooks/calendar/useMainCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { CalendarEvent, CalendarViewMode } from '@/types/calendar';
import { toast } from 'sonner';
import CalendarViewSelector from '../calendar/CalendarViewSelector';
import MonthView from '../calendar/MonthView';
import DayView from '../calendar/DayView';
import ListView from '../calendar/ListView';
import DragDropCalendar from '../calendar/DragDropCalendar';
import { scheduledServiceService } from '@/services/scheduledService';
import { SmartProgressTracker } from '@/components/ServiceOrders/ProgressTracker';
import { serviceOrderService } from '@/services/serviceOrder';
import { ServiceOrder } from '@/types';

interface TechnicianMainCalendarViewProps {
  technicianId: string;
  className?: string;
}

const TechnicianMainCalendarView: React.FC<TechnicianMainCalendarViewProps> = ({ 
  technicianId, 
  className = '' 
}) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('day');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isLoadingServiceOrder, setIsLoadingServiceOrder] = useState(false);
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
    technicianId, // Força o filtro para o técnico específico
    user
  });

  // Efeito para garantir carregamento inicial quando o componente é montado
  useEffect(() => {
    console.log('🔄 [TechnicianMainCalendarView] Componente montado, verificando carregamento...');
    console.log(`📊 [TechnicianMainCalendarView] Estado atual: events=${events.length}, isLoading=${isLoading}, viewMode=${viewMode}`);

    // Forçar carregamento após um pequeno delay para garantir que o hook foi inicializado
    const initTimer = setTimeout(() => {
      if (user?.id && technicianId && events.length === 0 && !isLoading) {
        console.log('🔄 [TechnicianMainCalendarView] Forçando carregamento inicial...');
        refreshEvents();
      }
    }, 500);

    return () => clearTimeout(initTimer);
  }, [user?.id, technicianId, events.length, isLoading, refreshEvents]);

  // Debug: Log quando eventos mudam
  useEffect(() => {
    console.log(`📊 [TechnicianMainCalendarView] Eventos atualizados: ${events.length} eventos para viewMode=${viewMode}`);
    if (events.length > 0) {
      console.log('📋 [TechnicianMainCalendarView] Primeiros eventos:', events.slice(0, 3).map(e => ({
        id: e.id,
        clientName: e.clientName,
        startTime: e.startTime.toISOString(),
        status: e.status
      })));
    }
  }, [events, viewMode]);

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
    console.log(`🔄 [TECH] Atualizando ${eventId} para ${newStartTime.toISOString()}`);

    // 1. ATUALIZAÇÃO OTIMISTA - Atualizar interface imediatamente
    const newEndTime = new Date(newStartTime.getTime() + 60 * 60 * 1000); // +1 hora
    updateEvent(eventId, {
      startTime: newStartTime,
      endTime: newEndTime
    });
    console.log(`🔄 [TECH] Interface atualizada otimisticamente`);

    try {
      // 2. SALVAR NO BANCO DE DADOS
      const updatedService = await scheduledServiceService.updateServiceDateTime(eventId, newStartTime);

      if (!updatedService) {
        throw new Error('Falha ao atualizar serviço no banco de dados');
      }

      console.log('✅ [TECH] Serviço atualizado no banco!');

      // 3. SINCRONIZAR COM BACKEND (em background)
      setTimeout(async () => {
        try {
          await refreshEvents();
          console.log('✅ [TECH] Dados sincronizados com backend');
        } catch (syncError) {
          console.warn('⚠️ [TECH] Erro na sincronização (interface já atualizada):', syncError);
        }
      }, 1000);

      console.log('✅ [TECH] Update completed - INTERFACE E BANCO ATUALIZADOS!');
    } catch (error) {
      console.error('❌ [TECH] Erro ao atualizar agendamento:', error);

      // 4. REVERTER ATUALIZAÇÃO OTIMISTA EM CASO DE ERRO
      console.log('🔄 [TECH] Revertendo mudança na interface...');
      await refreshEvents(); // Recarregar dados originais

      // Mostrar toast de erro
      toast.error('❌ Erro ao atualizar agendamento no banco de dados');
      throw error; // Re-throw para que o DragDropCalendar saiba que houve erro
    }
  }, [refreshEvents, updateEvent]);

  // Abrir modal de evento e buscar ordem de serviço completa
  const handleEventClick = async (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedServiceOrder(null);
    setIsEventModalOpen(true);

    // Se o evento tem serviceOrderId, buscar a ordem de serviço completa
    if (event.serviceOrderId) {
      setIsLoadingServiceOrder(true);
      try {
        console.log('🔍 Buscando ordem de serviço:', event.serviceOrderId);

        // Buscar todas as ordens e filtrar pelo ID
        const allOrders = await serviceOrderService.getAll();
        const serviceOrder = allOrders.find(order => order.id === event.serviceOrderId);

        if (serviceOrder) {
          console.log('✅ Ordem de serviço encontrada:', serviceOrder);
          setSelectedServiceOrder(serviceOrder);
        } else {
          console.log('❌ Ordem de serviço não encontrada');
          toast.error('Ordem de serviço não encontrada');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar ordem de serviço:', error);
        toast.error('Erro ao carregar detalhes da ordem de serviço');
      } finally {
        setIsLoadingServiceOrder(false);
      }
    }
  };

  // Função para atualizar status da ordem de serviço
  const handleUpdateOrderStatus = async (serviceOrderId: string, newStatus: string, notes?: string): Promise<boolean> => {
    try {
      console.log(`🔄 Atualizando status da OS: ${serviceOrderId} → ${newStatus}`, { notes });

      const updateData: any = { status: newStatus };
      if (notes) {
        updateData.notes = notes;
      }

      const success = await serviceOrderService.update(serviceOrderId, updateData);

      if (success) {
        console.log(`✅ Status atualizado: ${serviceOrderId} → ${newStatus}`);

        // Atualizar a ordem de serviço local
        if (selectedServiceOrder && selectedServiceOrder.id === serviceOrderId) {
          setSelectedServiceOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
        }

        // Recarregar eventos do calendário
        await refreshEvents();
        setRefreshKey(prev => prev + 1);

        toast.success('Status atualizado com sucesso!');
        return true;
      } else {
        toast.error('Erro ao atualizar status da ordem de serviço');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status da ordem de serviço');
      return false;
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
    onToggleAnalytics: () => {}, // Desabilitado para técnicos
    onSearch: () => {
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

  return (
    <TooltipProvider>
      <div className={`space-y-1 sm:space-y-4 pb-16 sm:pb-20 ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-1 sm:p-4 overflow-auto' : ''}`}>
        {/* Header otimizado para mobile */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 sm:p-3 rounded-lg shadow-md">
                  <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-emerald-700">
                    Meu Calendário
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {getViewTitle()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-3 flex-wrap w-full sm:w-auto">
                {/* Seletor de visualização - compacto no mobile */}
                <div className="w-full sm:w-auto">
                  <CalendarViewSelector
                    currentView={viewMode}
                    onViewChange={setViewMode}
                    className="w-full sm:w-auto"
                  />
                </div>

                {/* Controles simplificados - ocultos no mobile */}
                <div className="hidden sm:flex items-center gap-2">
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
                    onClick={() => setIsDragDropEnabled(prev => !prev)}
                    className={`${isDragDropEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} flex items-center gap-2`}
                  >
                    <Move className="h-4 w-4" />
                    {isDragDropEnabled ? 'Drag ON' : 'Drag OFF'}
                  </Button>

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

        {/* Navegação otimizada para mobile */}
        <Card className="shadow-md">
          <CardContent className="p-2 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigatePrevious}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {viewMode === 'month' ? 'Mês Anterior' :
                     viewMode === 'day' ? 'Dia Anterior' : 'Anterior'}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateToday}
                  className="px-2 sm:px-4"
                >
                  <span className="text-xs sm:text-sm">Hoje</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateNext}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">
                    {viewMode === 'month' ? 'Próximo Mês' :
                     viewMode === 'day' ? 'Próximo Dia' : 'Próximo'}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-sm sm:text-lg font-semibold text-center flex-1 mx-2">
                {getViewTitle()}
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700">
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
              <MonthView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
              />
            )}

            {viewMode === 'day' && (
              <>
                {/* Debug: Log específico para visualização dia */}
                {console.log(`📅 [TechnicianMainCalendarView] Renderizando DayView para ${format(currentDate, 'dd/MM/yyyy')} com ${events.length} eventos`)}
                <DayView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                />
              </>
            )}

            {viewMode === 'list' && (
              <ListView
                events={events}
                onEventClick={handleEventClick}
              />
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

                        {/* Cabeçalhos dos dias */}
                        {weekDays.map(day => (
                          <div key={day.toISOString()} className="p-2 text-center">
                            <div className="text-xs text-gray-600 mb-1">
                              {format(day, 'EEE', { locale: ptBR })}
                            </div>
                            <div className={`text-sm font-semibold ${
                              isSameDay(day, new Date())
                                ? 'text-green-600 bg-green-100 rounded-full w-6 h-6 flex items-center justify-center mx-auto'
                                : 'text-gray-900'
                            }`}>
                              {format(day, 'dd')}
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
                                  className={`border-r p-1 min-h-[45px] ${
                                    hour === 12 ? 'bg-gradient-to-r from-orange-50 to-yellow-50' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  {dayEvents.map((event, index) => (
                                    <div
                                      key={event.id}
                                      className={`
                                        p-1 rounded-md border-l-4 cursor-pointer transition-all duration-200
                                        hover:shadow-md hover:scale-[1.02] text-xs relative z-20
                                        ${event.status === 'confirmed' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                                          event.status === 'completed' ? 'bg-green-100 border-green-300 text-green-800' :
                                          event.status === 'cancelled' ? 'bg-red-100 border-red-300 text-red-800' :
                                          event.status === 'in_progress' ? 'bg-orange-100 border-orange-300 text-orange-800' :
                                          'bg-yellow-100 border-yellow-300 text-yellow-800'}
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
                                            {event.isUrgent && <AlertCircle className="h-3 w-3 text-red-500" />}
                                            <span className="font-medium truncate">
                                              {event.clientName}
                                            </span>
                                          </div>
                                          <div className="text-xs opacity-75 truncate">
                                            {event.equipment}
                                          </div>
                                          <div className="flex items-center gap-1 mt-1">
                                            <Clock className="h-3 w-3" />
                                            <span className="text-xs">
                                              {format(event.startTime, 'HH:mm')}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
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

        {/* Modal de progresso da ordem de serviço */}
        <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-green-600" />
                {selectedServiceOrder ? 'Progresso da Ordem de Serviço' : 'Detalhes do Agendamento'}
              </DialogTitle>
            </DialogHeader>

            {selectedEvent && (
              <div className="space-y-4">
                {/* Se há uma ordem de serviço, mostrar o ServiceProgressTracker */}
                {selectedServiceOrder ? (
                  <div className="space-y-4">
                    {/* Informações básicas do agendamento */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Data/Hora</label>
                          <p className="text-sm flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {format(selectedEvent.startTime, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Endereço</label>
                          <p className="text-sm flex items-start gap-1">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="truncate">{selectedEvent.address}</span>
                          </p>
                        </div>
                      </div>

                      {selectedEvent.isUrgent && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-700 font-medium">Atendimento Urgente</span>
                        </div>
                      )}
                    </div>

                    {/* SmartProgressTracker */}
                    <SmartProgressTracker
                      serviceOrder={selectedServiceOrder}
                      onUpdateStatus={handleUpdateOrderStatus}
                    />
                  </div>
                ) : isLoadingServiceOrder ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">Carregando detalhes da ordem de serviço...</span>
                    </div>
                  </div>
                ) : (
                  /* Fallback para eventos sem ordem de serviço */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Cliente</label>
                        <p className="text-sm font-semibold">{selectedEvent.clientName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <Badge
                          variant="outline"
                          className={
                            selectedEvent.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            selectedEvent.status === 'completed' ? 'bg-green-100 text-green-800' :
                            selectedEvent.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            selectedEvent.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {selectedEvent.status === 'confirmed' ? 'Confirmado' :
                           selectedEvent.status === 'completed' ? 'Concluído' :
                           selectedEvent.status === 'cancelled' ? 'Cancelado' :
                           selectedEvent.status === 'in_progress' ? 'Em Progresso' : 'Sugerido'}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Equipamento</label>
                      <p className="text-sm">{selectedEvent.equipment}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Problema</label>
                      <p className="text-sm">{selectedEvent.problem}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Data</label>
                        <p className="text-sm flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {format(selectedEvent.startTime, 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Horário</label>
                        <p className="text-sm flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(selectedEvent.startTime, 'HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Endereço</label>
                      <p className="text-sm flex items-start gap-1">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{selectedEvent.address}</span>
                      </p>
                    </div>

                    {selectedEvent.isUrgent && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700 font-medium">Atendimento Urgente</span>
                      </div>
                    )}

                    {selectedEvent.logisticsGroup && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Grupo Logístico</label>
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">
                          Grupo {selectedEvent.logisticsGroup}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default TechnicianMainCalendarView;
