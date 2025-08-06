import React, { useState } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { format, isToday, isTomorrow, isYesterday, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, User, Wrench, Search, Filter, Calendar, DollarSign, Phone } from 'lucide-react';
import EventGroup from './EventGroup';

interface ListViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const ListView: React.FC<ListViewProps> = ({
  events,
  onEventClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [groupedView, setGroupedView] = useState(true); // ✅ Nova opção para visualização agrupada

  // Debug: Log eventos da lista
  console.log(`📅 [ListView] Total eventos: ${events.length}`);
  if (events.length > 0) {
    console.log('📋 [ListView] Primeiros eventos:', events.slice(0, 3).map(e => ({
      id: e.id,
      clientName: e.clientName,
      startTime: format(e.startTime, 'dd/MM HH:mm'),
      status: e.status
    })));
  }

  // Filtrar eventos
  const filteredEvents = events.filter(event => {
    const matchesSearch = searchTerm === '' || 
      event.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.technicianName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Ordenar eventos
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return a.startTime.getTime() - b.startTime.getTime();
      case 'client':
        return a.clientName.localeCompare(b.clientName);
      case 'technician':
        return (a.technicianName || '').localeCompare(b.technicianName || '');
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  // Agrupar eventos por data
  const groupedEvents = sortedEvents.reduce((groups, event) => {
    const dateKey = format(event.startTime, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);

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
      case 'completed': return 'border-l-green-500 bg-green-50 hover:bg-green-100';
      case 'cancelled': return 'border-l-red-500 bg-red-50 hover:bg-red-100';
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
        cancelled: 'Visita Cancelada'
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

  const getEventTypeText = (eventType: string) => {
    switch (eventType) {
      case 'delivery': return 'Entrega';
      case 'collection': return 'Coleta';
      case 'diagnosis': return 'Diagnóstico';
      default: return 'Atendimento';
    }
  };

  const getEventTypeBadgeClass = (eventType: string) => {
    switch (eventType) {
      case 'delivery': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'collection': return 'bg-green-50 text-green-700 border-green-200';
      case 'diagnosis': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      // 🔵 AZUL - Agendado
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';

      // 🟣 ROXO - A caminho
      case 'on_the_way': return 'bg-purple-100 text-purple-700 border-purple-200';

      // 🟣 ROXO - Em trânsito/coleta
      case 'in_progress': return 'bg-purple-100 text-purple-700 border-purple-200';

      // 🟠 LARANJA - Na oficina (recebido)
      case 'at_workshop': return 'bg-orange-100 text-orange-700 border-orange-200';

      // 🔵 CIANO - Em diagnóstico
      case 'diagnosis': return 'bg-cyan-100 text-cyan-700 border-cyan-200';

      // 🟡 AMARELO - Aguardando aprovação do cliente
      case 'awaiting_approval': return 'bg-yellow-100 text-yellow-700 border-yellow-200';

      // 🟢 VERDE - Orçamento aprovado / Em reparo
      case 'in_repair': return 'bg-green-100 text-green-700 border-green-200';

      // 🔷 AZUL ESCURO - Pronto para entrega
      case 'ready_delivery': return 'bg-indigo-100 text-indigo-700 border-indigo-200';

      // ✅ VERDE ESCURO - Concluído
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';

      // 🔴 VERMELHO - Cancelado
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';

      // 🟡 AMARELO CLARO - Sugerido
      case 'suggested': return 'bg-amber-100 text-amber-700 border-amber-200';

      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Controles de filtro e busca - compactos no mobile */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lista de Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            {/* Busca - compacta no mobile */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>

            {/* Filtro por status - compacto no mobile */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="on_the_way">A Caminho</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            {/* Ordenação */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="client">Cliente</SelectItem>
                <SelectItem value="technician">Técnico</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>

            {/* Alternância de visualização */}
            <Button
              variant={groupedView ? "default" : "outline"}
              onClick={() => setGroupedView(!groupedView)}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {groupedView ? "Agrupado" : "Individual"}
            </Button>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Mostrando {sortedEvents.length} de {events.length} agendamentos
          </div>
        </CardContent>
      </Card>

      {/* Lista de eventos - agrupados ou individuais */}
      <div className="space-y-6">
        {groupedView ? (
          /* Visualização agrupada por OS */
          <EventGroup events={sortedEvents} onEventClick={onEventClick} />
        ) : (
          /* Visualização individual por data */
          <AnimatePresence>
            {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
            <motion.div
              key={dateKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {/* Cabeçalho da data */}
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getDateLabel(dateKey)}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {dayEvents.length} agendamento{dayEvents.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Eventos do dia */}
              <div className="space-y-3">
                {dayEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      className={`
                        cursor-pointer transition-all duration-200 hover:shadow-md border-l-4
                        ${getEventColor(event.status, event.eventType)}
                      `}
                      onClick={() => onEventClick(event)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">
                                {format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
                              </span>
                            </div>
                            <Badge variant="outline" className={getStatusColor(event.status)}>
                              {getContextualStatusText(event.status, event.eventType)}
                            </Badge>
                            {event.eventType && event.eventType !== 'service' && (
                              <Badge variant="outline" className={getEventTypeBadgeClass(event.eventType)}>
                                {getEventTypeText(event.eventType)}
                              </Badge>
                            )}
                          </div>
                          {event.isUrgent && (
                            <Badge variant="destructive" className="text-xs">
                              Urgente
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-[#e5b034]" />
                              <span className="font-semibold">{event.equipment}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span>{event.clientName}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {event.technicianName && (
                              <div className="text-sm text-blue-600">
                                <strong>Técnico:</strong> {event.technicianName}
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                              <span className="text-sm text-gray-600">{event.address}</span>
                            </div>
                            {/* ✅ Telefone do Cliente */}
                            {event.clientPhone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-blue-600">{event.clientPhone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {event.problem && (
                          <div className="mt-3 text-sm text-gray-600 bg-gray-100 p-2 rounded">
                            <strong>Problema:</strong> {event.problem}
                          </div>
                        )}

                        {/* ✅ Valor da OS - Design Elegante */}
                        {event.finalCost && event.finalCost > 0 && (
                          <div className="mt-3 flex items-center gap-2 bg-emerald-50 text-emerald-700 p-3 rounded-lg border border-emerald-200">
                            <DollarSign className="h-5 w-5" />
                            <span className="font-semibold text-lg">R$ {event.finalCost.toFixed(2)}</span>
                            <span className="text-sm text-emerald-600 ml-auto">Valor do Serviço</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            ))}
          </AnimatePresence>
        )}

        {sortedEvents.length === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum agendamento encontrado
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'Não há agendamentos para exibir'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ListView;
