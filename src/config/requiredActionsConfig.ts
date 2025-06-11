/**
 * Configurações das ações obrigatórias por transição de status
 */

import { StatusTransitionConfig } from '@/types/requiredActions';

export const REQUIRED_ACTIONS_CONFIG: StatusTransitionConfig[] = [
  // FASE 1: Foto do equipamento coletado (REQUISITO IDENTIFICADO)
  {
    fromStatus: 'on_the_way',
    toStatus: 'collected',
    attendanceTypes: ['coleta_conserto'],
    title: 'Equipamento Coletado',
    description: 'Registre a coleta do equipamento com uma foto para documentação',
    allowSkip: true,
    skipReason: 'Permitir pular em casos de adversidade (ex: cliente ausente, equipamento muito grande)',
    requiredActions: [
      {
        type: 'photo',
        label: 'Foto do Equipamento Coletado',
        placeholder: 'Tire uma foto clara do equipamento coletado',
        required: true,
        maxPhotos: 3,
        validation: (photos: File[]) => photos && photos.length > 0
      },
      {
        type: 'text',
        label: 'Estado do Equipamento',
        placeholder: 'Descreva o estado visual do equipamento (riscos, danos, etc.)',
        required: false,
        minLength: 10
      },
      {
        type: 'selection',
        label: 'Condição Geral',
        required: true,
        options: ['Excelente', 'Bom', 'Regular', 'Ruim', 'Muito Danificado'],
        validation: (value: string) => value && value.length > 0
      }
    ]
  },
  
  // Coleta para diagnóstico
  {
    fromStatus: 'on_the_way',
    toStatus: 'collected_for_diagnosis',
    attendanceTypes: ['coleta_diagnostico'],
    title: 'Equipamento Coletado para Diagnóstico',
    description: 'Registre a coleta do equipamento que será diagnosticado',
    allowSkip: true,
    skipReason: 'Permitir pular em casos de adversidade',
    requiredActions: [
      {
        type: 'photo',
        label: 'Foto do Equipamento Coletado',
        placeholder: 'Tire uma foto clara do equipamento coletado',
        required: true,
        maxPhotos: 3,
        validation: (photos: File[]) => photos && photos.length > 0
      },
      {
        type: 'text',
        label: 'Problema Relatado pelo Cliente',
        placeholder: 'Descreva o problema relatado pelo cliente',
        required: true,
        minLength: 10
      },
      {
        type: 'selection',
        label: 'Condição Geral',
        required: true,
        options: ['Excelente', 'Bom', 'Regular', 'Ruim', 'Muito Danificado']
      }
    ]
  },

  // NOVA: Documentação inicial do serviço em domicílio
  {
    fromStatus: 'scheduled',
    toStatus: 'in_progress',
    attendanceTypes: ['em_domicilio'],
    title: 'Início do Atendimento',
    description: 'Documente o estado inicial do equipamento antes de iniciar o serviço',
    allowSkip: true,
    skipReason: 'Permitir pular em casos de urgência ou equipamento já conhecido',
    requiredActions: [
      {
        type: 'photo',
        label: 'Fotos do Estado Inicial',
        placeholder: 'Tire fotos do equipamento antes de iniciar o reparo',
        required: true,
        maxPhotos: 3,
        validation: (photos: File[]) => photos && photos.length > 0
      },
      {
        type: 'text',
        label: 'Problema Identificado',
        placeholder: 'Descreva o problema identificado no local',
        required: true,
        minLength: 10
      },
      {
        type: 'selection',
        label: 'Complexidade do Serviço',
        required: true,
        options: ['Simples', 'Médio', 'Complexo', 'Muito Complexo']
      }
    ]
  },

  // MELHORADA: Relatório de serviço em domicílio com fotos obrigatórias
  {
    fromStatus: 'in_progress',
    toStatus: 'payment_pending',
    attendanceTypes: ['em_domicilio'],
    title: 'Serviço Concluído',
    description: 'Documente o serviço realizado antes de solicitar o pagamento',
    allowSkip: true,
    skipReason: 'Permitir pular se houver urgência ou problema técnico',
    requiredActions: [
      {
        type: 'photo',
        label: 'Fotos do Resultado Final',
        placeholder: 'Tire fotos do equipamento após o reparo',
        required: true,
        maxPhotos: 5,
        validation: (photos: File[]) => photos && photos.length > 0
      },
      {
        type: 'text',
        label: 'Relatório do Serviço',
        placeholder: 'Descreva detalhadamente o serviço realizado, peças trocadas, etc.',
        required: true,
        minLength: 20
      },
      {
        type: 'selection',
        label: 'Status do Reparo',
        required: true,
        options: ['Totalmente Reparado', 'Parcialmente Reparado', 'Necessita Peças', 'Não Reparável']
      }
    ]
  },

  // NOVA: Documentação final para serviços em domicílio (direto para completed)
  {
    fromStatus: 'in_progress',
    toStatus: 'completed',
    attendanceTypes: ['em_domicilio'],
    title: 'Finalização do Serviço',
    description: 'Documente a conclusão completa do serviço',
    allowSkip: true,
    skipReason: 'Permitir pular se pagamento já foi processado',
    requiredActions: [
      {
        type: 'photo',
        label: 'Fotos Finais do Equipamento',
        placeholder: 'Tire fotos finais do equipamento funcionando',
        required: true,
        maxPhotos: 3,
        validation: (photos: File[]) => photos && photos.length > 0
      },
      {
        type: 'text',
        label: 'Confirmação de Funcionamento',
        placeholder: 'Confirme que o equipamento está funcionando corretamente',
        required: true,
        minLength: 10
      },
      {
        type: 'selection',
        label: 'Satisfação do Cliente',
        required: true,
        options: ['Muito Satisfeito', 'Satisfeito', 'Neutro', 'Insatisfeito', 'Muito Insatisfeito']
      }
    ]
  },

  // FASE 1: Confirmação de pagamento
  {
    fromStatus: 'payment_pending',
    toStatus: 'completed',
    attendanceTypes: ['em_domicilio', 'coleta_conserto', 'coleta_diagnostico'],
    title: 'Pagamento Confirmado',
    description: 'Confirme o recebimento do pagamento',
    allowSkip: true,
    skipReason: 'Permitir pular se pagamento será processado posteriormente',
    requiredActions: [
      {
        type: 'selection',
        label: 'Método de Pagamento',
        required: true,
        options: ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX', 'Transferência', 'A Prazo']
      },
      {
        type: 'text',
        label: 'Valor Recebido',
        placeholder: 'Ex: R$ 150,00',
        required: true,
        minLength: 3,
        validation: (value: string) => {
          // Validação básica de valor monetário
          const cleanValue = value.replace(/[^\d,]/g, '');
          return cleanValue.length > 0;
        }
      },
      {
        type: 'text',
        label: 'Observações do Pagamento',
        placeholder: 'Observações adicionais sobre o pagamento (opcional)',
        required: false
      }
    ]
  },

  // NOVA: Documentação de entrega para coletas
  {
    fromStatus: 'collected_for_delivery',
    toStatus: 'delivered',
    attendanceTypes: ['coleta_conserto', 'coleta_diagnostico'],
    title: 'Equipamento Entregue',
    description: 'Documente a entrega do equipamento ao cliente',
    allowSkip: true,
    skipReason: 'Permitir pular em casos de urgência ou cliente ausente',
    requiredActions: [
      {
        type: 'photo',
        label: 'Foto da Entrega',
        placeholder: 'Tire uma foto do equipamento sendo entregue',
        required: true,
        maxPhotos: 2,
        validation: (photos: File[]) => photos && photos.length > 0
      },
      {
        type: 'text',
        label: 'Confirmação de Entrega',
        placeholder: 'Confirme que o cliente recebeu o equipamento em bom estado',
        required: true,
        minLength: 10
      },
      {
        type: 'selection',
        label: 'Estado do Cliente',
        required: true,
        options: ['Muito Satisfeito', 'Satisfeito', 'Neutro', 'Insatisfeito']
      }
    ]
  },

  // NOVA: Documentação de equipamento na oficina
  {
    fromStatus: 'collected',
    toStatus: 'at_workshop',
    attendanceTypes: ['coleta_conserto'],
    title: 'Equipamento na Oficina',
    description: 'Registre a chegada do equipamento na oficina',
    allowSkip: true,
    skipReason: 'Permitir pular se equipamento já foi registrado',
    requiredActions: [
      {
        type: 'photo',
        label: 'Foto do Equipamento na Oficina',
        placeholder: 'Tire uma foto do equipamento na bancada da oficina',
        required: false,
        maxPhotos: 2
      },
      {
        type: 'text',
        label: 'Observações da Oficina',
        placeholder: 'Observações sobre o estado do equipamento na oficina',
        required: false,
        minLength: 5
      }
    ]
  }
];

/**
 * Busca a configuração de ação obrigatória para uma transição específica
 */
export const getRequiredActionConfig = (
  fromStatus: string, 
  toStatus: string, 
  attendanceType: string
): StatusTransitionConfig | null => {
  return REQUIRED_ACTIONS_CONFIG.find(config => 
    config.fromStatus === fromStatus && 
    config.toStatus === toStatus && 
    config.attendanceTypes.includes(attendanceType)
  ) || null;
};

/**
 * Verifica se uma transição requer ações obrigatórias
 */
export const requiresActions = (
  fromStatus: string, 
  toStatus: string, 
  attendanceType: string
): boolean => {
  return getRequiredActionConfig(fromStatus, toStatus, attendanceType) !== null;
};
