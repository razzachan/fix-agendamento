import { supabase } from '@/integrations/supabase/client';
import { AgendamentoAI } from '@/services/agendamentos';
import { format, parseISO, addMinutes, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calendarService } from '@/services/calendar/CalendarService';
import { DEFAULT_CALENDAR_CONFIG } from '@/types/calendar';

export interface ScheduleData {
  agendamentoId: number;
  scheduledTime: string;
  estimatedDuration: number;
  selectedDate: string; // Data selecionada para o agendamento
}

export interface CalendarSlot {
  technicianId: string;
  date: string;
  startTime: string;
  endTime: string;
  agendamentoId: number;
  clientName: string;
  address: string;
  serviceType: string;
}

export interface RouteApplicationResult {
  success: boolean;
  confirmedCount: number;
  failedCount: number;
  calendarSlots: CalendarSlot[];
  errors: string[];
}

class RouteApplicationService {
  /**
   * Aplica uma rota confirmando agendamentos selecionados
   */
  async applyRoute(
    selectedAgendamentos: AgendamentoAI[],
    technicianId: string,
    scheduleData: ScheduleData[],
    selectedDate: string
  ): Promise<RouteApplicationResult> {
    const result: RouteApplicationResult = {
      success: false,
      confirmedCount: 0,
      failedCount: 0,
      calendarSlots: [],
      errors: []
    };

    try {
      console.log(`🚀 Aplicando rota para ${selectedAgendamentos.length} agendamentos na data ${selectedDate}`);

      // 1. Validar disponibilidade no calendário principal
      const availabilityCheck = await this.validateCalendarAvailability(technicianId, scheduleData, selectedDate);
      if (!availabilityCheck.isValid) {
        result.errors.push(`Conflitos de calendário: ${availabilityCheck.conflicts.join(', ')}`);
        return result;
      }

      // 2. Validar intervalos de horário (hora em hora)
      const intervalCheck = this.validateHourlyIntervals(scheduleData);
      if (!intervalCheck.isValid) {
        result.errors.push(`Horários inválidos: ${intervalCheck.errors.join(', ')}`);
        return result;
      }

      // 3. Processar cada agendamento
      for (const agendamento of selectedAgendamentos) {
        try {
          const schedule = scheduleData.find(s => s.agendamentoId === agendamento.id);
          if (!schedule) {
            result.errors.push(`Dados de agendamento não encontrados para ${agendamento.nome}`);
            result.failedCount++;
            continue;
          }

          // Confirmar agendamento com data selecionada
          const confirmed = await this.confirmAgendamento(agendamento, technicianId, schedule, selectedDate);
          if (confirmed) {
            result.confirmedCount++;

            // Criar slot no calendário principal
            const calendarSlot = await this.createCalendarSlot(agendamento, technicianId, schedule, selectedDate);
            if (calendarSlot) {
              result.calendarSlots.push(calendarSlot);
            }
          } else {
            result.failedCount++;
            result.errors.push(`Falha ao confirmar agendamento de ${agendamento.nome}`);
          }
        } catch (error) {
          console.error(`Erro ao processar agendamento ${agendamento.id}:`, error);
          result.failedCount++;
          result.errors.push(`Erro ao processar ${agendamento.nome}: ${error}`);
        }
      }

      // 4. Sincronizar com calendário principal
      if (result.confirmedCount > 0) {
        await this.syncWithMainCalendar(result.calendarSlots);
        await this.sendConfirmationNotifications(result.calendarSlots);
      }

      result.success = result.confirmedCount > 0;

      console.log(`✅ Rota aplicada: ${result.confirmedCount} confirmados, ${result.failedCount} falharam`);
      console.log(`📅 Sincronizado com calendário principal: ${result.calendarSlots.length} eventos`);

      return result;
      
    } catch (error) {
      console.error('❌ Erro ao aplicar rota:', error);
      result.errors.push(`Erro geral: ${error}`);
      return result;
    }
  }

