import React, { useState, useCallback, useEffect } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { format, addHours, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, User, Wrench, Save, X, Bug, DollarSign, Phone } from 'lucide-react';
import { testSupabaseConnection } from '@/utils/supabaseTest';

interface DragDropCalendarProps {
  events: CalendarEvent[];
  weekDays: Date[];
  workHours: number[];
  onEventUpdate: (eventId: string, newStartTime: Date) => Promise<void>;
  onEventClick: (event: CalendarEvent) => void;
  getEventsByTimeSlot: (date: Date, hour: number) => CalendarEvent[];
}

interface DraggableEventProps {
  event: CalendarEvent;
  onEventClick: (event: CalendarEvent) => void;
}

interface DroppableSlotProps {
  date: Date;
  hour: number;
  events: CalendarEvent[];
  children: React.ReactNode;
}

// Função para obter cores do evento (movida para fora para reutilização)
const getEventColor = (status: string) => {
  switch (status) {
    // 🔵 AZUL - Agendado/Confirmado
    case 'scheduled':
    case 'confirmed':
      return 'bg-blue-100 border-blue-300 text-blue-800';

    // 🟣 ROXO - Em trânsito/coleta
    case 'on_the_way':
    case 'in_progress':
      return 'bg-purple-100 border-purple-300 text-purple-800';

    // 🟠 LARANJA - Na oficina (recebido)
    case 'at_workshop':
      return 'bg-orange-100 border-orange-300 text-orange-800';

    // 🔵 CIANO - Em diagnóstico
    case 'diagnosis':
      return 'bg-cyan-100 border-cyan-300 text-cyan-800';

    // 🟡 AMARELO - Aguardando aprovação do cliente
    case 'awaiting_approval':
      return 'bg-yellow-100 border-yellow-300 text-yellow-800';

    // 🟢 VERDE - Orçamento aprovado / Em reparo
    case 'in_repair':
      return 'bg-green-100 border-green-300 text-green-800';

    // 🔷 AZUL ESCURO - Pronto para entrega
    case 'ready_delivery':
      return 'bg-indigo-100 border-indigo-300 text-indigo-800';

    // ✅ VERDE ESCURO - Concluído
    case 'completed':
      return 'bg-emerald-100 border-emerald-300 text-emerald-800';

    // 🔴 VERMELHO - Cancelado
    case 'cancelled':
      return 'bg-red-100 border-red-300 text-red-800';

    // 🟡 AMARELO CLARO - Sugerido
    case 'suggested':
      return 'bg-amber-100 border-amber-300 text-amber-800';

    default:
      return 'bg-gray-100 border-gray-300 text-gray-800';
  }
};

