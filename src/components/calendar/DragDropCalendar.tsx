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
import { Clock, User, Wrench, Save, X } from 'lucide-react';

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
    case 'confirmed': return 'bg-blue-100 border-blue-300 text-blue-800';
    case 'completed': return 'bg-green-100 border-green-300 text-green-800';
    case 'in_progress': return 'bg-orange-100 border-orange-300 text-orange-800';
    case 'suggested': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    case 'cancelled': return 'bg-red-100 border-red-300 text-red-800';
    default: return 'bg-gray-100 border-gray-300 text-gray-800';
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
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        p-1 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md text-xs
        ${getEventColor(event.status)}
        ${isDragging ? 'scale-105 rotate-1 shadow-2xl border-blue-400' : 'hover:scale-[1.02]'}
      `}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) {
          onEventClick(event);
        }
      }}
      initial={{ scale: 1 }}
      whileHover={!isDragging ? { scale: 1.02 } : {}}
      whileTap={!isDragging ? { scale: 0.98 } : {}}
    >
      <div className="space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">
            {format(event.startTime, 'HH:mm')}
          </span>
          <Badge variant="outline" className="text-xs">
            {event.status === 'confirmed' ? 'Conf.' :
             event.status === 'completed' ? 'Conc.' :
             event.status === 'in_progress' ? 'Prog.' :
             event.status === 'suggested' ? 'Sug.' :
             event.status === 'cancelled' ? 'Canc.' : 'Desc.'}
          </Badge>
        </div>
        <div className="text-xs font-semibold truncate">
          {event.clientName}
        </div>
        <div className="text-xs text-gray-600 truncate">
          {event.equipment}
        </div>
        {event.technicianName && (
          <div className="text-xs text-blue-600 truncate">
            {event.technicianName}
          </div>
        )}
      </div>
    </motion.div>
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
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Date>>(new Map());

  // Configurar sensores para detecção precisa
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Distância mínima para iniciar drag
      },
    })
  );



  // REMOVIDO: useEffect que limpava mudanças pendentes automaticamente
  // A barra só deve sumir quando o usuário clicar em "Salvar" ou "Descartar"

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const draggedEvent = event.active.data.current?.event as CalendarEvent;
    setActiveEvent(draggedEvent);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !activeEvent) {
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

    // Calcular nova data/hora
    const newStartTime = new Date(date);
    newStartTime.setHours(hour, 0, 0, 0);

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
    const newPendingChanges = new Map(pendingChanges);
    newPendingChanges.set(activeEvent.id, newStartTime);
    setPendingChanges(newPendingChanges);

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
    console.log('🔄 handleSaveChanges called, pending changes:', pendingChanges.size);

    if (pendingChanges.size === 0) {
      console.log('❌ No pending changes to save');
      return;
    }

    const changeCount = pendingChanges.size;
    console.log(`💾 Saving ${changeCount} changes...`);

    // Limpar mudanças pendentes PRIMEIRO para evitar duplicação
    const changesToSave = new Map(pendingChanges);
    setPendingChanges(new Map());

    try {
      // Salvar mudanças uma por uma para melhor controle
      for (const [eventId, newStartTime] of changesToSave.entries()) {
        console.log(`📝 Updating event ${eventId} to ${newStartTime}`);
        await onEventUpdate(eventId, newStartTime);
        console.log(`✅ Event ${eventId} updated successfully`);
      }

      console.log('🧹 All changes saved successfully');

      // Toast de sucesso simples
      toast.success(`✅ ${changeCount} agendamento(s) salvo(s)!`, {
        duration: 3000
      });
    } catch (error) {
      console.error('❌ Erro ao salvar mudanças:', error);

      // Em caso de erro, restaurar as mudanças pendentes
      setPendingChanges(changesToSave);

      toast.error('❌ Erro ao salvar. Tente novamente.', {
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
    console.log('📊 Pending changes updated:', pendingChanges.size);
  }, [pendingChanges]);

  const getDisplayEvents = (date: Date, hour: number) => {
    const slotEvents = getEventsByTimeSlot(date, hour);
    
    return slotEvents.map(event => {
      const pendingChange = pendingChanges.get(event.id);
      if (pendingChange) {
        // Se há mudança pendente, mostrar o evento na nova posição
        const pendingHour = pendingChange.getHours();
        const pendingDate = pendingChange;
        
        if (isSameDay(pendingDate, date) && pendingHour === hour) {
          return { ...event, startTime: pendingChange, isPending: true };
        } else if (isSameDay(event.startTime, date) && event.startTime.getHours() === hour) {
          // Não mostrar na posição original se há mudança pendente
          return null;
        }
      }
      return event;
    }).filter(Boolean) as CalendarEvent[];
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
                  {activeEvent.clientName}
                </div>
                <div className="text-xs truncate">
                  {activeEvent.equipment}
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
