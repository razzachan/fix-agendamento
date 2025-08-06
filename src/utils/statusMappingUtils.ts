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
  'diagnosis_completed': 'in_progress',
  'awaiting_quote_approval': 'in_progress',
  'quote_approved': 'in_progress',
  'quote_rejected': 'cancelled',
  'in_repair': 'in_progress',
  'ready_for_delivery': 'ready_delivery',
  'delivery_scheduled': 'ready_delivery', // ✅ NOVO: Entrega agendada
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
  'diagnosis_completed',
  'awaiting_quote_approval',
  'quote_approved',
  'in_repair',
  'ready_for_delivery',
  'delivery_scheduled',
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
  'diagnosis_completed',
  'awaiting_quote_approval',
  'quote_approved',
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

// Status que indicam que uma ordem está ativa PARA O TÉCNICO (dashboard)
export const TECHNICIAN_ACTIVE_ORDER_STATUSES = [
  'scheduled',
  'on_the_way',
  'in_progress',
  'delivery_scheduled',     // Entrega agendada - aparece para o técnico responsável pela entrega
  'collected_for_delivery', // Coletado para entrega - em rota
  'on_the_way_to_deliver'   // ✅ NOVO: Em rota de entrega - técnico ainda responsável
  // 'collected' NÃO está aqui - quando coletado, sai do dashboard do técnico
] as const;

/**
 * Verifica se uma ordem está ativa para o técnico (aparece no dashboard)
 * Diferente de isActiveOrder - exclui 'collected' e outros status pós-coleta
 */
export const isTechnicianActiveOrder = (status: string): boolean => {
  return TECHNICIAN_ACTIVE_ORDER_STATUSES.includes(status as any);
};

/**
 * Obtém a prioridade de uma ordem para ordenação
 * Menor número = maior prioridade
 */
export const getOrderPriority = (status: string): number => {
  const priorityMap: Record<string, number> = {
    'in_progress': 1,
    'on_the_way': 2,
    'scheduled': 3,        // Agendado tem prioridade alta
    'pending': 4,
    'diagnosis_completed': 10,
    'awaiting_quote_approval': 11,  // Prioridade alta - precisa de ação
    'quote_approved': 12,
    'collected': 50,       // Coletado vai para o final (baixa prioridade)
    'at_workshop': 51,
    'in_repair': 52,
    'ready_for_delivery': 53,
    'collected_for_delivery': 54,
    'on_the_way_to_deliver': 55,
    'payment_pending': 56,
    'completed': 90,
    'cancelled': 91,
    'quote_rejected': 92
  };

  return priorityMap[status] || 99;
};

/**
 * Obtém a prioridade específica para o dashboard do técnico
 * Ordens coletadas têm prioridade muito baixa (quase saem da lista)
 */
export const getTechnicianOrderPriority = (status: string): number => {
  const priorityMap: Record<string, number> = {
    'in_progress': 1,      // Máxima prioridade
    'on_the_way': 2,
    'on_the_way_to_deliver': 2, // ✅ NOVO: Em rota de entrega - mesma prioridade que on_the_way
    'collected_for_delivery': 3, // Em rota de entrega - alta prioridade
    'delivery_scheduled': 4, // Entrega agendada - precisa coletar na oficina
    'scheduled': 5,
    'pending': 6,
    'collected': 100,      // Prioridade muito baixa - quase invisível
    'at_workshop': 101,
    'completed': 200,
    'cancelled': 201
  };

  return priorityMap[status] || 999;
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

/**
 * Ordena ordens especificamente para o dashboard do técnico
 * Ordens coletadas vão para o final, próximas ordens sobem
 */
export const sortTechnicianOrdersByPriority = <T extends { status: string; scheduledDate?: string | null }>(orders: T[]): T[] => {
  return [...orders].sort((a, b) => {
    // Usar prioridade específica do técnico
    const statusPriorityDiff = getTechnicianOrderPriority(a.status) - getTechnicianOrderPriority(b.status);

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
      console.warn('Erro ao ordenar por horário na prioridade do técnico:', error);
      return 0;
    }
  });
};
