/**
 * Utilitários para gerenciar o fluxo de status das ordens de serviço
 * Define os diferentes fluxos de trabalho para cada tipo de atendimento
 */

// Interface para um passo no fluxo de serviço
export interface ServiceFlowStep {
  status: string;
  label: string;
  description: string;
  color: string;
  icon?: string;
  actions?: {
    label: string;
    action: string;
    requiresConfirmation?: boolean;
    confirmationMessage?: string;
  }[];
}

// Fluxo para atendimento em domicílio - CONFORME DOCUMENTAÇÃO OFICIAL (SEM PENDENTE)
const inHomeServiceFlow: ServiceFlowStep[] = [
  {
    status: 'scheduled',
    label: 'Agendado',
    description: 'Visita agendada com o cliente',
    color: 'blue',
  },
  {
    status: 'on_the_way',
    label: 'A Caminho',
    description: 'Técnico a caminho do local',
    color: 'indigo',
  },
  {
    status: 'in_progress',
    label: 'Em Andamento',
    description: 'Serviço sendo executado',
    color: 'yellow',
  },
  {
    status: 'completed',
    label: 'Concluído',
    description: 'Serviço finalizado com sucesso (com pagamento)',
    color: 'green',
    actions: [
      {
        label: 'Ativar Garantia',
        action: 'activate_warranty',
        requiresConfirmation: true,
        confirmationMessage: 'Isso irá ativar a garantia para esta ordem de serviço. Deseja continuar?'
      }
    ]
  },
  {
    status: 'cancelled',
    label: 'Cancelado',
    description: 'Serviço cancelado',
    color: 'red',
  }
];

// Fluxo para coleta e conserto (com orçamento fechado) - CONFORME DOCUMENTAÇÃO OFICIAL (SEM PENDENTE)
const pickupRepairServiceFlow: ServiceFlowStep[] = [
  {
    status: 'scheduled',
    label: 'Coleta Agendada',
    description: 'Agendamento da coleta do equipamento',
    color: 'blue',
  },
  {
    status: 'on_the_way',
    label: 'A Caminho',
    description: 'Técnico a caminho para coletar o equipamento',
    color: 'indigo',
  },
  {
    status: 'collected',
    label: 'Coletado',
    description: 'Equipamento coletado',
    color: 'purple',
  },
  {
    status: 'at_workshop',
    label: 'Na Oficina',
    description: 'Equipamento deixado na oficina',
    color: 'cyan',
  },
  {
    status: 'in_repair',
    label: 'Em Reparo',
    description: 'Serviço sendo executado',
    color: 'yellow',
  },
  {
    status: 'ready_for_delivery',
    label: 'Pronto para Entrega',
    description: 'Reparo concluído, aguardando coleta para entrega',
    color: 'teal',
  },
  {
    status: 'collected_for_delivery',
    label: 'Coletado na Oficina',
    description: 'Equipamento coletado na oficina para entrega',
    color: 'emerald',
  },
  {
    status: 'on_the_way_to_deliver',
    label: 'Em Rota de Entrega',
    description: 'Em rota para entrega ao cliente',
    color: 'lime',
  },
  {
    status: 'payment_pending',
    label: 'Pagamento Pendente',
    description: 'Aguardando confirmação do pagamento',
    color: 'orange',
  },
  {
    status: 'completed',
    label: 'Concluído',
    description: 'Serviço finalizado com sucesso',
    color: 'green',
    actions: [
      {
        label: 'Ativar Garantia',
        action: 'activate_warranty',
        requiresConfirmation: true,
        confirmationMessage: 'Isso irá ativar a garantia para esta ordem de serviço. Deseja continuar?'
      }
    ]
  },
  {
    status: 'cancelled',
    label: 'Cancelado',
    description: 'Serviço cancelado',
    color: 'red',
  }
];

