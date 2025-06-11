/**
 * Mapeamento entre os status da API e do frontend
 * Este arquivo garante a consistência entre os status usados no backend e no frontend
 */

// Status definidos na API (backend)
export const API_STATUSES = [
  'pending',       // Pendente (apenas para pré-agendamentos)
  'scheduled',     // Agendado (status inicial das OS)
  'in_progress',   // Em andamento
  'diagnosis',     // Em diagnóstico
  'awaiting_parts', // Aguardando peças
  'awaiting_approval', // Aguardando aprovação do cliente
  'repair',        // Em reparo
  'testing',       // Em teste
  'completed',     // Concluído
  'delivered',     // Entregue
  'canceled',      // Cancelado
  'returned'       // Devolvido sem reparo
];

// Status definidos no frontend
export const FRONTEND_STATUSES = [
  'pending',
  'scheduled',
  'scheduled_collection',
  'in_progress',
  'on_the_way',
  'collected',
  'collected_for_diagnosis',
  'at_workshop',
  'diagnosis_completed',
  'ready_for_delivery',
  'collected_for_delivery',
  'on_the_way_to_deliver',
  'payment_pending',
  'completed',
  'cancelled'
];

// Mapeamento de status do frontend para a API
export const mapFrontendToApiStatus = (frontendStatus: string): string => {
  const mapping: Record<string, string> = {
    'pending': 'pending',
    'scheduled': 'scheduled',
    'scheduled_collection': 'scheduled',
    'in_progress': 'in_progress',
    'on_the_way': 'in_progress',
    'collected': 'in_progress',
    'collected_for_diagnosis': 'diagnosis',
    'at_workshop': 'in_progress',
    'diagnosis_completed': 'awaiting_approval',
    'ready_for_delivery': 'completed',
    'collected_for_delivery': 'completed',
    'on_the_way_to_deliver': 'completed',
    'payment_pending': 'completed',
    'completed': 'delivered',
    'cancelled': 'canceled'
  };

  return mapping[frontendStatus] || 'pending';
};

// Mapeamento de status da API para o frontend
export const mapApiToFrontendStatus = (apiStatus: string, attendanceType: string): string => {
  // Este mapeamento é mais complexo e depende do tipo de atendimento
  // Por padrão, usamos um mapeamento simples
  const defaultMapping: Record<string, string> = {
    'pending': 'pending',
    'scheduled': 'scheduled',
    'in_progress': 'in_progress',
    'diagnosis': 'collected_for_diagnosis',
    'awaiting_parts': 'at_workshop',
    'awaiting_approval': 'diagnosis_completed',
    'repair': 'in_progress',
    'testing': 'in_progress',
    'completed': 'ready_for_delivery',
    'delivered': 'completed',
    'canceled': 'cancelled',
    'returned': 'cancelled'
  };

  return defaultMapping[apiStatus] || 'pending';
};

// Tradução de status para exibição
export const translateStatus = (status: string): string => {
  const translations: Record<string, string> = {
    'pending': 'Pendente',
    'scheduled': 'Agendado',
    'scheduled_collection': 'Coleta Agendada',
    'in_progress': 'Em Andamento',
    'on_the_way': 'A Caminho',
    'collected': 'Coletado',
    'collected_for_diagnosis': 'Coletado para Diagnóstico',
    'at_workshop': 'Na Oficina',
    'diagnosis_completed': 'Diagnóstico Concluído',
    'ready_for_delivery': 'Pronto para Entrega',
    'collected_for_delivery': 'Coletado na Oficina',
    'on_the_way_to_deliver': 'Em Rota de Entrega',
    'payment_pending': 'Pagamento Pendente',
    'paid': 'Pago',
    'quote_sent': 'Orçamento Enviado',
    'quote_approved': 'Orçamento Aprovado',
    'received_at_workshop': 'Recebido na Oficina',
    'completed': 'Concluído',
    'cancelled': 'Cancelado',
    'canceled': 'Cancelado',
    'diagnosis': 'Em Diagnóstico',
    'awaiting_parts': 'Aguardando Peças',
    'awaiting_approval': 'Aguardando Aprovação',
    'repair': 'Em Reparo',
    'in_repair': 'Em Reparo',
    'testing': 'Em Teste',
    'delivered': 'Entregue',
    'returned': 'Devolvido'
  };

  return translations[status] || status;
};
