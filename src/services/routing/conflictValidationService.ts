import { AgendamentoAI } from '@/services/agendamentos';
import { supabase } from '@/integrations/supabase/client';

export interface ConflictValidationResult {
  hasConflicts: boolean;
  conflicts: Array<{
    type: 'time_conflict' | 'technician_conflict' | 'equipment_conflict' | 'logistics_conflict';
    message: string;
    severity: 'error' | 'warning' | 'info';
    affectedItems: string[];
  }>;
  suggestions: string[];
}

export interface EquipmentGroup {
  equipments: string[];
  problems: string[];
  attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
  technicianId?: string;
  notes?: string;
}

class ConflictValidationService {
  /**
   * Valida conflitos ao criar múltiplas OS a partir de um agendamento
   */
  async validateMultipleOrderCreation(
    agendamento: AgendamentoAI,
    equipmentGroups: EquipmentGroup[],
    scheduledDate: string,
    scheduledTime: string
  ): Promise<ConflictValidationResult> {
    const result: ConflictValidationResult = {
      hasConflicts: false,
      conflicts: [],
      suggestions: []
    };

    try {
      // 1. Validar conflitos de horário
      await this.validateTimeConflicts(result, scheduledDate, scheduledTime, equipmentGroups);

      // 2. Validar conflitos de técnico
      await this.validateTechnicianConflicts(result, scheduledDate, scheduledTime, equipmentGroups);

      // 3. Validar compatibilidade de tipos de atendimento
      this.validateAttendanceTypeCompatibility(result, equipmentGroups, agendamento);

      // 4. Validar lógica de negócio
      this.validateBusinessLogic(result, equipmentGroups, agendamento);

      // 5. Gerar sugestões
      this.generateSuggestions(result, equipmentGroups, agendamento);

      result.hasConflicts = result.conflicts.some(c => c.severity === 'error');

    } catch (error) {
      console.error('Erro na validação de conflitos:', error);
      result.conflicts.push({
        type: 'equipment_conflict',
        message: 'Erro interno na validação. Verifique os dados e tente novamente.',
        severity: 'error',
        affectedItems: []
      });
      result.hasConflicts = true;
    }

    return result;
  }

  /**
   * Valida conflitos de horário com outras OS
   */
  private async validateTimeConflicts(
    result: ConflictValidationResult,
    scheduledDate: string,
    scheduledTime: string,
    equipmentGroups: EquipmentGroup[]
  ): Promise<void> {
    // Verificar se há OS já agendadas no mesmo horário
    const { data: existingOrders, error } = await supabase
      .from('service_orders')
      .select('id, client_name, technician_name, scheduled_time')
      .eq('scheduled_date', scheduledDate)
      .eq('scheduled_time', scheduledTime)
      .neq('status', 'cancelled');

    if (error) {
      console.warn('Erro ao verificar conflitos de horário:', error);
      return;
    }

    if (existingOrders && existingOrders.length > 0) {
      result.conflicts.push({
        type: 'time_conflict',
        message: `Já existem ${existingOrders.length} ordem(ns) de serviço agendada(s) para ${scheduledTime} em ${scheduledDate}`,
        severity: 'warning',
        affectedItems: existingOrders.map(o => `${o.client_name} (${o.technician_name || 'Sem técnico'})`)
      });
    }
  }

  /**
   * Valida conflitos de técnico
   */
  private async validateTechnicianConflicts(
    result: ConflictValidationResult,
    scheduledDate: string,
    scheduledTime: string,
    equipmentGroups: EquipmentGroup[]
  ): Promise<void> {
    const techniciansUsed = equipmentGroups
      .map(g => g.technicianId)
      .filter(Boolean) as string[];

    if (techniciansUsed.length === 0) return;

    // Verificar se os técnicos já têm agendamentos no mesmo horário
    const { data: technicianOrders, error } = await supabase
      .from('service_orders')
      .select('technician_id, technician_name, client_name')
      .eq('scheduled_date', scheduledDate)
      .eq('scheduled_time', scheduledTime)
      .in('technician_id', techniciansUsed)
      .neq('status', 'cancelled');

    if (error) {
      console.warn('Erro ao verificar conflitos de técnico:', error);
      return;
    }

    if (technicianOrders && technicianOrders.length > 0) {
      result.conflicts.push({
        type: 'technician_conflict',
        message: `Técnico(s) já possuem agendamentos no horário ${scheduledTime}`,
        severity: 'error',
        affectedItems: technicianOrders.map(o => `${o.technician_name} - ${o.client_name}`)
      });
    }
  }