// Fluxo para coleta e diagnóstico (com orçamento posterior) - CONFORME DOCUMENTAÇÃO OFICIAL (SEM PENDENTE)
const pickupDiagnosisServiceFlow: ServiceFlowStep[] = [
  {
    status: 'scheduled',
    label: 'Coleta Agendada',
    description: 'Agendamento da coleta do equipamento',
    color: 'blue',
  },
  {
    status: 'on_the_way',
    label: 'A Caminho',
    description: 'Técnico a caminho para coletar o equipamento',
    color: 'indigo',
  },
  {
    status: 'collected_for_diagnosis',
    label: 'Coletado para Diagnóstico',
    description: 'Equipamento coletado para diagnóstico',
    color: 'purple',
  },
  {
    status: 'at_workshop',
    label: 'Na Oficina',
    description: 'Equipamento deixado na oficina',
    color: 'cyan',
  },
  {
    status: 'diagnosis_completed',
    label: 'Diagnóstico Concluído',
    description: 'Diagnóstico realizado, aguardando aprovação do cliente',
    color: 'orange',
  },
  {
    status: 'ready_for_delivery',
    label: 'Pronto para Entrega',
    description: 'Diagnóstico concluído, aguardando coleta para entrega',
    color: 'teal',
  },
  {
    status: 'collected_for_delivery',
    label: 'Coletado na Oficina',
    description: 'Equipamento coletado na oficina para entrega',
    color: 'emerald',
  },
  {
    status: 'on_the_way_to_deliver',
    label: 'Em Rota de Entrega',
    description: 'Em rota para entrega ao cliente',
    color: 'lime',
  },
  {
    status: 'payment_pending',
    label: 'Pagamento Pendente',
    description: 'Aguardando confirmação do pagamento',
    color: 'orange',
  },
  {
    status: 'completed',
    label: 'Concluído',
    description: 'Serviço concluído e confirmado pelo cliente',
    color: 'green',
    actions: [
      {
        label: 'Ativar Garantia',
        action: 'activate_warranty',
        requiresConfirmation: true,
        confirmationMessage: 'Isso irá ativar a garantia para esta ordem de serviço. Deseja continuar?'
      }
    ]
  },
  {
    status: 'cancelled',
    label: 'Cancelado',
    description: 'Serviço cancelado',
    color: 'red',
  }
];

// Fluxo para ordens de serviço em garantia
const warrantyServiceFlow: ServiceFlowStep[] = [
  {
    status: 'warranty_pending',
    label: 'Garantia Pendente',
    description: 'Solicitação de garantia criada, aguardando aprovação',
    color: 'blue',
  },
  {
    status: 'warranty_approved',
    label: 'Garantia Aprovada',
    description: 'Garantia aprovada, aguardando atendimento',
    color: 'green',
  },
  {
    status: 'warranty_in_progress',
    label: 'Em Atendimento',
    description: 'Atendimento em garantia em andamento',
    color: 'yellow',
  },
  {
    status: 'warranty_completed',
    label: 'Concluído',
    description: 'Atendimento em garantia concluído',
    color: 'green',
  },
  {
    status: 'warranty_rejected',
    label: 'Garantia Rejeitada',
    description: 'Solicitação de garantia rejeitada',
    color: 'red',
  }
];

/**
 * Obtém o fluxo de serviço com base no tipo de atendimento
 * @param attendanceType Tipo de atendimento
 * @returns Array de passos do fluxo de serviço
 */
export const getServiceFlow = (attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico' | 'warranty'): ServiceFlowStep[] => {
  switch (attendanceType) {
    case 'em_domicilio':
      return inHomeServiceFlow;
    case 'coleta_conserto':
      return pickupRepairServiceFlow;
    case 'coleta_diagnostico':
      return pickupDiagnosisServiceFlow;
    case 'warranty':
      return warrantyServiceFlow;
    default:
      return inHomeServiceFlow;
  }
};

