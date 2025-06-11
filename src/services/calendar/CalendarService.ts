import { addHours, format, isSameDay, parseISO } from 'date-fns';
import {
  CalendarSlot,
  TechnicianSchedule,
  CalendarConfig,
  SlotStatus,
  SlotUpdatePayload,
  DEFAULT_CALENDAR_CONFIG
} from '@/types/calendar';
import { AgendamentoAI } from '@/services/agendamentos';
import { ServiceOrder } from '@/types';

export class CalendarService {
  private config: CalendarConfig;

  constructor(config: CalendarConfig = DEFAULT_CALENDAR_CONFIG) {
    this.config = config;
  }

  /**
   * Normaliza agendamentos para trabalhar com slots de hora
   * Converte horários específicos (ex: 08:20) para slots de hora (ex: 08:00-09:00)
   */
  private normalizeAppointmentsToHourSlots(agendamentos: AgendamentoAI[]): AgendamentoAI[] {
    return agendamentos.map(agendamento => {
      if (!agendamento.data_agendada) return agendamento;

      const originalDate = parseISO(agendamento.data_agendada);

      // Normalizar para o início da hora (ex: 08:20 -> 08:00)
      const normalizedDate = new Date(originalDate);
      normalizedDate.setMinutes(0, 0, 0);

      console.log(`🔄 [normalizeAppointments] ${agendamento.nome}:`);
      console.log(`   - Original: ${format(originalDate, 'dd/MM/yyyy HH:mm')}`);
      console.log(`   - Normalizado: ${format(normalizedDate, 'dd/MM/yyyy HH:mm')}`);

      return {
        ...agendamento,
        data_agendada: normalizedDate.toISOString()
      };
    });
  }

  /**
   * Gera todos os slots de um dia para um técnico
   */
  generateDaySlots(
    date: Date,
    technicianId: string,
    agendamentos: AgendamentoAI[] = [],
    serviceOrders: ServiceOrder[] = []
  ): CalendarSlot[] {
    const slots: CalendarSlot[] = [];

    console.log(`🏗️ [generateDaySlots] Gerando slots para técnico ${technicianId} na data ${format(date, 'dd/MM/yyyy')}`);

    // Normalizar agendamentos para slots de hora
    const normalizedAgendamentos = this.normalizeAppointmentsToHourSlots(agendamentos);

    // Gerar slots de hora em hora
    for (let hour = this.config.workStartHour; hour < this.config.workEndHour; hour++) {
      const start = new Date(date);
      start.setHours(hour, 0, 0, 0);

      const end = new Date(date);
      end.setHours(hour + 1, 0, 0, 0);

      // Verificar se é horário de almoço
      const isLunchTime = hour >= this.config.lunchStartHour && hour < this.config.lunchEndHour;

      const slot = this.createSlot(start, end, technicianId, isLunchTime);

      // Aplicar agendamentos e ordens de serviço ao slot
      this.applyAppointmentsToSlot(slot, normalizedAgendamentos, serviceOrders);

      slots.push(slot);
    }

    console.log(`✅ [generateDaySlots] Gerados ${slots.length} slots`);
    return slots;
  }

  /**
   * Cria um slot básico
   */
  private createSlot(
    start: Date,
    end: Date,
    technicianId: string,
    isLunchTime: boolean = false
  ): CalendarSlot {
    const slotId = `${technicianId}-${format(start, 'yyyy-MM-dd-HH')}`;

    return {
      id: slotId,
      start,
      end,
      technicianId,
      status: isLunchTime ? 'bloqueado' : 'livre',
      isLunchTime,
      estimatedDuration: this.config.slotDurationMinutes
    };
  }

  /**
   * Aplica agendamentos e ordens de serviço a um slot
   */
  private applyAppointmentsToSlot(
    slot: CalendarSlot,
    agendamentos: AgendamentoAI[],
    serviceOrders: ServiceOrder[]
  ): void {
    // Log apenas para o primeiro slot para reduzir ruído
    if (slot.start.getHours() === 9) {
      console.log(`🔍 [CalendarService] Verificando slots para técnico ${slot.technicianId}`);
      console.log(`📋 [CalendarService] Total de agendamentos recebidos: ${agendamentos.length}`);

      // Verificar agendamentos com data_agendada
      const agendamentosComData = agendamentos.filter(a => a.data_agendada);
      console.log(`📅 [CalendarService] Agendamentos com data_agendada: ${agendamentosComData.length}`);

      // Verificar agendamentos com OS
      const agendamentosComOS = agendamentos.filter(a => a.ordem_servico_id);
      console.log(`🏥 [CalendarService] Agendamentos com OS: ${agendamentosComOS.length}`);
      if (agendamentosComOS.length > 0) {
        console.log(`🏥 [CalendarService] IDs dos agendamentos com OS:`, agendamentosComOS.map(a => `${a.id} (${a.nome})`));
      }
    }

    // Buscar agendamentos que se encaixam neste slot
    const slotAppointments = agendamentos.filter(agendamento =>
      this.appointmentFitsInSlot(agendamento, slot)
    );

    console.log(`✅ [CalendarService] Agendamentos que se encaixam no slot ${format(slot.start, 'HH:mm')}: ${slotAppointments.length}`);
    if (slotAppointments.length > 0) {
      console.log(`✅ [CalendarService] Detalhes:`, slotAppointments.map(a => `${a.nome} (${a.data_agendada})`));
    }

    if (slotAppointments.length === 0) return;

    // Pegar o primeiro agendamento (pode ser melhorado para lidar com múltiplos)
    const appointment = slotAppointments[0];

    // Determinar o status baseado na presença de ordem de serviço
    const hasServiceOrder = appointment.ordem_servico_id !== undefined &&
                           appointment.ordem_servico_id !== null;

    // Buscar dados da ordem de serviço se existir
    const serviceOrder = hasServiceOrder
      ? serviceOrders.find(so => so.id === appointment.ordem_servico_id)
      : undefined;

    // Aplicar dados ao slot
    slot.agendamentoId = appointment.id;
    slot.ordemServicoId = appointment.ordem_servico_id;
    slot.clientName = appointment.nome;
    slot.address = appointment.endereco;
    slot.serviceType = appointment.tipo_servico;
    slot.isUrgent = appointment.urgente;
    slot.logisticsGroup = appointment.logistica;

    // Determinar status final
    slot.status = this.determineSlotStatus(appointment, hasServiceOrder);

    // Se for uma sugestão da IA, adicionar metadados
    if (appointment.status === 'roteirizado' && !hasServiceOrder) {
      slot.isAISuggestion = true;
      slot.suggestionScore = this.calculateSuggestionScore(appointment);
      slot.suggestionReason = this.generateSuggestionReason(appointment);
    }
  }

