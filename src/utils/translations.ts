/**
 * Utilitário centralizado para traduções do sistema EletroFix Hub Pro
 */

/**
 * Traduz status do sistema para português
 */
export const translateStatus = (status: string): string => {
  const statusTranslations: Record<string, string> = {
    'pending': 'Em Aberto',
    'scheduled': 'Agendado',
    'confirmed': 'Confirmado',
    'on_the_way': 'A Caminho',
    'collected': 'Coletado',
    'collected_for_diagnosis': 'Coletado para Diagnóstico',
    'at_workshop': 'Na Oficina',
    'received_at_workshop': 'Recebido na Oficina',
    'diagnosis_completed': 'Diagnóstico Concluído',
    'quote_approved': 'Orçamento Aprovado',
    'in_progress': 'Em Reparo',
    'ready_for_delivery': 'Pronto para Entrega',
    'collected_for_delivery': 'Coletado para Entrega',
    'scheduled_for_delivery': 'Agendado para Entrega',
    'out_for_delivery': 'Saiu para Entrega',
    'on_the_way_to_deliver': 'Em Rota de Entrega',
    'payment_pending': 'Aguardando Pagamento',
    'completed': 'Concluído',
    'cancelled': 'Cancelado',
    'paid': 'Pago'
  };

  return statusTranslations[status] || status;
};

/**
 * Traduz tipos de atendimento para português
 */
export const translateServiceType = (type: string): string => {
  const serviceTypeTranslations: Record<string, string> = {
    'coleta_diagnostico': 'Coleta para Diagnóstico',
    'coleta_conserto': 'Coleta para Conserto',
    'em_domicilio': 'Em Domicílio'
  };
  
  return serviceTypeTranslations[type] || type || 'Não informado';
};

/**
 * Traduz tipos de progresso de reparo para português
 */
export const translateProgressType = (type: string): string => {
  const progressTranslations: Record<string, string> = {
    'started': 'Reparo Iniciado',
    'parts_ordered': 'Peças Solicitadas',
    'parts_received': 'Peças Recebidas',
    'disassembly': 'Desmontagem',
    'repair_in_progress': 'Reparo em Andamento',
    'assembly': 'Montagem',
    'testing': 'Testes',
    'quality_check': 'Controle de Qualidade',
    'diagnosis': 'Diagnóstico',
    'repair': 'Reparo',
    'completion': 'Finalização'
  };
  
  return progressTranslations[type] || type;
};

/**
 * Traduz tipos de evento para português
 */
export const translateEventType = (type: string): string => {
  const eventTypeTranslations: Record<string, string> = {
    'created': 'Criado',
    'status_change': 'Mudança de Status',
    'technician_assigned': 'Técnico Atribuído',
    'collected': 'Coletado',
    'delivered': 'Entregue',
    'repair': 'Reparo',
    'diagnosis': 'Diagnóstico',
    'quote': 'Orçamento',
    'payment': 'Pagamento',
    'note': 'Observação'
  };
  
  return eventTypeTranslations[type] || type;
};

/**
 * Traduz prioridades para português
 */
export const translatePriority = (priority: string): string => {
  const priorityTranslations: Record<string, string> = {
    'low': 'Baixa',
    'medium': 'Média',
    'high': 'Alta',
    'urgent': 'Urgente'
  };
  
  return priorityTranslations[priority] || priority;
};

/**
 * Traduz tipos de notificação para português
 */
export const translateNotificationType = (type: string): string => {
  const notificationTypeTranslations: Record<string, string> = {
    'info': 'Informação',
    'success': 'Sucesso',
    'warning': 'Aviso',
    'error': 'Erro'
  };
  
  return notificationTypeTranslations[type] || type;
};

/**
 * Traduz roles/funções para português
 */
export const translateRole = (role: string): string => {
  const roleTranslations: Record<string, string> = {
    'admin': 'Administrador',
    'technician': 'Técnico',
    'workshop': 'Oficina',
    'client': 'Cliente'
  };
  
  return roleTranslations[role] || role;
};

/**
 * Traduz canais de notificação para português
 */
export const translateNotificationChannel = (channel: string): string => {
  const channelTranslations: Record<string, string> = {
    'in_app': 'No Sistema',
    'email': 'E-mail',
    'sms': 'SMS',
    'push': 'Push Notification',
    'whatsapp': 'WhatsApp'
  };
  
  return channelTranslations[channel] || channel;
};

/**
 * Formata data para exibição em português
 */
export const formatDateBR = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formata data e hora para exibição em português
 */
export const formatDateTimeBR = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formata apenas a hora para exibição em português
 */
export const formatTimeBR = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formata valores monetários para Real brasileiro
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Trunca texto para exibição em notificações
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