const DraggableEvent: React.FC<DraggableEventProps> = ({ event, onEventClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: event.id,
    data: { event }
  });

  const style = {
    transform: 'none', // Não aplicar transform - causa problemas com scroll
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.3 : 1, // Transparente durante drag
    cursor: isDragging ? 'grabbing' : 'grab',
    pointerEvents: isDragging ? 'none' : 'auto', // Desabilitar eventos durante drag
    transition: isDragging ? 'none' : 'all 0.2s ease',
    boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.3)' : 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        p-1 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md text-xs
        ${getEventColor(event.status)}
        ${isDragging ? 'scale-105 rotate-1 shadow-2xl border-blue-400' : 'hover:scale-[1.02]'}
      `}
      title={`${event.equipment}${event.problem ? ` - ${event.problem}` : ''} - ${event.clientName} - ${format(event.startTime, 'HH:mm')}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) {
          onEventClick(event);
        }
      }}
      onMouseDown={(e) => {
        console.warn(`🎯 [MOUSE DOWN] ${event.clientName}`);
      }}
    >
      <div className="space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">
            {format(event.startTime, 'HH:mm')}
          </span>
          <Badge variant="outline" className="text-xs">
            {event.status === 'scheduled' ? 'Agend.' :
             event.status === 'confirmed' ? 'Conf.' :
             event.status === 'on_the_way' ? 'Caminho' :
             event.status === 'in_progress' ? 'Prog.' :
             event.status === 'at_workshop' ? 'Oficina' :
             event.status === 'diagnosis' ? 'Diagn.' :
             event.status === 'awaiting_approval' ? 'Aguard.' :
             event.status === 'in_repair' ? 'Reparo' :
             event.status === 'ready_delivery' ? 'Pronto' :
             event.status === 'completed' ? 'Conc.' :
             event.status === 'cancelled' ? 'Canc.' : 'Desc.'}
          </Badge>
        </div>

        {/* 1. Nome do Equipamento */}
        <div className="text-xs font-semibold truncate">
          {event.equipment}
        </div>

        {/* 2. Problema do equipamento (logo após o equipamento) */}
        {event.problem && (
          <div className="text-xs text-gray-600 truncate bg-gray-50 px-1 py-0.5 rounded">
            {event.problem}
          </div>
        )}

        {/* 3. Nome do Cliente (menor destaque) */}
        <div className="text-xs text-gray-500 truncate">
          {event.clientName}
        </div>

        {/* 4. Técnico */}
        {event.technicianName && (
          <div className="text-xs text-blue-600 truncate">
            {event.technicianName}
          </div>
        )}

        {/* 5. Telefone do Cliente - Compacto */}
        {event.clientPhone && (
          <div className="flex items-center gap-1 text-xs text-blue-600 truncate">
            <Phone className="h-2.5 w-2.5" />
            <span>{event.clientPhone}</span>
          </div>
        )}

        {/* ✅ Valor da OS - Design Minimalista */}
        {event.finalCost && event.finalCost > 0 && (
          <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-xs font-semibold">
            <DollarSign className="h-2.5 w-2.5" />
            <span>R$ {event.finalCost.toFixed(0)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const DroppableSlot: React.FC<DroppableSlotProps> = ({ date, hour, events, children }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `${date.toISOString()}-${hour}`,
    data: { date, hour }
  });

  const isLunchTime = hour === 12;



  return (
    <div
      ref={setNodeRef}
      className={`
        border-r p-1 relative min-h-[45px] transition-all duration-200
        ${isLunchTime ? 'bg-gray-50' : 'hover:bg-gray-25'}
        ${isOver ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : ''}
      `}
      style={{
        // Garantir que a área de detecção seja precisa
        boxSizing: 'border-box'
      }}
    >
      {/* Indicador de horário de almoço */}
      {isLunchTime && (
        <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-200 pointer-events-none flex items-center justify-center z-0">
          <div className="text-center">
            <span className="text-xs text-orange-600 font-semibold block">🍽️ ALMOÇO</span>
            <span className="text-xs text-orange-500">12:00 - 13:00</span>
          </div>
        </div>
      )}

      {/* Indicador de drop zone */}
      {isOver && !isLunchTime && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 bg-blue-100 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10"
        >
          <div className="text-center text-blue-600">
            <Clock className="h-6 w-6 mx-auto mb-1" />
            <div className="text-xs font-medium">
              Soltar aqui para {hour}:00
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-1 relative z-20">
        {children}
      </div>
    </div>
  );
};

const DragDropCalendar: React.FC<DragDropCalendarProps> = ({
  events,
  weekDays,
  workHours,
  onEventUpdate,
  onEventClick,
  getEventsByTimeSlot
}) => {
  // console.warn(`🎯 [CALENDAR] Renderizado com ${events.length} eventos`);

  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Date>>(new Map());
  const [forceRender, setForceRender] = useState(0);

  // Configurar sensores para detecção precisa
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Aumentar distância para evitar cliques acidentais
      },
    })
  );

  // Debug: Log quando sensor detecta movimento
  // console.warn('🎯 [CALENDAR] Sensores configurados com distância de ativação: 8px');



  // REMOVIDO: useEffect que limpava mudanças pendentes automaticamente
  // A barra só deve sumir quando o usuário clicar em "Salvar" ou "Descartar"

  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.warn(`🚀 [DRAG START] ===== INICIANDO DRAG =====`);
    console.warn(`🚀 [DRAG START] ID do evento: ${event.active.id}`);
    console.warn(`🚀 [DRAG START] event:`, event);

    try {
      const draggedEvent = event.active.data.current?.event as CalendarEvent;
      console.warn(`🚀 [DRAG START] data.current:`, event.active.data.current);

      if (draggedEvent) {
        console.warn(`✅ [DRAG START] Evento encontrado: ${draggedEvent.clientName}`);
        console.warn(`✅ [DRAG START] Data/hora: ${draggedEvent.startTime.toISOString()}`);
        setActiveEvent(draggedEvent);

        // Adicionar classe ao body para indicar que está em modo de drag
        document.body.classList.add('dragging-active');
      } else {
        console.error(`❌ [DRAG START] Evento não encontrado no data.current`);
        console.warn(`🔍 [DRAG START] event.active:`, event.active);
      }
    } catch (error) {
      console.error(`❌ [DRAG START] Erro ao processar drag start:`, error);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    console.warn(`🏁 [DRAG END] ===== FINALIZANDO DRAG =====`);
    const { active, over } = event;
    console.warn(`🏁 [DRAG END] active: ${active?.id}`);
    console.warn(`🏁 [DRAG END] over: ${over?.id}`);
    console.warn(`🏁 [DRAG END] activeEvent: ${activeEvent?.id}`);

    if (!over || !activeEvent) {
      console.warn(`❌ [DRAG END] Drag cancelado - over: ${!!over}, activeEvent: ${!!activeEvent}`);
      setActiveEvent(null);
      return;
    }

    const dropData = over.data.current as { date: Date; hour: number };
    if (!dropData) {
      setActiveEvent(null);
      return;
    }

    const { date, hour } = dropData;

    // Não permitir drop no horário de almoço
    if (hour === 12) {
      toast.error('Não é possível agendar durante o horário de almoço');
      setActiveEvent(null);
      return;
    }

    // Calcular nova data/hora - CORREÇÃO UTC
    // Usar o ano, mês e dia da data de destino, mas manter timezone local
    const newStartTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour,
      0,
      0,
      0
    );

    console.warn(`🕐 [DRAG END] Data original: ${date.toISOString()}`);
    console.warn(`🕐 [DRAG END] Nova data calculada: ${newStartTime.toISOString()}`);
    console.warn(`🕐 [DRAG END] Hora: ${hour}`);

    // Verificar se é diferente da hora atual
    if (newStartTime.getTime() === activeEvent.startTime.getTime()) {
      setActiveEvent(null);
      return;
    }

    // Verificar conflitos
    const conflictingEvents = getEventsByTimeSlot(date, hour).filter(e => e.id !== activeEvent.id);
    if (conflictingEvents.length > 0) {
      toast.error('Já existe um agendamento neste horário');
      setActiveEvent(null);
      return;
    }

    // Adicionar à lista de mudanças pendentes
    console.warn(`📝 [DRAG END] Adicionando pending change: ${activeEvent.id} → ${newStartTime.toISOString()}`);
    const newPendingChanges = new Map(pendingChanges);
    newPendingChanges.set(activeEvent.id, newStartTime);
    setPendingChanges(newPendingChanges);
    console.warn(`📝 [DRAG END] Total pending changes: ${newPendingChanges.size}`);

    // Apenas mostrar toast informativo simples
    toast.info(
      `📅 Agendamento movido para ${format(newStartTime, "dd/MM 'às' HH:mm", { locale: ptBR })}`,
      {
        duration: 3000
      }
    );

    setActiveEvent(null);
  }, [activeEvent, pendingChanges, getEventsByTimeSlot]);

  const handleSaveChanges = useCallback(async () => {
    if (pendingChanges.size === 0) {
      return;
    }

    const changeCount = pendingChanges.size;
    console.warn(`💾 [SAVE] === INICIANDO SALVAMENTO ===`);
    console.warn(`💾 [SAVE] Total de mudanças: ${changeCount}`);

    // Manter mudanças pendentes para mostrar na interface durante o salvamento
    const changesToSave = new Map(pendingChanges);

    // 🔧 CORREÇÃO: Limpar pending changes IMEDIATAMENTE para evitar conflito com atualização otimista
    setPendingChanges(new Map());
    console.warn('🧹 [SAVE] Pending changes limpos ANTES do salvamento para evitar conflito');

    // Log detalhado de cada mudança
    for (const [eventId, newStartTime] of changesToSave.entries()) {
      console.warn(`📝 [SAVE] Mudança pendente:`);
      console.warn(`📝 [SAVE]   - Event ID: ${eventId}`);
      console.warn(`📝 [SAVE]   - Começa com 'order-': ${eventId.startsWith('order-')}`);
      console.warn(`📝 [SAVE]   - Nova data: ${newStartTime.toISOString()}`);
      console.warn(`📝 [SAVE]   - Data formatada: ${format(newStartTime, 'dd/MM HH:mm')}`);
    }

    try {
      // Salvar mudanças uma por uma para melhor controle
      for (const [eventId, newStartTime] of changesToSave.entries()) {
        console.warn(`📝 [SAVE] === SALVANDO EVENTO ===`);
        console.warn(`📝 [SAVE] Event ID: ${eventId}`);
        console.warn(`📝 [SAVE] Data: ${format(newStartTime, 'dd/MM HH:mm')}`);

        try {
          await onEventUpdate(eventId, newStartTime);
          console.warn(`✅ [SAVE] Evento ${eventId} salvo com sucesso!`);
        } catch (eventError) {
          console.error(`❌ [SAVE] Erro ao salvar evento ${eventId}:`, eventError);
          // 🔧 CORREÇÃO: Em caso de erro, restaurar pending changes
          setPendingChanges(changesToSave);
          throw eventError; // Re-throw para parar o processo
        }
      }

      console.warn('✅ [SAVE] Todas as mudanças salvas!');

      // Toast de sucesso simples
      toast.success(`✅ ${changeCount} agendamento(s) salvo(s)!`, {
        duration: 3000
      });
    } catch (error) {
      console.error('❌ [DRAG&DROP] Erro ao salvar:', error);

      toast.error('❌ Erro ao atualizar agendamento no banco de dados', {
        duration: 4000
      });
    }
  }, [pendingChanges, onEventUpdate]);

  const handleDiscardChanges = () => {
    console.log('🗑️ Discarding changes manually');
    setPendingChanges(new Map());
    toast.info('Mudanças descartadas');
  };

  // Log quando pendingChanges muda
  useEffect(() => {
    console.warn('📊 [PENDING] Atualizado:', pendingChanges.size);
    if (pendingChanges.size > 0) {
      console.warn('📊 [PENDING] Detalhes:', Array.from(pendingChanges.entries()).map(([id, date]) =>
        `${id} → ${format(date, 'dd/MM HH:mm')}`
      ));
    }
  }, [pendingChanges]);

  const getDisplayEvents = (date: Date, hour: number) => {
    const slotEvents = getEventsByTimeSlot(date, hour);

    // Debug: Log detalhado para entender o que está acontecendo
    const dateStr = format(date, 'dd/MM');
    const hasSlotEvents = slotEvents.length > 0;
    const hasPendingChanges = pendingChanges.size > 0;

    if (hasSlotEvents || hasPendingChanges) {
      console.log(`🔍 [getDisplayEvents] ${dateStr} ${hour}h: ${slotEvents.length} eventos, ${pendingChanges.size} pending`);
    }

    const result = slotEvents.map(event => {
      const pendingChange = pendingChanges.get(event.id);

      if (pendingChange) {
        const pendingHour = pendingChange.getHours();
        const pendingDate = pendingChange;

        console.warn(`🔄 [PENDING] Evento ${event.id} tem pending: ${format(pendingDate, 'dd/MM')} ${pendingHour}h`);

        if (isSameDay(pendingDate, date) && pendingHour === hour) {
          console.warn(`✅ [PENDING] Mostrando ${event.id} na NOVA posição: ${dateStr} ${hour}h`);
          return { ...event, startTime: pendingChange, isPending: true };
        } else if (isSameDay(event.startTime, date) && event.startTime.getHours() === hour) {
          console.warn(`❌ [PENDING] Ocultando ${event.id} da posição ORIGINAL: ${dateStr} ${hour}h`);
          return null;
        }
      }

      return event;
    }).filter(Boolean) as CalendarEvent[];

    if (result.length !== slotEvents.length && (hasSlotEvents || hasPendingChanges)) {
      console.warn(`🔄 [DISPLAY] ${dateStr} ${hour}h: ${slotEvents.length} → ${result.length} eventos após pending`);
    }

    return result;
  };

  return (
    <div className="space-y-4">
      {/* Barra de mudanças pendentes - Design sutil e padronizado */}
      <AnimatePresence>
        {pendingChanges.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sticky top-0 z-50"
          >
            <Card className="bg-blue-50 border-blue-200 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-blue-900 text-sm">
                        {pendingChanges.size} alteração{pendingChanges.size > 1 ? 'ões' : ''} pendente{pendingChanges.size > 1 ? 's' : ''}
                      </span>
                      <p className="text-sm text-blue-700 mt-0.5">
                        Salve as alterações para aplicar no sistema
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        console.log('🧪 Executando teste de diagnóstico...');
                        const result = await testSupabaseConnection();
                        if (result) {
                          toast.success('✅ Conexão com Supabase OK!');
                        } else {
                          toast.error('❌ Problema na conexão com Supabase');
                        }
                      }}
                      className="text-orange-600 hover:text-orange-900 border-orange-300"
                    >
                      <Bug className="h-4 w-4 mr-1" />
                      Testar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDiscardChanges}
                      className="text-gray-600 hover:text-gray-900 border-gray-300"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Descartar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveChanges}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar alterações
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendário com Drag & Drop */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
      >
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
                    const displayEvents = getDisplayEvents(day, hour);

                    return (
                      <DroppableSlot
                        key={`${day.toISOString()}-${hour}`}
                        date={day}
                        hour={hour}
                        events={displayEvents}
                      >
                        {hour !== 12 && displayEvents.map((event) => (
                          <DraggableEvent
                            key={event.id}
                            event={event}
                            onEventClick={onEventClick}
                          />
                        ))}
                      </DroppableSlot>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* DragOverlay com configuração compatível com scroll */}
        <DragOverlay
          dropAnimation={null}
          style={{
            position: 'fixed',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          {activeEvent && (
            <div
              className={`p-2 rounded-lg border-2 shadow-2xl ${getEventColor(activeEvent.status)} transform rotate-2 scale-105`}
              style={{
                cursor: 'grabbing',
                pointerEvents: 'none',
                width: '150px',
                minHeight: '45px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Centralização usando transform
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="w-full text-center">
                <div className="text-sm font-bold">
                  📅 {format(activeEvent.startTime, 'HH:mm')}
                </div>
                <div className="text-sm font-black truncate">
                  {activeEvent.equipment}
                </div>
                <div className="text-xs truncate">
                  {activeEvent.clientName}
                </div>
                <div className="text-xs font-bold text-blue-600 mt-1">
                  🔄 Arrastando...
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default DragDropCalendar;