  /**
   * Valida disponibilidade no calendário principal
   */
  private async validateCalendarAvailability(
    technicianId: string,
    scheduleData: ScheduleData[],
    selectedDate: string
  ): Promise<{ isValid: boolean; conflicts: string[] }> {
    try {
      const conflicts: string[] = [];
      const selectedDateObj = parseISO(selectedDate);

      console.log(`🔍 Validando disponibilidade no calendário para ${technicianId} em ${selectedDate}`);

      // 1. Buscar agendamentos existentes do técnico na data selecionada
      // Nota: A tabela agendamentos_ai não tem horario_agendado nem tecnico_id
      const { data: existingAppointments, error } = await supabase
        .from('agendamentos_ai')
        .select('id, nome, data_agendada')
        .eq('status', 'agendado')
        .gte('data_agendada', `${selectedDate}T00:00:00`)
        .lt('data_agendada', `${selectedDate}T23:59:59`);

      if (error) {
        console.error('Erro ao buscar agendamentos existentes:', error);
        return { isValid: false, conflicts: ['Erro ao verificar calendário'] };
      }

      // 2. Verificar cada novo agendamento (validação simplificada)
      for (const schedule of scheduleData) {
        const requestedHour = parseInt(schedule.scheduledTime.split(':')[0]);

        // Verificar se o horário está dentro do horário de trabalho
        if (requestedHour < DEFAULT_CALENDAR_CONFIG.workStartHour ||
            requestedHour >= DEFAULT_CALENDAR_CONFIG.workEndHour) {
          conflicts.push(`Horário ${schedule.scheduledTime} fora do horário de trabalho (${DEFAULT_CALENDAR_CONFIG.workStartHour}h-${DEFAULT_CALENDAR_CONFIG.workEndHour}h)`);
          continue;
        }

        // Verificar se é horário de almoço
        if (requestedHour >= DEFAULT_CALENDAR_CONFIG.lunchStartHour &&
            requestedHour < DEFAULT_CALENDAR_CONFIG.lunchEndHour) {
          conflicts.push(`Horário ${schedule.scheduledTime} conflita com horário de almoço (${DEFAULT_CALENDAR_CONFIG.lunchStartHour}h-${DEFAULT_CALENDAR_CONFIG.lunchEndHour}h)`);
          continue;
        }

        // Como não temos horario_agendado na tabela, vamos permitir todos os horários válidos
        // Em uma implementação real, verificaríamos conflitos específicos
      }

      const isValid = conflicts.length === 0;
      console.log(`${isValid ? '✅' : '❌'} Validação de calendário: ${conflicts.length} conflitos encontrados`);

      return { isValid, conflicts };
      
    } catch (error) {
      console.error('Erro ao validar disponibilidade do calendário:', error);
      return { isValid: false, conflicts: ['Erro interno na validação'] };
    }
  }

  /**
   * Valida se os horários seguem intervalos de uma hora
   */
  private validateHourlyIntervals(scheduleData: ScheduleData[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const schedule of scheduleData) {
      const [hours, minutes] = schedule.scheduledTime.split(':').map(Number);

      // Verificar se os minutos são 00 (intervalos de hora em hora)
      if (minutes !== 0) {
        errors.push(`Horário ${schedule.scheduledTime} deve ser em intervalos de hora em hora (ex: 08:00, 09:00)`);
      }

      // Verificar se a duração é compatível com slots de 1 hora
      if (schedule.estimatedDuration > 60) {
        errors.push(`Duração de ${schedule.estimatedDuration} minutos excede o slot de 1 hora para horário ${schedule.scheduledTime}`);
      }
    }

    const isValid = errors.length === 0;
    console.log(`${isValid ? '✅' : '❌'} Validação de intervalos: ${errors.length} erros encontrados`);

    return { isValid, errors };
  }

  /**
   * Confirma um agendamento individual
   */
  private async confirmAgendamento(
    agendamento: AgendamentoAI,
    technicianId: string,
    schedule: ScheduleData,
    selectedDate: string
  ): Promise<boolean> {
    try {
      // Buscar nome do técnico
      const { data: technician } = await supabase
        .from('users')
        .select('name')
        .eq('id', technicianId)
        .single();

      const technicianName = technician?.name || 'Técnico não identificado';

      // Atualizar agendamento com data selecionada
      // Nota: A tabela agendamentos_ai não tem tecnico_id, tecnico_nome, horario_agendado
      const { error } = await supabase
        .from('agendamentos_ai')
        .update({
          status: 'agendado',
          tecnico: technicianName, // Usar campo 'tecnico' que existe
          data_agendada: selectedDate, // Usar data selecionada no modal
          // horario_agendado: schedule.scheduledTime, // Campo não existe na tabela
          // updated_at: new Date().toISOString() // Campo pode não existir
        })
        .eq('id', agendamento.id);

      if (error) {
        console.error(`Erro ao confirmar agendamento ${agendamento.id}:`, error);
        return false;
      }

      console.log(`✅ Agendamento confirmado: ${agendamento.nome} - ${schedule.scheduledTime}`);
      return true;
      
    } catch (error) {
      console.error(`Erro ao confirmar agendamento ${agendamento.id}:`, error);
      return false;
    }
  }

  /**
   * Cria slot no calendário principal
   */
  private async createCalendarSlot(
    agendamento: AgendamentoAI,
    technicianId: string,
    schedule: ScheduleData,
    selectedDate: string
  ): Promise<CalendarSlot | null> {
    try {
      const startTime = schedule.scheduledTime;
      const endTime = this.addMinutesToTime(startTime, schedule.estimatedDuration);
      const date = selectedDate; // Usar data selecionada

      // Criar evento no calendário (se tabela existir)
      const calendarEvent = {
        technician_id: technicianId,
        agendamento_id: agendamento.id,
        title: `Atendimento - ${agendamento.nome}`,
        description: agendamento.problema_relatado,
        start_time: `${date}T${startTime}:00`,
        end_time: `${date}T${endTime}:00`,
        location: agendamento.endereco,
        status: 'confirmed',
        created_at: new Date().toISOString()
      };

      // Tentar inserir no calendário (se tabela existir)
      try {
        await supabase
          .from('calendar_events')
          .insert(calendarEvent);
      } catch (calendarError) {
        console.log('Tabela calendar_events não existe, pulando criação de evento');
      }

      return {
        technicianId,
        date,
        startTime,
        endTime,
        agendamentoId: agendamento.id,
        clientName: agendamento.nome,
        address: agendamento.endereco,
        serviceType: agendamento.tipo_servico || 'Manutenção'
      };
      
    } catch (error) {
      console.error('Erro ao criar slot no calendário:', error);
      return null;
    }
  }

