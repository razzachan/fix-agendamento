import { useState, useEffect, useCallback } from 'react';
import {
  CalendarSlot,
  TechnicianSchedule,
  SlotUpdatePayload
} from '@/types/calendar';
import { calendarService } from '@/services/calendar/CalendarService';
import { AgendamentoAI } from '@/services/agendamentos';
import { ServiceOrder } from '@/types';

interface UseCalendarScheduleProps {
  date: Date;
  technicianId: string;
  technicianName: string;
  agendamentos: AgendamentoAI[];
  serviceOrders: ServiceOrder[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseCalendarScheduleReturn {
  schedule: TechnicianSchedule | null;
  loading: boolean;
  error: string | null;

  // Actions
  updateSlotStatus: (payload: SlotUpdatePayload) => void;
  refreshSchedule: () => void;
  findAvailableSlots: (duration?: number) => CalendarSlot[];

  // Computed values
  workloadPercentage: number;
  totalOccupiedSlots: number;
  totalAvailableSlots: number;
  hasConflicts: boolean;
}

export const useCalendarSchedule = ({
  date,
  technicianId,
  technicianName,
  agendamentos,
  serviceOrders,
  autoRefresh = true,
  refreshInterval = 30000 // 30 segundos
}: UseCalendarScheduleProps): UseCalendarScheduleReturn => {
  const [schedule, setSchedule] = useState<TechnicianSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para criar agendamentos de teste para verificar o sistema
  const createTestAppointments = useCallback((originalAgendamentos: AgendamentoAI[]): AgendamentoAI[] => {
    // Se for o Pedro Santos, vamos criar alguns agendamentos de teste
    if (technicianId === '00000000-0000-0000-0000-000000000201') {
      const testDate = new Date(date);

      const testAppointments: AgendamentoAI[] = [
        {
          id: 999,
          nome: 'João Santos (TESTE)',
          telefone: '(48) 99999-9999',
          endereco: 'Endereço de teste',
          data_agendada: new Date(testDate.setHours(9, 0, 0, 0)).toISOString(),
          status: 'confirmado',
          urgente: false,
          tipo_servico: 'in-home',
          created_at: new Date().toISOString(),
          ordem_servico_id: 'OS-TESTE-001' // Simular OS
        },
        {
          id: 998,
          nome: 'Maria Silva (TESTE)',
          telefone: '(48) 99999-8888',
          endereco: 'Outro endereço de teste',
          data_agendada: new Date(testDate.setHours(10, 30, 0, 0)).toISOString(), // 10:30 -> deve ir para slot 10:00-11:00
          status: 'roteirizado',
          urgente: true,
          tipo_servico: 'in-home',
          created_at: new Date().toISOString()
        },
        {
          id: 997,
          nome: 'Pedro Costa (TESTE)',
          telefone: '(48) 99999-7777',
          endereco: 'Terceiro endereço de teste',
          data_agendada: new Date(testDate.setHours(14, 45, 0, 0)).toISOString(), // 14:45 -> deve ir para slot 14:00-15:00
          status: 'confirmado',
          urgente: false,
          tipo_servico: 'coleta',
          created_at: new Date().toISOString(),
          ordem_servico_id: 'OS-TESTE-002' // Simular OS
        }
      ];

      console.log('🧪 [createTestAppointments] Adicionando agendamentos de teste para Pedro Santos');
      return [...originalAgendamentos, ...testAppointments];
    }

    return originalAgendamentos;
  }, [technicianId, date]);

  // Função para gerar/atualizar a agenda
  const generateSchedule = useCallback(() => {
    try {
      setLoading(true);
      setError(null);

      // Adicionar agendamentos de teste se necessário
      const agendamentosComTeste = createTestAppointments(agendamentos);

      console.log('🗓️ Gerando agenda para:', {
        date: date.toISOString(),
        technicianId,
        technicianName,
        agendamentosCount: agendamentos.length,
        agendamentosComTesteCount: agendamentosComTeste.length,
        serviceOrdersCount: serviceOrders.length
      });

      const newSchedule = calendarService.generateTechnicianSchedule(
        date,
        technicianId,
        technicianName,
        agendamentosComTeste,
        serviceOrders
      );

      setSchedule(newSchedule);

      console.log('✅ Agenda gerada com sucesso:', {
        totalSlots: newSchedule.slots.length,
        occupiedSlots: newSchedule.totalOccupiedSlots,
        availableSlots: newSchedule.totalAvailableSlots,
        workload: newSchedule.workload
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('❌ Erro ao gerar agenda:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [date, technicianId, technicianName, agendamentos, serviceOrders, createTestAppointments]);

  // Atualizar status de um slot
  const updateSlotStatus = useCallback((payload: SlotUpdatePayload) => {
    if (!schedule) return;

    console.log('🔄 Atualizando status do slot:', payload);

    const updatedSlots = calendarService.updateSlotStatus(schedule.slots, payload);

    const updatedSchedule: TechnicianSchedule = {
      ...schedule,
      slots: updatedSlots,
      totalOccupiedSlots: updatedSlots.filter(s => s.status !== 'livre' && !s.isLunchTime).length,
      totalAvailableSlots: updatedSlots.filter(s => s.status === 'livre').length
    };

    // Recalcular workload
    updatedSchedule.workload = Math.round(
      (updatedSchedule.totalOccupiedSlots / 8) * 100 // 8 slots máximos por dia
    );

    setSchedule(updatedSchedule);
  }, [schedule]);

  // Encontrar slots disponíveis
  const findAvailableSlots = useCallback((duration: number = 60): CalendarSlot[] => {
    if (!schedule) return [];
    return calendarService.findAvailableSlots(schedule, duration);
  }, [schedule]);

  // Refresh manual
  const refreshSchedule = useCallback(() => {
    generateSchedule();
  }, [generateSchedule]);

  // Efeito para gerar agenda inicial e quando dependências mudarem
  useEffect(() => {
    generateSchedule();
  }, [generateSchedule]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh da agenda');
      generateSchedule();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, generateSchedule]);

  // Computed values
  const workloadPercentage = schedule?.workload || 0;
  const totalOccupiedSlots = schedule?.totalOccupiedSlots || 0;
  const totalAvailableSlots = schedule?.totalAvailableSlots || 0;

  // Detectar conflitos (múltiplos agendamentos no mesmo slot)
  const hasConflicts = schedule?.slots.some(slot => {
    const appointmentsInSlot = agendamentos.filter(agendamento => {
      if (!agendamento.data_agendada) return false;
      // Lógica para detectar múltiplos agendamentos no mesmo horário
      return false; // Implementar conforme necessário
    });
    return appointmentsInSlot.length > 1;
  }) || false;

  return {
    schedule,
    loading,
    error,

    // Actions
    updateSlotStatus,
    refreshSchedule,
    findAvailableSlots,

    // Computed values
    workloadPercentage,
    totalOccupiedSlots,
    totalAvailableSlots,
    hasConflicts
  };
};