/**
 * Verifica se um status é um status final (concluído ou cancelado)
 * @param status Status a ser verificado
 * @returns Verdadeiro se for um status final
 */
export const isFinalStatus = (status: string): boolean => {
  const finalStatuses = ['completed', 'cancelled', 'quote_rejected', 'warranty_completed', 'warranty_rejected'];
  return finalStatuses.includes(status);
};

/**
 * Verifica se um status é um status de conclusão (que ativa a garantia)
 * @param status Status a ser verificado
 * @returns Verdadeiro se for um status de conclusão
 */
export const isCompletionStatus = (status: string): boolean => {
  return status === 'completed' || status === 'warranty_completed';
};

/**
 * Obtém o índice do status atual no fluxo
 * @param currentStatus Status atual
 * @param attendanceType Tipo de atendimento
 * @returns Índice do status atual ou -1 se não encontrado
 */
export const getCurrentStepIndex = (currentStatus: string, attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico' | 'warranty'): number => {
  const flow = getServiceFlow(attendanceType);
  return flow.findIndex(step => step.status === currentStatus);
};

/**
 * Obtém o próximo status no fluxo
 * @param currentStatus Status atual
 * @param attendanceType Tipo de atendimento
 * @returns Próximo status ou null se não houver próximo
 */
export const getNextStatus = (currentStatus: string, attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico' | 'warranty'): string | null => {
  const flow = getServiceFlow(attendanceType);
  const currentIndex = getCurrentStepIndex(currentStatus, attendanceType);

  if (currentIndex === -1 || currentIndex === flow.length - 1) {
    return null;
  }

  return flow[currentIndex + 1].status;
};

/**
 * Obtém o status anterior no fluxo
 * @param currentStatus Status atual
 * @param attendanceType Tipo de atendimento
 * @returns Status anterior ou null se não houver anterior
 */
export const getPreviousStatus = (currentStatus: string, attendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico' | 'warranty'): string | null => {
  const flow = getServiceFlow(attendanceType);
  const currentIndex = getCurrentStepIndex(currentStatus, attendanceType);

  if (currentIndex === -1 || currentIndex === 0) {
    return null;
  }

  return flow[currentIndex - 1].status;
};

/**
 * Obtém a classe de cor para um status específico
 * @param status Status para o qual obter a cor
 * @returns Classe CSS para a cor do status
 */
export const getStatusColor = (status: string): string => {
  // Primeiro, procurar em todos os fluxos de serviço
  const allFlows = [
    ...inHomeServiceFlow,
    ...pickupRepairServiceFlow,
    ...pickupDiagnosisServiceFlow,
    ...warrantyServiceFlow
  ];

  const step = allFlows.find(step => step.status === status);

  if (!step) {
    return 'bg-gray-100 text-gray-800'; // Cor padrão para status desconhecidos
  }

  // Mapear cores para classes do Tailwind
  switch (step.color) {
    case 'gray': return 'bg-gray-100 text-gray-800';
    case 'blue': return 'bg-blue-100 text-blue-800';
    case 'green': return 'bg-green-100 text-green-800';
    case 'red': return 'bg-red-100 text-red-800';
    case 'yellow': return 'bg-yellow-100 text-yellow-800';
    case 'purple': return 'bg-purple-100 text-purple-800';
    case 'indigo': return 'bg-indigo-100 text-indigo-800';
    case 'teal': return 'bg-teal-100 text-teal-800';
    case 'cyan': return 'bg-cyan-100 text-cyan-800';
    case 'orange': return 'bg-orange-100 text-orange-800';
    case 'amber': return 'bg-amber-100 text-amber-800';
    case 'lime': return 'bg-lime-100 text-lime-800';
    case 'emerald': return 'bg-emerald-100 text-emerald-800';
    case 'pink': return 'bg-pink-100 text-pink-800';
    case 'rose': return 'bg-rose-100 text-rose-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
