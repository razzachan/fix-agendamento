/**
 * Utilitários para formatação consistente de notificações
 */

import { getDisplayNumber } from './orderNumberUtils';

/**
 * Formata o número da ordem para notificações
 */
export function formatOrderNumberForNotification(order: any): string {
  if (order.order_number) {
    return order.order_number;
  }
  
  // Usar getDisplayNumber se disponível
  const displayNumber = getDisplayNumber(order);
  if (displayNumber && displayNumber !== '#---' && displayNumber !== 'OS #---') {
    return displayNumber;
  }
  
  // Fallback: ID abreviado
  return `#${order.id?.substring(0, 3).toUpperCase() || 'N/A'}`;
}

/**
 * Formata informações do equipamento para notificações
 */
export function formatEquipmentForNotification(order: any): string {
  const type = order.equipment_type || order.equipmentType || 'Equipamento';
  const model = order.equipment_model || order.equipmentModel || order.model || '';
  
  return model ? `${type} ${model}` : type;
}

/**
 * Formata nome do cliente para notificações
 */
export function formatClientNameForNotification(order: any): string {
  return order.client_name || order.clientName || order.customer_name || 'Cliente';
}

/**
 * Formata nome do técnico para notificações
 */
export function formatTechnicianNameForNotification(order: any, context?: any): string {
  return context?.technicianName || 
         order.technician_name || 
         order.technicianName || 
         'Técnico';
}

/**
 * Formata endereço para notificações
 */
export function formatAddressForNotification(order: any): string {
  return order.client_address || 
         order.clientAddress || 
         order.address || 
         'Endereço não informado';
}

/**
 * Cria uma notificação formatada para mudança de status
 */
export function createStatusChangeNotification(
  order: any,
  newStatus: string,
  context?: any
): { title: string; description: string } {
  const orderNumber = formatOrderNumberForNotification(order);
  const equipment = formatEquipmentForNotification(order);
  const clientName = formatClientNameForNotification(order);
  const technicianName = formatTechnicianNameForNotification(order, context);

  const statusMessages: Record<string, { title: string; description: string }> = {
    'scheduled': {
      title: '📅 Serviço Agendado',
      description: `Seu ${equipment} foi agendado para atendimento. ${orderNumber}`
    },
    'in_progress': {
      title: '🔧 Serviço Iniciado',
      description: `O técnico ${technicianName} iniciou o atendimento do seu ${equipment}. ${orderNumber}`
    },
    'diagnosis': {
      title: '🔍 Diagnóstico em Andamento',
      description: `Seu ${equipment} está sendo diagnosticado pelo técnico ${technicianName}. ${orderNumber}`
    },
    'awaiting_approval': {
      title: '⏳ Aguardando Aprovação',
      description: `Diagnóstico concluído para seu ${equipment}. Aguardando sua aprovação do orçamento. ${orderNumber}`
    },
    'repair': {
      title: '🔨 Em Reparo',
      description: `Seu ${equipment} está sendo reparado na oficina. ${orderNumber}`
    },
    'testing': {
      title: '🧪 Em Teste',
      description: `Reparo concluído! Seu ${equipment} está sendo testado. ${orderNumber}`
    },
    'completed': {
      title: '✅ Serviço Concluído',
      description: `Seu ${equipment} foi reparado com sucesso! ${orderNumber}`
    },
    'ready_for_delivery': {
      title: '📦 Pronto para Entrega',
      description: `Seu ${equipment} está pronto para entrega! ${orderNumber}`
    },
    'delivered': {
      title: '🎉 Equipamento Entregue',
      description: `Seu ${equipment} foi entregue com sucesso! ${orderNumber}`
    },
    'canceled': {
      title: '❌ Serviço Cancelado',
      description: `O serviço para seu ${equipment} foi cancelado. ${orderNumber}`
    },
    'collected_for_diagnosis': {
      title: '🚚 Equipamento Coletado',
      description: `Seu ${equipment} foi coletado pelo técnico ${technicianName} para diagnóstico. ${orderNumber}`
    }
  };

  return statusMessages[newStatus] || {
    title: '📋 Status Atualizado',
    description: `Status do seu ${equipment} foi atualizado. ${orderNumber}`
  };
}

/**
 * Cria uma notificação formatada para eventos gerais
 */
export function createGeneralNotification(
  order: any,
  title: string,
  descriptionTemplate: string,
  context?: any
): { title: string; description: string } {
  const orderNumber = formatOrderNumberForNotification(order);
  const equipment = formatEquipmentForNotification(order);
  const clientName = formatClientNameForNotification(order);
  const technicianName = formatTechnicianNameForNotification(order, context);
  const address = formatAddressForNotification(order);

  const description = descriptionTemplate
    .replace(/{orderNumber}/g, orderNumber)
    .replace(/{equipment}/g, equipment)
    .replace(/{clientName}/g, clientName)
    .replace(/{technicianName}/g, technicianName)
    .replace(/{address}/g, address);

  return { title, description };
}