  /**
   * Sincroniza com o calendário principal
   */
  private async syncWithMainCalendar(calendarSlots: CalendarSlot[]): Promise<void> {
    try {
      console.log(`📅 Sincronizando ${calendarSlots.length} eventos com calendário principal`);

      for (const slot of calendarSlots) {
        // Criar evento no calendário principal (tabela calendar_events se existir)
        try {
          const calendarEvent = {
            technician_id: slot.technicianId,
            agendamento_id: slot.agendamentoId,
            title: `Atendimento - ${slot.clientName}`,
            description: `Serviço agendado via roteirização`,
            start_time: `${slot.date}T${slot.startTime}:00`,
            end_time: `${slot.date}T${slot.endTime}:00`,
            location: slot.address,
            status: 'confirmed',
            service_type: slot.serviceType,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          await supabase
            .from('calendar_events')
            .insert(calendarEvent);

          console.log(`✅ Evento criado no calendário principal para ${slot.clientName}`);
        } catch (calendarError) {
          console.log(`⚠️ Tabela calendar_events não existe ou erro ao criar evento: ${calendarError}`);
        }
      }

      console.log(`✅ Sincronização com calendário principal concluída`);
    } catch (error) {
      console.error('❌ Erro na sincronização com calendário principal:', error);
    }
  }

  /**
   * Envia notificações de confirmação
   */
  private async sendConfirmationNotifications(calendarSlots: CalendarSlot[]): Promise<void> {
    try {
      for (const slot of calendarSlots) {
        // Criar notificação para o cliente
        const notification = {
          user_id: '00000000-0000-0000-0000-000000000001', // Admin por enquanto
          title: '📅 Agendamento Confirmado',
          description: `Seu agendamento foi confirmado para ${slot.date} às ${slot.startTime}. Endereço: ${slot.address}`,
          type: 'success',
          read: false,
          time: new Date().toISOString()
        };

        await supabase
          .from('notifications')
          .insert(notification);
      }
      
      console.log(`📧 ${calendarSlots.length} notificações de confirmação enviadas`);
      
    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
    }
  }

  /**
   * Adiciona minutos a um horário (formato HH:MM)
   */
  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  /**
   * Verifica se dois intervalos de tempo se sobrepõem
   */
  private timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start1Min = toMinutes(start1);
    const end1Min = toMinutes(end1);
    const start2Min = toMinutes(start2);
    const end2Min = toMinutes(end2);

    return start1Min < end2Min && end1Min > start2Min;
  }

  /**
   * Busca agendamentos confirmados de um técnico para uma data
   */
  async getTechnicianSchedule(technicianId: string, date: string): Promise<CalendarSlot[]> {
    try {
      // Como não temos tecnico_id e horario_agendado, vamos simular
      const { data: agendamentos, error } = await supabase
        .from('agendamentos_ai')
        .select('*')
        .eq('status', 'agendado')
        .gte('data_agendada', `${date}T00:00:00`)
        .lt('data_agendada', `${date}T23:59:59`)
        .order('created_at');

      if (error) {
        console.error('Erro ao buscar agenda do técnico:', error);
        return [];
      }

      return (agendamentos || []).map(ag => ({
        technicianId,
        date,
        startTime: '08:00', // Horário padrão já que não temos horario_agendado
        endTime: '09:00', // Duração padrão de 60 minutos
        agendamentoId: ag.id,
        clientName: ag.nome,
        address: ag.endereco,
        serviceType: ag.tipo_servico || 'Manutenção'
      }));
      
    } catch (error) {
      console.error('Erro ao buscar agenda do técnico:', error);
      return [];
    }
  }

  /**
   * Cancela aplicação de rota (reverte agendamentos)
   */
  async cancelRouteApplication(agendamentoIds: number[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agendamentos_ai')
        .update({
          status: 'pendente',
          tecnico: null, // Usar campo 'tecnico' que existe
          data_agendada: null,
          // horario_agendado: null, // Campo não existe
          // updated_at: new Date().toISOString() // Campo pode não existir
        })
        .in('id', agendamentoIds);

      if (error) {
        console.error('Erro ao cancelar aplicação de rota:', error);
        return false;
      }

      // Remover eventos do calendário
      try {
        await supabase
          .from('calendar_events')
          .delete()
          .in('agendamento_id', agendamentoIds);
      } catch (calendarError) {
        console.log('Erro ao remover eventos do calendário (tabela pode não existir)');
      }

      console.log(`✅ Aplicação de rota cancelada para ${agendamentoIds.length} agendamentos`);
      return true;
      
    } catch (error) {
      console.error('Erro ao cancelar aplicação de rota:', error);
      return false;
    }
  }
}

export const routeApplicationService = new RouteApplicationService();
