import React, { useState, useEffect } from 'react';
import { format, addHours, isSameDay, parseISO, addDays } from 'date-fns';
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

// Definir os horários de trabalho
const WORK_START_HOUR = 8; // ✅ EXPANDIDO: 8h (era 9h)
const WORK_END_HOUR = 18; // 18h
const LUNCH_START_HOUR = 12; // 12h
const LUNCH_END_HOUR = 13; // 13h
const TIME_SLOT_INTERVAL = 60; // 60 minutos (1 hora)

// Interface para os slots de tempo
interface TimeSlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
  appointments: AgendamentoAI[];
  isLunchTime: boolean;
}

interface TechnicianCalendarViewProps {
  agendamentos: AgendamentoAI[];
  technicians: any[];
  assignedRoutes?: any[];
  selectedDate?: Date;
  onTimeSlotSelected?: (slot: TimeSlot, agendamento?: AgendamentoAI) => void;
}

const TechnicianCalendarViewSimple: React.FC<TechnicianCalendarViewProps> = ({
  agendamentos = [],
  technicians = [],
  assignedRoutes = [],
  selectedDate = new Date(),
  onTimeSlotSelected
}) => {
  // Estado para armazenar o técnico selecionado
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);

  // Estado para armazenar os slots de tempo
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Estado para armazenar o modo de visualização (dia ou semana)
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
    for (let i = -3; i <= 3; i++) {
      days.push(addDays(selectedDate, i));
    }
    setWeekDays(days);
    setSelectedDayInWeek(selectedDate);
  }, [selectedDate]);

  // Função para gerar os slots de tempo
  const generateTimeSlots = () => {
    // Forçar o status de agendamentos com OS para confirmado
    agendamentos.forEach(a => {
      if (a.ordem_servico_id) {
        console.log(`[FORÇANDO VERDE] Agendamento ${a.id} tem OS ${a.ordem_servico_id}. Forçando status para confirmado.`);
        a.status = 'confirmado';
      }
    });

    const dateToUse = viewMode === 'day' ? selectedDate : selectedDayInWeek;
    const slots: TimeSlot[] = [];

    // Gerar slots de 60 minutos (1 hora) das 9h às 18h
    for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
      const start = new Date(dateToUse);
      start.setHours(hour, 0, 0, 0);

      const end = new Date(dateToUse);
      end.setHours(hour + 1, 0, 0, 0);

      // Verificar se é horário de almoço
      const isLunchTime = hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR;

      // Filtrar agendamentos para este slot de tempo e para o técnico selecionado
      const slotAppointments = agendamentos.filter(agendamento => {
        // Verificar se o agendamento tem data agendada
        if (!agendamento.data_agendada) return false;

        // Verificar se o agendamento é para o técnico selecionado
        if (agendamento.tecnico_id !== selectedTechnician) return false;

        // Verificar se o agendamento é para o dia selecionado
        const agendamentoDate = parseISO(agendamento.data_agendada);
        if (!isSameDay(agendamentoDate, dateToUse)) return false;

        // Verificar se o agendamento é para a hora selecionada
        const agendamentoHour = agendamentoDate.getHours();
        return agendamentoHour === hour;
      });

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

    setTimeSlots(slots);
  };

  // Efeito para gerar os slots de tempo
  useEffect(() => {
    if (selectedTechnician && agendamentos.length > 0) {
      generateTimeSlots();
    }
  }, [selectedTechnician, selectedDate, agendamentos, viewMode, selectedDayInWeek]);

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

  // Função para renderizar um slot de tempo
  const renderTimeSlot = (slot: TimeSlot) => {
    const { start, end, isAvailable, appointments, isLunchTime } = slot;

    // Verificar se há agendamentos neste slot
    const hasAppointments = appointments.length > 0;

    // Verificar se há agendamentos com ordem de serviço
    const appointmentsWithOS = appointments.filter(a => a.ordem_servico_id);
    const hasAppointmentsWithOS = appointmentsWithOS.length > 0;

    // Verificar se há agendamentos confirmados
    const confirmedAppointments = appointments.filter(a => a.status === 'confirmado');
    const hasConfirmedAppointments = confirmedAppointments.length > 0;

    // Verificar se há agendamentos roteirizados
    const routedAppointments = appointments.filter(a => a.status === 'roteirizado');
    const hasRoutedAppointments = routedAppointments.length > 0;

    // Definir a classe CSS com base na disponibilidade
    let slotClassName = 'p-2 rounded-md min-h-[120px] flex flex-col justify-between border transition-colors overflow-hidden';

    if (isLunchTime) {
      slotClassName += ' bg-gray-200 border-gray-300 cursor-not-allowed';
    } else if (!hasAppointments) {
      slotClassName += ' bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer';
    } else {
      // FORÇAR VERDE PARA SLOTS COM OS
      if (hasAppointmentsWithOS) {
        // Verde MUITO forte para slots com OS
        slotClassName += ' bg-green-300 border-green-600 border-4 hover:bg-green-400 cursor-pointer';
        console.log(`[FORÇANDO VERDE] Slot ${format(start, 'HH:mm')} - Tem ${appointmentsWithOS.length} agendamentos com OS`);

        // Forçar o status para confirmado para todos os agendamentos com OS
        appointmentsWithOS.forEach(a => {
          if (a.status !== 'confirmado') {
            console.log(`[FORÇANDO VERDE] Agendamento ${a.id} tem OS ${a.ordem_servico_id}. Forçando status para confirmado.`);
            a.status = 'confirmado';
          }
        });
      }
      // Verde normal para slots com agendamentos confirmados
      else if (hasConfirmedAppointments) {
        slotClassName += ' bg-green-100 border-green-500 hover:bg-green-200 cursor-pointer';
      }
      // Amarelo para slots com agendamentos apenas roteirizados
      else if (hasRoutedAppointments) {
        slotClassName += ' bg-yellow-50 border-yellow-200 hover:bg-yellow-100 cursor-pointer';
      }
      // Cinza para outros casos
      else {
        slotClassName += ' bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer';
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

              // FORÇAR VERDE PARA AGENDAMENTOS COM OS
              if (appointment.ordem_servico_id) {
                bgColorClass = 'bg-green-300 hover:bg-green-400 border-2 border-green-600';

                // Forçar o status para confirmado
                if (appointment.status !== 'confirmado') {
                  appointment.status = 'confirmado';
                }
              }
              else if (appointment.status === 'confirmado') {
                bgColorClass = 'bg-green-100 hover:bg-green-200';
              }
              else if (appointment.urgente) {
                bgColorClass = 'bg-red-100 hover:bg-red-200'; // Vermelho para urgente
              }

              return (
                <div
                  key={appointment.id}
                  className={`text-xs sm:text-sm ${bgColorClass} p-1 sm:p-2 rounded relative overflow-hidden`}
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

export default TechnicianCalendarViewSimple;
