/**
 * 🎨 MAPEAMENTO DE STATUS PARA CORES DO CALENDÁRIO
 * 
 * FONTE ÚNICA DA VERDADE - Mapeia status da tabela calendar_events
 * para as cores e tipos usados pelos componentes do calendário
 */

import { CalendarEvent } from '@/hooks/calendar/useCalendarEvents';

// Tipos de status para compatibilidade com componentes existentes
export type CalendarEventStatus = 
  | 'suggested'     // 🔘 Cinza - Sugerido pela IA
  | 'confirmed'     // 🔵 Azul - Agendado/Confirmado
  | 'in_progress'   // 🟣 Roxo - À caminho/Em trânsito
  | 'at_workshop'   // 🟠 Laranja - Na oficina
  | 'diagnosis'     // 🔵 Ciano - Em diagnóstico
  | 'awaiting_approval' // 🟡 Amarelo - Aguardando aprovação
  | 'in_repair'     // 🟢 Verde - Em reparo
  | 'ready_delivery' // 🔷 Azul escuro - Pronto para entrega
  | 'completed'     // ✅ Verde escuro - Concluído
  | 'cancelled';    // 🔴 Vermelho - Cancelado

/**
 * Mapear status da tabela calendar_events para status do calendário
 */
export function mapCalendarEventStatus(status: CalendarEvent['status']): CalendarEventStatus {
  switch (status) {
    // 🔵 AZUL - Agendado/Confirmado
    case 'scheduled':
      return 'confirmed';

    // 🟣 ROXO - À caminho/Em trânsito
    case 'on_the_way':
      return 'in_progress';

    // 🔵 CIANO - Em diagnóstico
    case 'in_progress':
      return 'diagnosis';

    // 🟠 LARANJA - Na oficina
    case 'at_workshop':
      return 'at_workshop';

    // 🟡 AMARELO - Aguardando aprovação
    case 'awaiting_approval':
      return 'awaiting_approval';

    // 🟢 VERDE - Em reparo
    case 'in_repair':
      return 'in_repair';

    // 🔷 AZUL ESCURO - Pronto para entrega
    case 'ready_delivery':
      return 'ready_delivery';

    // ✅ VERDE ESCURO - Concluído
    case 'completed':
      return 'completed';

    // 🔴 VERMELHO - Cancelado
    case 'cancelled':
      return 'cancelled';

    // 🔵 AZUL - Padrão (agendado)
    default:
      return 'confirmed';
  }
}

/**
 * Obter cor do status para uso em componentes
 */
export function getStatusColor(status: CalendarEvent['status']): string {
  const mappedStatus = mapCalendarEventStatus(status);
  
  switch (mappedStatus) {
    case 'suggested':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'in_progress':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'at_workshop':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'diagnosis':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'awaiting_approval':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'in_repair':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'ready_delivery':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Obter texto descritivo do status
 */
export function getStatusText(status: CalendarEvent['status']): string {
  switch (status) {
    case 'scheduled':
      return 'Agendado';
    case 'on_the_way':
      return 'À caminho';
    case 'in_progress':
      return 'Em diagnóstico';
    case 'at_workshop':
      return 'Na oficina';
    case 'awaiting_approval':
      return 'Aguardando aprovação';
    case 'in_repair':
      return 'Em reparo';
    case 'ready_delivery':
      return 'Pronto para entrega';
    case 'completed':
      return 'Concluído';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Agendado';
  }
}

/**
 * Converter evento da nova estrutura para formato compatível com componentes existentes
 */
export function convertToLegacyCalendarEvent(event: CalendarEvent): any {
  return {
    id: event.id,
    title: event.clientName,
    startTime: event.startTime,
    endTime: event.endTime,
    clientName: event.clientName,
    technicianId: event.technicianId || '',
    technicianName: event.technicianName || 'Não atribuído',
    equipment: event.equipmentType || 'Não especificado',
    problem: event.description || 'Sem descrição',
    address: event.address,
    status: event.status, // ✅ Preservar status original para legendas contextuais
    serviceOrderId: event.serviceOrderId,
    finalCost: event.finalCost,
    clientPhone: event.clientPhone,
    eventType: event.eventType, // ✅ Campo que estava faltando!
    parentEventId: event.parentEventId, // ✅ Campo que estava faltando!

    // Propriedades adicionais
    isUrgent: event.isUrgent,
    logisticsGroup: event.logisticsGroup
  };
}

/**
 * Estatísticas de status para dashboards
 */
export function getStatusStats(events: CalendarEvent[]) {
  const stats = {
    scheduled: 0,
    on_the_way: 0,
    in_progress: 0,
    at_workshop: 0,
    awaiting_approval: 0,
    in_repair: 0,
    ready_delivery: 0,
    completed: 0,
    cancelled: 0,
    total: events.length
  };

  events.forEach(event => {
    if (stats.hasOwnProperty(event.status)) {
      stats[event.status as keyof typeof stats]++;
    }
  });

  return stats;
}

export default {
  mapCalendarEventStatus,
  getStatusColor,
  getStatusText,
  convertToLegacyCalendarEvent,
  getStatusStats
};
