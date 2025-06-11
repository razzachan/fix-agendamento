import { TimeSlot, ServicePoint, TIME_WINDOWS } from './types';
import { format, addMinutes, isWithinInterval, areIntervalsOverlapping } from 'date-fns';
import { agendamentosService } from '../agendamentos';

/**
 * Gerencia a disponibilidade de horários considerando agendamentos confirmados
 */
export class AvailabilityManager {
  /**
   * Retorna slots disponíveis para uma data específica, considerando agendamentos confirmados
   * @param date Data para verificar disponibilidade
   * @param technicianId ID do técnico (opcional)
   * @returns Array de slots de tempo disponíveis
   */
  async getAvailableTimeSlots(date: Date, technicianId?: string): Promise<TimeSlot[]> {
    // 1. Buscar todos os agendamentos confirmados para a data
    const confirmedAppointments = await this.getConfirmedAppointments(date, technicianId);
    
    // 2. Criar slots padrão para manhã e tarde
    const morningSlot: TimeSlot = {
      start: this.setHoursToDate(date, TIME_WINDOWS.MORNING_START, 0),
      end: this.setHoursToDate(date, TIME_WINDOWS.MORNING_END, 0),
      period: 'manhã',
      technician: technicianId
    };
    
    const afternoonSlot: TimeSlot = {
      start: this.setHoursToDate(date, TIME_WINDOWS.AFTERNOON_START, 0),
      end: this.setHoursToDate(date, TIME_WINDOWS.AFTERNOON_END, 0),
      period: 'tarde',
      technician: technicianId
    };
    
    // 3. Fragmentar slots com base nos agendamentos confirmados
    const availableMorningSlots = this.fragmentTimeSlot(morningSlot, confirmedAppointments);
    const availableAfternoonSlots = this.fragmentTimeSlot(afternoonSlot, confirmedAppointments);
    
    // 4. Combinar e retornar todos os slots disponíveis
    return [...availableMorningSlots, ...availableAfternoonSlots];
  }
  
  /**
   * Verifica se um slot de tempo específico está disponível
   * @param proposedSlot Slot de tempo proposto
   * @returns true se o slot estiver disponível, false caso contrário
   */
  async isTimeSlotAvailable(proposedSlot: TimeSlot): Promise<boolean> {
    const date = proposedSlot.start;
    const confirmedAppointments = await this.getConfirmedAppointments(date, proposedSlot.technician);
    
    // Verificar se o slot proposto não conflita com agendamentos existentes
    for (const appointment of confirmedAppointments) {
      if (!appointment.scheduledTime) continue;
      
      const appointmentEnd = addMinutes(appointment.scheduledTime, appointment.serviceTime);
      const appointmentSlot = {
        start: appointment.scheduledTime,
        end: appointmentEnd
      };
      
      if (areIntervalsOverlapping(
        { start: proposedSlot.start, end: proposedSlot.end },
        { start: appointmentSlot.start, end: appointmentSlot.end }
      )) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Fragmenta um slot de tempo com base nos agendamentos confirmados
   * @param slot Slot de tempo original
   * @param confirmedAppointments Agendamentos confirmados
   * @returns Array de slots de tempo disponíveis após fragmentação
   */
  private fragmentTimeSlot(slot: TimeSlot, confirmedAppointments: ServicePoint[]): TimeSlot[] {
    const availableSlots: TimeSlot[] = [];
    let currentStart = slot.start;
    
    // Ordenar agendamentos por horário
    const sortedAppointments = confirmedAppointments
      .filter(app => app.scheduledTime && 
        isWithinInterval(app.scheduledTime, { start: slot.start, end: slot.end }))
      .sort((a, b) => a.scheduledTime!.getTime() - b.scheduledTime!.getTime());
    
    // Fragmentar o slot com base nos agendamentos
    for (const appointment of sortedAppointments) {
      if (!appointment.scheduledTime) continue;
      
      const appointmentStart = appointment.scheduledTime;
      const appointmentEnd = addMinutes(appointmentStart, appointment.serviceTime);
      
      // Se há espaço antes do agendamento, adicionar como slot disponível
      if (appointmentStart.getTime() > currentStart.getTime()) {
        availableSlots.push({
          start: currentStart,
          end: appointmentStart,
          period: slot.period,
          technician: slot.technician
        });
      }
      
      // Atualizar o início do próximo slot disponível
      currentStart = appointmentEnd;
    }
    
    // Se ainda há espaço após o último agendamento, adicionar como slot disponível
    if (currentStart.getTime() < slot.end.getTime()) {
      availableSlots.push({
        start: currentStart,
        end: slot.end,
        period: slot.period,
        technician: slot.technician
      });
    }
    
    return availableSlots;
  }
  
  /**
   * Busca agendamentos confirmados para uma data específica
   * @param date Data para buscar agendamentos
   * @param technicianId ID do técnico (opcional)
   * @returns Array de pontos de serviço confirmados
   */
  private async getConfirmedAppointments(date: Date, technicianId?: string): Promise<ServicePoint[]> {
    try {
      // Buscar agendamentos do serviço
      const formattedDate = format(date, 'yyyy-MM-dd');
      const agendamentos = await agendamentosService.getAll();
      
      // Filtrar por data e status confirmado
      const confirmedAgendamentos = agendamentos.filter(agendamento => {
        if (agendamento.status !== 'confirmado' || !agendamento.data_agendada) return false;
        
        const agendamentoDate = format(new Date(agendamento.data_agendada), 'yyyy-MM-dd');
        return agendamentoDate === formattedDate;
      });
      
      // Converter para ServicePoint
      return confirmedAgendamentos.map(agendamento => ({
        id: agendamento.id.toString(),
        coordinates: agendamento.coordenadas || [-48.5554, -27.5969], // Coordenadas padrão se não disponíveis
        address: agendamento.endereco || '',
        clientName: agendamento.nome || '',
        serviceTime: this.estimateServiceTime(agendamento),
        priority: agendamento.urgente ? 2 : 1,
        type: 'confirmado',
        scheduledTime: agendamento.data_agendada ? new Date(agendamento.data_agendada) : undefined,
        serviceType: this.determineServiceType(agendamento),
        urgency: agendamento.urgente || false
      }));
    } catch (error) {
      console.error('Erro ao buscar agendamentos confirmados:', error);
      return [];
    }
  }
  
  /**
   * Estima o tempo de serviço com base no tipo de agendamento
   * @param agendamento Agendamento para estimar tempo
   * @returns Tempo estimado em minutos
   */
  private estimateServiceTime(agendamento: any): number {
    // Lógica para estimar tempo de serviço
    // Por padrão, serviços em casa levam 50 minutos e coletas 30 minutos
    const serviceType = this.determineServiceType(agendamento);
    return serviceType === 'in-home' ? 50 : 30;
  }
  
  /**
   * Determina o tipo de serviço (em casa ou coleta)
   * @param agendamento Agendamento para determinar tipo
   * @returns Tipo de serviço
   */
  private determineServiceType(agendamento: any): 'in-home' | 'pickup' {
    // Lógica para determinar tipo de serviço
    // Por padrão, considerar como serviço em casa
    return agendamento.tipo_servico === 'coleta' ? 'pickup' : 'in-home';
  }
  
  /**
   * Cria uma data com hora e minuto específicos
   * @param date Data base
   * @param hours Horas
   * @param minutes Minutos
   * @returns Nova data com hora e minuto definidos
   */
  private setHoursToDate(date: Date, hours: number, minutes: number): Date {
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  }
}
