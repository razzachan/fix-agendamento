import React, { useState, useEffect } from 'react';
import { format, addHours, isSameDay, parseISO, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgendamentoAI } from '@/services/agendamentos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, User, AlertTriangle, CheckCircle, Route, Clock as ClockIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/hooks/auth/useUser';


import { ServiceOrder } from '@/types';

// Definir os horários de trabalho
const WORK_START_HOUR = 8; // ✅ EXPANDIDO: 8h (era 9h)
const WORK_END_HOUR = 18; // 18h
const LUNCH_START_HOUR = 12; // 12h
const LUNCH_END_HOUR = 13; // 13h

// Definir os intervalos de tempo (em minutos)
const TIME_SLOT_INTERVAL = 60; // 60 minutos (1 hora)

// Interface para os slots de tempo
interface TimeSlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
  appointments: AgendamentoAI[];
  isLunchTime?: boolean;
}

// Interface para as rotas atribuídas
interface AssignedRoute {
  technicianId: string;
  route: any; // RouteResponse
  waypoints: any[]; // RouteWaypoint[]
  scheduledDate: Date;
  logisticsGroup: string | null;
}

// Interface para as propriedades do componente
interface TechnicianCalendarViewProps {
  agendamentos: AgendamentoAI[];
  selectedDate: Date;
  onTimeSlotSelected?: (slot: TimeSlot, agendamento: AgendamentoAI) => void;
  technicians?: { id: string; name: string }[];
  assignedRoutes?: AssignedRoute[];
  serviceOrders?: ServiceOrder[];
}

