/**
 * Utilitários para mapeamento e sincronização de status entre ServiceOrder e ScheduledService
 */

// Mapeamento de status ServiceOrder → ScheduledService
export const SERVICE_ORDER_TO_SCHEDULED_STATUS = {
  'pending': 'scheduled',
  'scheduled': 'scheduled',
  'on_the_way': 'in_progress',
  'in_progress': 'in_progress',
  'collected': 'in_progress',
  'at_workshop': 'in_progress',
  'received_at_workshop': 'in_progress',
  'in_repair': 'in_progress',
  'ready_for_delivery': 'in_progress',
  'collected_for_delivery': 'in_progress',
  'on_the_way_to_deliver': 'in_progress',
  'payment_pending': 'in_progress',
  'completed': 'completed',
  'cancelled': 'cancelled'
} as const;

// Mapeamento de status ScheduledService → ServiceOrder (para casos específicos)
export const SCHEDULED_TO_SERVICE_ORDER_STATUS = {
  'scheduled': 'scheduled',
  'in_progress': 'in_progress', // Mantém o status atual se já estiver em progresso
  'completed': 'completed',
  'cancelled': 'cancelled'
} as const;

// Status que indicam que uma ordem está ativa/em andamento
export const ACTIVE_ORDER_STATUSES = [
  'scheduled',
  'on_the_way', 
  'in_progress',
  'collected',
  'at_workshop',
  'received_at_workshop',
  'in_repair',
  'ready_for_delivery',
  'collected_for_delivery',
  'on_the_way_to_deliver',
  'payment_pending'
] as const;

// Status que indicam que uma ordem está agendada (próxima)
export const SCHEDULED_ORDER_STATUSES = [
  'scheduled'
] as const;

// Status que indicam que uma ordem está em progresso ativo
export const IN_PROGRESS_ORDER_STATUSES = [
  'on_the_way',
  'in_progress', 
  'collected',
  'at_workshop',
  'received_at_workshop',
  'in_repair',
  'ready_for_delivery',
  'collected_for_delivery',
  'on_the_way_to_deliver',
  'payment_pending'
] as const;

/**
 * Converte status de ServiceOrder para ScheduledService
 */
export const mapServiceOrderToScheduledStatus = (serviceOrderStatus: string): string => {
  return SERVICE_ORDER_TO_SCHEDULED_STATUS[serviceOrderStatus as keyof typeof SERVICE_ORDER_TO_SCHEDULED_STATUS] || 'scheduled';
};

/**
 * Converte status de ScheduledService para ServiceOrder (uso limitado)
 */
export const mapScheduledToServiceOrderStatus = (scheduledStatus: string): string => {
  return SCHEDULED_TO_SERVICE_ORDER_STATUS[scheduledStatus as keyof typeof SCHEDULED_TO_SERVICE_ORDER_STATUS] || 'scheduled';
};

/**
 * Verifica se uma ordem está ativa (aparece no dashboard)
 */
export const isActiveOrder = (status: string): boolean => {
  return ACTIVE_ORDER_STATUSES.includes(status as any);
};

/**
 * Verifica se uma ordem está agendada (próxima ordem)
 */
export const isScheduledOrder = (status: string): boolean => {
  return SCHEDULED_ORDER_STATUSES.includes(status as any);
};

/**
 * Verifica se uma ordem está em progresso ativo
 */
export const isInProgressOrder = (status: string): boolean => {
  return IN_PROGRESS_ORDER_STATUSES.includes(status as any);
};

/**
 * Obtém a prioridade de uma ordem para ordenação
 * Menor número = maior prioridade
 */
export const getOrderPriority = (status: string): number => {
  const priorityMap: Record<string, number> = {
    'in_progress': 1,
    'on_the_way': 2,
    'collected': 3,
    'at_workshop': 4,
    'in_repair': 5,
    'ready_for_delivery': 6,
    'collected_for_delivery': 7,
    'on_the_way_to_deliver': 8,
    'payment_pending': 9,
    'scheduled': 10,
    'pending': 11,
    'completed': 12,
    'cancelled': 13
  };
  
  return priorityMap[status] || 99;
};

/**
 * Ordena ordens por prioridade de status
 */
export const sortOrdersByPriority = <T extends { status: string }>(orders: T[]): T[] => {
  return [...orders].sort((a, b) => getOrderPriority(a.status) - getOrderPriority(b.status));
};

/**
 * Ordena ordens por prioridade híbrida: status primeiro, depois horário
 */
export const sortOrdersByHybridPriority = <T extends { status: string; scheduledDate?: string | null }>(orders: T[]): T[] => {
  return [...orders].sort((a, b) => {
    // Primeiro, comparar por prioridade de status
    const statusPriorityDiff = getOrderPriority(a.status) - getOrderPriority(b.status);

    // Se têm prioridades de status diferentes, usar essa diferença
    if (statusPriorityDiff !== 0) {
      return statusPriorityDiff;
    }

    // Se têm a mesma prioridade de status, ordenar por horário
    const aHasSchedule = a.scheduledDate;
    const bHasSchedule = b.scheduledDate;

    // Priorizar ordens com agendamento
    if (aHasSchedule && !bHasSchedule) return -1;
    if (!aHasSchedule && bHasSchedule) return 1;
    if (!aHasSchedule && !bHasSchedule) return 0;

    try {
      // Ordenar por horário de agendamento
      const aDate = new Date(a.scheduledDate!);
      const bDate = new Date(b.scheduledDate!);
      return aDate.getTime() - bDate.getTime();
    } catch (error) {
      console.warn('Erro ao ordenar por horário na prioridade híbrida:', error);
      return 0;
    }
  });
};
