import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, User, MapPin, Package, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEvent } from '@/types/calendar';

interface EventGroupProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export function EventGroup({ events, onEventClick }: EventGroupProps) {
  // Agrupar eventos por serviceOrderId
  const groupedEvents = events.reduce((groups, event) => {
    const key = event.serviceOrderId || 'no-order';
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'delivery':
        return <Truck className="h-4 w-4" />;
      case 'collection':
        return <Package className="h-4 w-4" />;
      case 'diagnosis':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'delivery':
        return 'Entrega';
      case 'collection':
        return 'Coleta';
      case 'diagnosis':
        return 'Diagnóstico';
      default:
        return 'Atendimento';
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'delivery':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Entrega</Badge>;
      case 'collection':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Coleta</Badge>;
      case 'diagnosis':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Diagnóstico</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Atendimento</Badge>;
    }
  };

  const getContextualStatusBadge = (status: string, eventType?: string) => {
    const statusMap = {
      service: {
        scheduled: { text: 'Visita Agendada', className: 'bg-yellow-50 text-yellow-700' },
        on_the_way: { text: 'Técnico a Caminho', className: 'bg-blue-50 text-blue-700' },
        in_progress: { text: 'Atendimento em Curso', className: 'bg-orange-50 text-orange-700' },
        completed: { text: 'Serviço Concluído', className: 'bg-green-50 text-green-700' },
        cancelled: { text: 'Visita Cancelada', className: 'bg-red-50 text-red-700' }
      },
      collection: {
        scheduled: { text: 'Coleta Agendada', className: 'bg-green-50 text-green-700' },
        on_the_way: { text: 'Indo Coletar', className: 'bg-green-100 text-green-800' },
        in_progress: { text: 'Coletando Equipamento', className: 'bg-green-200 text-green-900' },
        completed: { text: 'Equipamento Coletado', className: 'bg-green-300 text-green-900' },
        cancelled: { text: 'Coleta Cancelada', className: 'bg-red-50 text-red-700' }
      },
      delivery: {
        scheduled: { text: 'Entrega Agendada', className: 'bg-blue-50 text-blue-700' },
        on_the_way: { text: 'Saiu para Entrega', className: 'bg-blue-100 text-blue-800' },
        in_progress: { text: 'Entregando', className: 'bg-blue-200 text-blue-900' },
        completed: { text: 'Equipamento Entregue', className: 'bg-blue-300 text-blue-900' },
        cancelled: { text: 'Entrega Cancelada', className: 'bg-red-50 text-red-700' }
      },
      diagnosis: {
        scheduled: { text: 'Diagnóstico Agendado', className: 'bg-purple-50 text-purple-700' },
        in_progress: { text: 'Diagnosticando', className: 'bg-purple-100 text-purple-800' },
        completed: { text: 'Diagnóstico Pronto', className: 'bg-purple-200 text-purple-900' },
        cancelled: { text: 'Diagnóstico Cancelado', className: 'bg-red-50 text-red-700' }
      }
    };

    const type = eventType || 'service';
    const statusInfo = statusMap[type]?.[status];

    if (statusInfo) {
      return <Badge variant="outline" className={statusInfo.className}>{statusInfo.text}</Badge>;
    }

    return <Badge variant="outline">{status}</Badge>;
  };

  const getServiceStatus = (groupEvents: CalendarEvent[]) => {
    const hasDelivery = groupEvents.some(e => e.eventType === 'delivery');
    const deliveryCompleted = groupEvents.some(e =>
      e.eventType === 'delivery' && e.status === 'completed'
    );
    const serviceCompleted = groupEvents.some(e =>
      e.eventType === 'service' && e.status === 'completed'
    );
    
    if (deliveryCompleted) return 'Entregue';
    if (hasDelivery && serviceCompleted) return 'Aguardando Entrega';
    if (serviceCompleted) return 'Serviço Concluído';
    return 'Em Atendimento';
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedEvents).map(([serviceOrderId, groupEvents]) => {
        // Ordenar eventos por data
        const sortedEvents = groupEvents.sort((a, b) =>
          a.startTime.getTime() - b.startTime.getTime()
        );

        const firstEvent = sortedEvents[0];
        const serviceStatus = getServiceStatus(sortedEvents);

        return (
          <Card key={serviceOrderId} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              {/* Cabeçalho do grupo */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{firstEvent.clientName}</span>
                  <Badge variant="secondary">{serviceStatus}</Badge>
                </div>
                {firstEvent.equipment && (
                  <Badge variant="outline">{firstEvent.equipment}</Badge>
                )}
              </div>

              {/* Lista de eventos */}
              <div className="space-y-2">
                {sortedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="flex items-center gap-3">
                      {getEventTypeIcon(event.eventType || 'service')}
                      <div>
                        <div className="flex items-center gap-2">
                          {getEventTypeBadge(event.eventType || 'service')}
                          {getContextualStatusBadge(event.status, event.eventType)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(event.startTime, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {event.technicianName}
                          </div>
                        </div>
                      </div>
                    </div>

                    {event.address && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 max-w-xs truncate">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{event.address}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default EventGroup;