const TechnicianCalendarView: React.FC<TechnicianCalendarViewProps> = ({
  agendamentos,
  selectedDate,
  onTimeSlotSelected,
  technicians = [],
  assignedRoutes = [],
  serviceOrders = []
}) => {
  // Estado para armazenar o técnico selecionado
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);

  // Estado para armazenar os slots de tempo
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Estado para armazenar a visualização atual (dia, semana)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Estado para armazenar os dias da semana
  const [weekDays, setWeekDays] = useState<Date[]>([]);

  // Estado para armazenar o dia selecionado na visualização de semana
  const [selectedDayInWeek, setSelectedDayInWeek] = useState<Date>(selectedDate);

  // Obter informações do usuário atual
  const { user } = useUser();



  // Gerar os dias da semana com base na data selecionada
  useEffect(() => {
    const days: Date[] = [];
    const startOfWeek = selectedDate;

    for (let i = 0; i < 7; i++) {
      days.push(addDays(startOfWeek, i));
    }

    setWeekDays(days);
    setSelectedDayInWeek(selectedDate);
  }, [selectedDate]);

  // Função para forçar o status de agendamentos com OS para confirmado
  const forceConfirmStatusForAppointmentsWithOS = () => {
    // Verificar se há agendamentos com ordem de serviço
    const agendamentosComOS = agendamentos.filter(a => a.ordem_servico_id);

    // Forçar o status para confirmado para todos os agendamentos com OS
    if (agendamentosComOS.length > 0) {
      console.log(`[forceConfirmStatusForAppointmentsWithOS] Encontrados ${agendamentosComOS.length} agendamentos com OS. Forçando status para confirmado.`);
      agendamentosComOS.forEach(a => {
        if (a.status !== 'confirmado') {
          console.log(`[forceConfirmStatusForAppointmentsWithOS] Forçando status do agendamento ${a.id} para confirmado porque tem OS ${a.ordem_servico_id}`);
          a.status = 'confirmado';
        }
      });
    }
  };

  // Função para gerar os slots de tempo
  const generateTimeSlots = () => {
    // Forçar o status de agendamentos com OS para confirmado
    forceConfirmStatusForAppointmentsWithOS();

    const dateToUse = viewMode === 'day' ? selectedDate : selectedDayInWeek;
    const slots: TimeSlot[] = [];

    console.log('TechnicianCalendarView - Gerando slots com os seguintes dados:');
    console.log('- Data selecionada:', dateToUse);
    console.log('- Técnico selecionado:', selectedTechnician);
    console.log('- Total de agendamentos:', agendamentos.length);
    console.log('- Total de rotas atribuídas:', assignedRoutes.length);

    // Verificar se há agendamentos com ordem de serviço
    const agendamentosComOS = agendamentos.filter(a => a.ordem_servico_id);
    console.log('- Agendamentos com ordem de serviço:', agendamentosComOS.length);
    if (agendamentosComOS.length > 0) {
      console.log('  IDs dos agendamentos com OS:', agendamentosComOS.map(a => a.id));

      // Garantir que todos os agendamentos com OS tenham status confirmado
      agendamentosComOS.forEach(a => {
        if (a.status !== 'confirmado') {
          console.log(`Corrigindo status do agendamento ${a.id} de "${a.status}" para "confirmado" pois tem OS`);
          a.status = 'confirmado';
        }
      });
    }

    // Forçar atualização periódica para garantir que os slots estejam sempre atualizados
    const forceUpdateTimer = setTimeout(() => {
      console.log('Forçando atualização dos slots após timeout');
      setTimeSlots([...slots]); // Isso força uma re-renderização
    }, 1000);

    // Limpar o timer se o componente for desmontado antes do timeout
    return () => clearTimeout(forceUpdateTimer);
  };

  // Gerar os slots de tempo com base na data selecionada e no técnico selecionado
  useEffect(() => {
    const dateToUse = viewMode === 'day' ? selectedDate : selectedDayInWeek;
    const slots: TimeSlot[] = [];

    console.log('TechnicianCalendarView - Gerando slots com os seguintes dados:');
    console.log('- Data selecionada:', dateToUse);
    console.log('- Técnico selecionado:', selectedTechnician);
    console.log('- Total de agendamentos:', agendamentos.length);
    console.log('- Total de rotas atribuídas:', assignedRoutes.length);

    // Verificar se há agendamentos com ordem de serviço
    const agendamentosComOS = agendamentos.filter(a => a.ordem_servico_id);
    console.log('- Agendamentos com ordem de serviço:', agendamentosComOS.length);
    if (agendamentosComOS.length > 0) {
      console.log('  IDs dos agendamentos com OS:', agendamentosComOS.map(a => a.id));

      // Garantir que todos os agendamentos com OS tenham status confirmado
      agendamentosComOS.forEach(a => {
        if (a.status !== 'confirmado') {
          console.log(`Corrigindo status do agendamento ${a.id} de "${a.status}" para "confirmado" pois tem OS`);
          a.status = 'confirmado';
        }
      });
    }

    // Configurar atualização periódica
    const intervalId = setInterval(() => {
      console.log('Verificando atualizações de agendamentos com OS...');
      const updatedAgendamentosComOS = agendamentos.filter(a => a.ordem_servico_id);
      if (updatedAgendamentosComOS.length > 0) {
        console.log(`Encontrados ${updatedAgendamentosComOS.length} agendamentos com OS na verificação periódica`);
        let needsUpdate = false;

        // Verificar se algum agendamento com OS não está marcado como confirmado
        updatedAgendamentosComOS.forEach(a => {
          if (a.status !== 'confirmado') {
            console.log(`Agendamento ${a.id} tem OS mas status é "${a.status}". Forçando atualização.`);
            a.status = 'confirmado';
            needsUpdate = true;
          }
        });

        if (needsUpdate) {
          console.log('Forçando atualização dos slots devido a mudanças nos agendamentos com OS');
          generateTimeSlots();
        }
      }
    }, 3000); // Verificar a cada 3 segundos

    // Limpar o intervalo quando o componente for desmontado
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Efeito para gerar os slots de tempo
  useEffect(() => {
    const dateToUse = viewMode === 'day' ? selectedDate : selectedDayInWeek;
    const slots: TimeSlot[] = [];

    // Gerar slots de 60 minutos (1 hora) das 9h às 18h
    for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += TIME_SLOT_INTERVAL) {
        const start = addHours(new Date(dateToUse.setHours(hour, minute, 0, 0)), 0);
        const end = addHours(new Date(dateToUse.setHours(hour, minute + TIME_SLOT_INTERVAL, 0, 0)), 0);

        // Verificar se é horário de almoço
        const isLunchTime = hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR;

        // Filtrar agendamentos para este slot de tempo
        const slotAppointments = agendamentos.filter(agendamento => {
          if (!agendamento.data_agendada) return false;

          const agendamentoDate = parseISO(agendamento.data_agendada);
          const agendamentoEndTime = addHours(agendamentoDate, agendamento.tipo_servico === 'in-home' ? 1 : 0.5);

          return (
            isSameDay(agendamentoDate, dateToUse) &&
            ((agendamentoDate >= start && agendamentoDate < end) ||
             (agendamentoEndTime > start && agendamentoEndTime <= end) ||
             (agendamentoDate <= start && agendamentoEndTime >= end))
          );
        });

        // Adicionar agendamentos de rotas atribuídas ao técnico selecionado
        if (selectedTechnician) {
          // Filtrar rotas atribuídas ao técnico selecionado para a data atual
          const technicianRoutes = assignedRoutes.filter(route => {
            const routeDate = new Date(route.scheduledDate);
            const isSameDate = isSameDay(routeDate, dateToUse);
            const isSameTechnician = route.technicianId === selectedTechnician;

            if (isSameTechnician && isSameDate) {
              console.log(`Rota encontrada para o técnico ${selectedTechnician} na data ${format(dateToUse, 'dd/MM/yyyy')}`);
              return true;
            }
            return false;
          });

          console.log(`Encontradas ${technicianRoutes.length} rotas para o técnico ${selectedTechnician} na data ${format(dateToUse, 'dd/MM/yyyy')}`);
          if (technicianRoutes.length > 0) {
            console.log('Detalhes das rotas:', technicianRoutes);
          }

          // Para cada rota atribuída, adicionar os waypoints como agendamentos
          technicianRoutes.forEach(assignedRoute => {
            const totalWaypoints = assignedRoute.waypoints.length;
            console.log(`Processando rota com ${totalWaypoints} waypoints:`, assignedRoute.waypoints);
            if (totalWaypoints > 0) {
              // Distribuir os waypoints em slots fixos de hora em hora
              assignedRoute.waypoints.forEach((waypoint, index) => {
                // Determinar o horário para este waypoint com base na posição na rota
                // Começamos às 9h e adicionamos 1 hora por waypoint
                const waypointHour = WORK_START_HOUR + index;

                // Pular o horário de almoço (12h-13h)
                const adjustedHour = waypointHour >= LUNCH_START_HOUR ? waypointHour + 1 : waypointHour;

                // Garantir que não ultrapasse o horário de trabalho
                if (adjustedHour < WORK_END_HOUR) {
                  // Verificar se este waypoint cai neste slot
                  if (hour === adjustedHour && minute === 0) {
                    console.log(`Adicionando waypoint ${waypoint.name} ao slot ${adjustedHour}:00`);

                    // Encontrar o agendamento correspondente a este waypoint
                    // Primeiro tentamos pelo ID, depois pelo nome
                    let waypointAgendamento = agendamentos.find(a => a.id.toString() === waypoint.id);

                    if (!waypointAgendamento) {
                      waypointAgendamento = agendamentos.find(a => a.nome === waypoint.name);
                    }

                    if (waypointAgendamento) {
                      // Adicionar à lista de agendamentos deste slot
                      if (!slotAppointments.some(a => a.id === waypointAgendamento.id)) {
                        // Adicionar informações de horário ao agendamento
                        const slotStartTime = new Date(dateToUse);
                        slotStartTime.setHours(adjustedHour, 0, 0, 0);

                        // Verificar se o agendamento tem uma ordem de serviço
                        const hasServiceOrder = waypointAgendamento.ordem_servico_id !== undefined &&
                                               waypointAgendamento.ordem_servico_id !== null;

                        // Se tiver ordem de serviço, forçar o status para confirmado
                        const statusToUse = hasServiceOrder
                          ? 'confirmado'
                          : (waypointAgendamento.status === 'pendente' ? 'roteirizado' : waypointAgendamento.status);

                        if (hasServiceOrder) {
                          console.log(`Agendamento ${waypointAgendamento.id} tem OS, forçando status para confirmado`);
                        }

                        slotAppointments.push({
                          ...waypointAgendamento,
                          // Usar o status determinado acima
                          status: statusToUse,
                          // Adicionar horário sugerido
                          data_agendada: slotStartTime.toISOString(),
                          // Garantir que a ordem de serviço seja preservada
                          ordem_servico_id: waypointAgendamento.ordem_servico_id
                        });
                      }
                    } else {
                      // Se não encontrar o agendamento, criar um placeholder com as informações do waypoint
                      const placeholderId = waypoint.id || `waypoint-${index}`;
                      console.log(`Criando placeholder para waypoint ${waypoint.name} com ID ${placeholderId}`);

                      const slotStartTime = new Date(dateToUse);
                      slotStartTime.setHours(adjustedHour, 0, 0, 0);

                      // Verificar se existe um agendamento com este ID no array de agendamentos
                      const existingAgendamento = agendamentos.find(a => a.id.toString() === placeholderId);

                      // Verificar se o agendamento tem uma ordem de serviço
                      const hasServiceOrder = existingAgendamento?.ordem_servico_id !== undefined &&
                                             existingAgendamento?.ordem_servico_id !== null;

                      // Se tiver ordem de serviço, forçar o status para confirmado
                      const statusToUse = hasServiceOrder
                        ? 'confirmado'
                        : (existingAgendamento ? existingAgendamento.status : 'roteirizado');

                      if (hasServiceOrder) {
                        console.log(`Placeholder ${placeholderId} tem OS, forçando status para confirmado`);
                      }

                      slotAppointments.push({
                        id: placeholderId,
                        nome: waypoint.name,
                        endereco: waypoint.address,
                        // Usar o status determinado acima
                        status: statusToUse,
                        tipo_servico: 'in-home', // Assumir serviço padrão
                        data_agendada: slotStartTime.toISOString(),
                        // Copiar outras propriedades relevantes do agendamento existente
                        urgente: existingAgendamento ? existingAgendamento.urgente : false,
                        // Garantir que a ordem de serviço seja preservada
                        ordem_servico_id: existingAgendamento?.ordem_servico_id
                      } as AgendamentoAI);
                    }
                  }
                }
              });
            }
          });
        }

        // Verificar se o slot está disponível
        const isAvailable = !isLunchTime && slotAppointments.length === 0;

        slots.push({
          start,
          end,
          isAvailable,
          appointments: slotAppointments,
          isLunchTime
        });
      }
    }

    // Contar quantos slots têm agendamentos
    const slotsWithAppointments = slots.filter(slot => slot.appointments.length > 0);
    console.log(`Gerados ${slots.length} slots, ${slotsWithAppointments.length} com agendamentos`);
    if (slotsWithAppointments.length > 0) {
      console.log('Exemplo de slot com agendamento:', slotsWithAppointments[0]);
    }

    setTimeSlots(slots);
  }, [agendamentos, selectedDate, selectedTechnician, viewMode, selectedDayInWeek, assignedRoutes]);

  // Função para formatar o horário
  const formatTime = (date: Date) => {
    return format(date, 'HH:mm');
  };

  // Função para lidar com a seleção de um slot de tempo
  const handleTimeSlotClick = (slot: TimeSlot, agendamento?: AgendamentoAI) => {
    if (!slot.isAvailable && !agendamento) {
      toast.error('Este horário não está disponível');
      return;
    }

    if (onTimeSlotSelected && agendamento) {
      onTimeSlotSelected(slot, agendamento);
    }
  };





  // Função para renderizar um slot de tempo (versão antiga - mantida para compatibilidade)
  const renderTimeSlot = (slot: TimeSlot) => {
    const { start, end, isAvailable, appointments, isLunchTime } = slot;

    // Definir a classe CSS com base na disponibilidade
    let slotClassName = 'p-2 rounded-md min-h-[120px] flex flex-col justify-between border transition-colors overflow-hidden';

    if (isLunchTime) {
      slotClassName += ' bg-gray-200 border-gray-300 cursor-not-allowed';
    } else if (isAvailable) {
      slotClassName += ' bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer';
    } else {
      // Verificar se há agendamentos confirmados ou com ordem de serviço
      // IMPORTANTE: Verificar explicitamente a presença de ordem_servico_id
      // Forçar o status para confirmado para todos os agendamentos com OS
      appointments.forEach(a => {
        const hasOS = a.ordem_servico_id !== undefined && a.ordem_servico_id !== null;
        if (hasOS && a.status !== 'confirmado') {
          console.log(`[renderTimeSlot] Slot ${format(start, 'HH:mm')} - Forçando status do agendamento ${a.id} para confirmado porque tem OS ${a.ordem_servico_id}`);
          a.status = 'confirmado';
        }
      });

      // Filtrar agendamentos com OS
      const appointmentsWithOS = appointments.filter(a => {
        // Verificar se o agendamento tem ordem de serviço no campo ordem_servico_id
        const hasOS = a.ordem_servico_id !== undefined && a.ordem_servico_id !== null;

        if (hasOS) {
          console.log(`[renderTimeSlot] Slot ${format(start, 'HH:mm')} - Agendamento ${a.id} tem OS: ${a.ordem_servico_id}`);
        }

        return hasOS;
      });

      const hasServiceOrder = appointmentsWithOS.length > 0;

      const confirmedAppointments = appointments.filter(a => a.status === 'confirmado');
      const hasConfirmed = confirmedAppointments.length > 0;

      // Forçar status confirmado para agendamentos com OS
      if (hasServiceOrder) {
        console.log(`Slot ${format(start, 'HH:mm')} - Tem ${appointmentsWithOS.length} agendamentos com OS`);
        appointmentsWithOS.forEach(a => {
          if (a.status !== 'confirmado') {
            console.log(`Slot ${format(start, 'HH:mm')} - Forçando status do agendamento ${a.id} para confirmado`);
            a.status = 'confirmado';
          }
        });
      }

      // FORÇAR VERDE PARA SLOTS COM OS
      if (hasServiceOrder) {
        // Verde MUITO forte para slots com OS
        slotClassName += ' bg-green-300 border-green-600 hover:bg-green-400 cursor-pointer';

        // Adicionar classe especial para slots com OS para destacar ainda mais
        slotClassName += ' ring-4 ring-green-600 ring-inset';
        console.log(`[FORÇANDO VERDE] Slot ${format(start, 'HH:mm')} - Aplicando estilo verde FORTE com borda para OS`);

        // Forçar todos os agendamentos neste slot para confirmado
        appointments.forEach(a => {
          if (a.status !== 'confirmado') {
            console.log(`[FORÇANDO VERDE] Slot ${format(start, 'HH:mm')} - Forçando status do agendamento ${a.id} para confirmado`);
            a.status = 'confirmado';
          }
        });
      }
      // Verde normal para slots com agendamentos confirmados sem OS
      else if (hasConfirmed) {
        slotClassName += ' bg-green-100 border-green-500 hover:bg-green-200 cursor-pointer';
      }
      // Amarelo para slots com agendamentos apenas roteirizados
      else {
        slotClassName += ' bg-yellow-50 border-yellow-200 hover:bg-yellow-100 cursor-pointer';
      }
    }

    return (
      <div key={start.toISOString()} className={slotClassName} onClick={() => handleTimeSlotClick(slot)}>
        <div className="flex justify-between items-center flex-wrap">
          <span className="text-xs sm:text-sm font-medium">{formatTime(start)} - {formatTime(end)}</span>
          {isLunchTime && <span className="text-xs sm:text-sm text-gray-500 font-medium">Horário de Almoço</span>}
        </div>

        {appointments.length > 0 ? (
          <div className="mt-2 space-y-2">
            {appointments.map(appointment => {
              // Determinar a cor de fundo com base no status
              let bgColorClass = 'bg-yellow-100 hover:bg-yellow-200'; // Padrão para roteirizado
              let isConfirmed = false;

              // Verificar se o agendamento está confirmado ou tem uma ordem de serviço associada
              // IMPORTANTE: Forçar a verificação de ordem_servico_id para garantir que slots com OS sejam verdes
              const hasOS = appointment.ordem_servico_id !== undefined &&
                           appointment.ordem_servico_id !== null;

              // FORÇAR VERDE PARA TODOS OS AGENDAMENTOS COM OS
              if (hasOS) {
                // Verde forte para agendamentos com OS
                bgColorClass = 'bg-green-300 hover:bg-green-400';
                isConfirmed = true;

                // Adicionar borda mais forte para agendamentos com OS
                bgColorClass += ' border-2 border-green-600';

                // Forçar o status para confirmado
                if (appointment.status !== 'confirmado') {
                  console.log(`[FORÇANDO VERDE] Agendamento ${appointment.id} tem OS mas status não é confirmado. Corrigindo visualmente.`);
                  appointment.status = 'confirmado';
                }
              }
              // Verde normal para confirmados sem OS
              else if (appointment.status === 'confirmado') {
                bgColorClass = 'bg-green-100 hover:bg-green-200';
                isConfirmed = true;
              }
              // Depois prioridade para urgente
              else if (appointment.urgente) {
                bgColorClass = 'bg-red-100 hover:bg-red-200'; // Vermelho para urgente
              }

              // Adicionar borda mais forte para agendamentos confirmados
              const borderClass = isConfirmed
                ? 'border-2 border-green-500'
                : '';

              return (
                <div
                  key={appointment.id}
                  className={`text-xs sm:text-sm ${bgColorClass} ${borderClass} p-1 sm:p-2 rounded relative overflow-hidden`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTimeSlotClick(slot, appointment);
                  }}
                >
                  <div className="flex items-center gap-1 flex-wrap">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      {appointment.urgente && <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-red-500" />}
                      {appointment.status === 'confirmado' && <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-green-500" />}
                      {appointment.status === 'roteirizado' && <Route className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-yellow-500" />}
                      <span className="font-medium truncate">{appointment.nome}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 mt-1 min-w-0">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{appointment.endereco?.substring(0, 20)}{appointment.endereco?.length > 20 ? '...' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 mt-1 min-w-0">
                    <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{appointment.tipo_servico === 'in-home' ? 'Atendimento (60 min)' : 'Coleta (30 min)'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !isLunchTime && <div className="flex items-center justify-center h-full">
            <div className="text-xs sm:text-sm text-gray-500 bg-green-50 px-2 sm:px-3 py-1 sm:py-2 rounded-full">Disponível</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Agenda de Técnicos
        </CardTitle>

        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <div className="flex-1">
            <Select
              value={selectedTechnician || ''}
              onValueChange={setSelectedTechnician}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'day' | 'week')}>
              <TabsList>
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2 sm:p-6">




        {viewMode === 'day' ? (
          <div className="space-y-2">
            <h3 className="text-sm sm:text-lg font-medium truncate">
              {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h3>

            <div className="grid grid-cols-1 gap-2 max-w-full overflow-x-hidden">
              {timeSlots.map(slot => renderTimeSlot(slot))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDays.map(day => (
                <Button
                  key={day.toISOString()}
                  variant={isSameDay(day, selectedDayInWeek) ? "default" : "outline"}
                  className="flex flex-col items-center p-1 sm:p-2 h-auto text-center"
                  onClick={() => setSelectedDayInWeek(day)}
                >
                  <span className="text-[10px] sm:text-xs">{format(day, 'EEE', { locale: ptBR })}</span>
                  <span className="text-sm sm:text-lg font-bold">{format(day, 'dd')}</span>
                </Button>
              ))}
            </div>

            <h3 className="text-sm sm:text-lg font-medium truncate">
              {format(selectedDayInWeek, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>

            <div className="grid grid-cols-1 gap-2 max-w-full overflow-x-hidden">
              {timeSlots.map(slot => renderTimeSlot(slot))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TechnicianCalendarView;