  /**
   * Valida compatibilidade de tipos de atendimento
   */
  private validateAttendanceTypeCompatibility(
    result: ConflictValidationResult,
    equipmentGroups: EquipmentGroup[],
    agendamento: AgendamentoAI
  ): void {
    const attendanceTypes = equipmentGroups.map(g => g.attendanceType);
    const uniqueTypes = [...new Set(attendanceTypes)];

    // Verificar se há mistura de tipos incompatíveis
    const hasInHome = uniqueTypes.includes('em_domicilio');
    const hasPickup = uniqueTypes.some(t => t.startsWith('coleta'));

    if (hasInHome && hasPickup) {
      result.conflicts.push({
        type: 'logistics_conflict',
        message: 'Mistura de atendimento domiciliar e coleta pode gerar conflitos logísticos',
        severity: 'warning',
        affectedItems: uniqueTypes
      });

      result.suggestions.push(
        'Considere agrupar equipamentos por tipo de atendimento para otimizar a logística'
      );
    }

    // Verificar se o tipo original do agendamento é compatível
    const originalType = agendamento.tipo_servico;
    if (originalType === 'in-home' && hasPickup) {
      result.conflicts.push({
        type: 'equipment_conflict',
        message: 'Agendamento original era para atendimento domiciliar, mas alguns equipamentos foram marcados para coleta',
        severity: 'info',
        affectedItems: ['Tipo original: Em domicílio']
      });
    }
  }

  /**
   * Valida regras de negócio específicas
   */
  private validateBusinessLogic(
    result: ConflictValidationResult,
    equipmentGroups: EquipmentGroup[],
    agendamento: AgendamentoAI
  ): void {
    // Validar se há equipamentos duplicados
    const allEquipments = equipmentGroups.flatMap(g => g.equipments);
    const duplicates = allEquipments.filter((item, index) => allEquipments.indexOf(item) !== index);

    if (duplicates.length > 0) {
      result.conflicts.push({
        type: 'equipment_conflict',
        message: 'Equipamentos duplicados detectados',
        severity: 'error',
        affectedItems: [...new Set(duplicates)]
      });
    }

    // Validar se todos os equipamentos originais estão incluídos
    const originalEquipments = Array.isArray(agendamento.equipamentos)
      ? agendamento.equipamentos
      : [agendamento.equipamento].filter(Boolean);

    const missingEquipments = originalEquipments.filter(
      orig => !allEquipments.includes(orig)
    );

    if (missingEquipments.length > 0) {
      result.conflicts.push({
        type: 'equipment_conflict',
        message: 'Alguns equipamentos do agendamento original não foram incluídos',
        severity: 'warning',
        affectedItems: missingEquipments
      });
    }

    // Validar número máximo de OS por agendamento
    if (equipmentGroups.length > 5) {
      result.conflicts.push({
        type: 'logistics_conflict',
        message: 'Muitas ordens de serviço para um único agendamento podem complicar a gestão',
        severity: 'warning',
        affectedItems: [`${equipmentGroups.length} OS serão criadas`]
      });

      result.suggestions.push(
        'Considere agrupar equipamentos similares para reduzir o número de OS'
      );
    }
  }

  /**
   * Gera sugestões baseadas na análise
   */
  private generateSuggestions(
    result: ConflictValidationResult,
    equipmentGroups: EquipmentGroup[],
    agendamento: AgendamentoAI
  ): void {
    // Sugestão para agrupamento por tipo
    const typeGroups = new Map<string, number>();
    equipmentGroups.forEach(g => {
      const count = typeGroups.get(g.attendanceType) || 0;
      typeGroups.set(g.attendanceType, count + 1);
    });

    if (typeGroups.size > 1) {
      result.suggestions.push(
        `Você está criando OS com ${typeGroups.size} tipos diferentes de atendimento. Considere se isso é realmente necessário.`
      );
    }

    // Sugestão para urgência
    if (agendamento.urgente && equipmentGroups.length > 2) {
      result.suggestions.push(
        'Este é um agendamento urgente. Considere priorizar os equipamentos mais críticos.'
      );
    }

    // Sugestão para otimização
    if (equipmentGroups.length > 3) {
      result.suggestions.push(
        'Para otimizar o atendimento, considere agrupar equipamentos que podem ser atendidos pelo mesmo técnico.'
      );
    }
  }

  /**
   * 🎯 NOVA ARQUITETURA: Valida disponibilidade usando calendar_events (fonte única da verdade)
   */
  async validateTimeSlotAvailability(
    date: string,
    time: string,
    technicianId?: string
  ): Promise<boolean> {
    try {
      // Construir datetime para verificação
      const datetime = `${date}T${time}:00`;

      // 🎯 VERIFICAR NA NOVA TABELA calendar_events
      let query = supabase
        .from('calendar_events')
        .select('id')
        .eq('start_time', datetime)
        .neq('status', 'cancelled');

      if (technicianId) {
        query = query.eq('technician_id', technicianId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao verificar disponibilidade no calendário:', error);
        return false;
      }

      const isAvailable = !data || data.length === 0;

      if (!isAvailable) {
        console.log(`⚠️ Horário ${datetime} ocupado no calendário`);
      }

      return isAvailable;
    } catch (error) {
      console.error('Erro na validação de disponibilidade:', error);
      return false;
    }
  }
}

export const conflictValidationService = new ConflictValidationService();