  /**
   * Verifica se um agendamento se encaixa em um slot
   * Agora trabalha com slots de 1 hora, então qualquer horário dentro da hora se encaixa
   */
  private appointmentFitsInSlot(agendamento: AgendamentoAI, slot: CalendarSlot): boolean {
    if (!agendamento.data_agendada) {
      console.log(`❌ [appointmentFitsInSlot] Agendamento ${agendamento.nome} sem data_agendada`);
      return false;
    }

    const appointmentDate = parseISO(agendamento.data_agendada);
    const slotHour = slot.start.getHours();
    const appointmentHour = appointmentDate.getHours();

    // Verificar se é o mesmo dia
    const sameDay = isSameDay(appointmentDate, slot.start);

    // Verificar se o horário do agendamento cai dentro do slot (mesma hora)
    const sameHour = appointmentHour === slotHour;

    const fits = sameDay && sameHour;

    if (fits) {
      console.log(`✅ [appointmentFitsInSlot] ${agendamento.nome} encaixa no slot ${slotHour}h`);
    }

    return fits;
  }

  /**
   * Determina o status de um slot baseado no agendamento
   */
  private determineSlotStatus(agendamento: AgendamentoAI, hasServiceOrder: boolean): SlotStatus {
    // Prioridade: OS confirmada > Agendamento confirmado > Roteirizado > Pendente
    if (hasServiceOrder) {
      return 'confirmado'; // Azul - OS criada e confirmada
    }

    if (agendamento.status === 'confirmado') {
      return 'confirmado'; // Azul - Agendamento confirmado
    }

    if (agendamento.status === 'roteirizado') {
      return 'sugerido'; // Amarelo - Sugestão da IA
    }

    return 'livre'; // Verde - Slot disponível
  }

  /**
   * Calcula score de sugestão da IA (0-100)
   */
  private calculateSuggestionScore(agendamento: AgendamentoAI): number {
    let score = 50; // Base score

    // Aumentar score para urgentes
    if (agendamento.urgente) score += 30;

    // Aumentar score baseado na logística
    if (agendamento.logistica) score += 20;

    return Math.min(100, score);
  }

  /**
   * Gera razão para a sugestão
   */
  private generateSuggestionReason(agendamento: AgendamentoAI): string {
    const reasons = [];

    if (agendamento.urgente) {
      reasons.push('Atendimento urgente');
    }

    if (agendamento.logistica) {
      reasons.push(`Otimização logística (Grupo ${agendamento.logistica})`);
    }

    return reasons.length > 0 ? reasons.join(', ') : 'Sugestão baseada em disponibilidade';
  }

  /**
   * Atualiza o status de um slot
   */
  updateSlotStatus(slots: CalendarSlot[], payload: SlotUpdatePayload): CalendarSlot[] {
    return slots.map(slot => {
      if (slot.id === payload.slotId) {
        return {
          ...slot,
          status: payload.status,
          agendamentoId: payload.agendamentoId || slot.agendamentoId,
          ordemServicoId: payload.ordemServicoId || slot.ordemServicoId,
          estimatedDuration: payload.estimatedDuration || slot.estimatedDuration
        };
      }
      return slot;
    });
  }

  /**
   * Gera agenda completa de um técnico
   */
  generateTechnicianSchedule(
    date: Date,
    technicianId: string,
    technicianName: string,
    agendamentos: AgendamentoAI[] = [],
    serviceOrders: ServiceOrder[] = []
  ): TechnicianSchedule {
    const slots = this.generateDaySlots(date, technicianId, agendamentos, serviceOrders);

    const occupiedSlots = slots.filter(slot => slot.status !== 'livre' && !slot.isLunchTime).length;
    const availableSlots = slots.filter(slot => slot.status === 'livre').length;
    const workload = (occupiedSlots / this.config.maxSlotsPerDay) * 100;

    return {
      technicianId,
      technicianName,
      date,
      slots,
      totalOccupiedSlots: occupiedSlots,
      totalAvailableSlots: availableSlots,
      workload: Math.round(workload)
    };
  }

  /**
   * Encontra slots livres para sugestões
   */
  findAvailableSlots(
    schedule: TechnicianSchedule,
    requiredDuration: number = 60
  ): CalendarSlot[] {
    return schedule.slots.filter(slot =>
      slot.status === 'livre' &&
      !slot.isLunchTime &&
      (slot.estimatedDuration || 60) >= requiredDuration
    );
  }
}

// Instância singleton
export const calendarService = new CalendarService();
