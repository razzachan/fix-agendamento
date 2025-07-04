import { supabase } from '../config/supabase.js';

/**
 * Serviço de notificações para a API Node.js
 * Integra com o sistema de notificações automáticas do frontend
 */
export class NotificationService {
  
  /**
   * Cria notificação automática baseada em mudança de status
   */
  static async createStatusChangeNotification(serviceOrder, previousStatus, newStatus, updatedBy = 'Sistema') {
    try {
      console.log(`🔔 [API NotificationService] Criando notificação para mudança: ${previousStatus} → ${newStatus}`);

      // Mapear status para eventos e mensagens
      const statusMessages = {
        'scheduled': {
          title: '📅 Serviço Agendado',
          description: `Seu ${serviceOrder.equipment_type} ${serviceOrder.equipment_model} foi agendado para atendimento.`
        },
        'in_progress': {
          title: '🔧 Serviço Iniciado',
          description: `O técnico iniciou o atendimento do seu ${serviceOrder.equipment_type} ${serviceOrder.equipment_model}.`
        },
        'diagnosis': {
          title: '🔍 Diagnóstico em Andamento',
          description: `Seu ${serviceOrder.equipment_type} ${serviceOrder.equipment_model} está sendo diagnosticado.`
        },
        'awaiting_approval': {
          title: '⏳ Aguardando Aprovação',
          description: `Diagnóstico concluído para seu ${serviceOrder.equipment_type} ${serviceOrder.equipment_model}. Aguardando sua aprovação.`
        },
        'repair': {
          title: '🔨 Em Reparo',
          description: `Seu ${serviceOrder.equipment_type} ${serviceOrder.equipment_model} está sendo reparado.`
        },
        'testing': {
          title: '🧪 Em Teste',
          description: `Reparo concluído! Seu ${serviceOrder.equipment_type} ${serviceOrder.equipment_model} está sendo testado.`
        },
        'completed': {
          title: '✅ Serviço Concluído',
          description: `Seu ${serviceOrder.equipment_type} ${serviceOrder.equipment_model} foi reparado com sucesso!`
        },
        'delivered': {
          title: '🎉 Equipamento Entregue',
          description: `Seu ${serviceOrder.equipment_type} ${serviceOrder.equipment_model} foi entregue com sucesso!`
        },
        'canceled': {
          title: '❌ Serviço Cancelado',
          description: `O serviço para seu ${serviceOrder.equipment_type} ${serviceOrder.equipment_model} foi cancelado.`
        }
      };

      const message = statusMessages[newStatus];
      if (!message) {
        console.log(`ℹ️ [API NotificationService] Status ${newStatus} não tem notificação configurada`);
        return;
      }

      // Buscar cliente para notificação
      let clientUserId = null;
      
      // Tentar buscar por client_id primeiro
      if (serviceOrder.client_id) {
        clientUserId = serviceOrder.client_id;
      } else if (serviceOrder.client_email) {
        // Buscar user_id pelo email do cliente
        const { data: clientUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', serviceOrder.client_email)
          .eq('role', 'client')
          .single();
        
        if (clientUser) {
          clientUserId = clientUser.id;
        }
      }

      if (!clientUserId) {
        console.warn(`⚠️ [API NotificationService] Cliente não encontrado para notificação: ${serviceOrder.client_name}`);
        return;
      }

      // Criar notificação
      const notificationData = {
        user_id: clientUserId,
        title: message.title,
        description: message.description,
        type: this.getNotificationType(newStatus),
        read: false,
        time: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notifications')
        .insert(notificationData);

      if (error) {
        console.error('❌ [API NotificationService] Erro ao criar notificação:', error);
      } else {
        console.log(`✅ [API NotificationService] Notificação criada para ${serviceOrder.client_name}`);
      }

    } catch (error) {
      console.error('❌ [API NotificationService] Erro geral:', error);
    }
  }

  /**
   * Cria entrada no histórico de progresso
   */
  static async createProgressEntry(serviceOrderId, status, notes, createdBy = 'Sistema') {
    try {
      const progressData = {
        service_order_id: serviceOrderId,
        status: status,
        notes: notes || `Status alterado para ${status}`,
        created_by: createdBy,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('service_order_progress')
        .insert(progressData);

      if (error) {
        console.error('❌ [API NotificationService] Erro ao criar progresso:', error);
      } else {
        console.log(`✅ [API NotificationService] Entrada de progresso criada`);
      }

    } catch (error) {
      console.error('❌ [API NotificationService] Erro ao criar progresso:', error);
    }
  }

  /**
   * Determina o tipo de notificação baseado no status
   */
  static getNotificationType(status) {
    const typeMap = {
      'scheduled': 'info',
      'in_progress': 'info',
      'diagnosis': 'info',
      'awaiting_approval': 'warning',
      'repair': 'info',
      'testing': 'info',
      'completed': 'success',
      'delivered': 'success',
      'canceled': 'error'
    };

    return typeMap[status] || 'info';
  }

  /**
   * Processa mudança de status com notificações automáticas
   */
  static async processStatusChange(serviceOrderId, newStatus, notes, updatedBy = 'Sistema') {
    try {
      // Buscar dados atuais da ordem
      const { data: currentOrder, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', serviceOrderId)
        .single();

      if (error || !currentOrder) {
        console.error('❌ [API NotificationService] Ordem não encontrada:', error);
        return false;
      }

      const previousStatus = currentOrder.status;

      // Criar notificação se o status mudou
      if (previousStatus !== newStatus) {
        await this.createStatusChangeNotification(currentOrder, previousStatus, newStatus, updatedBy);
        await this.createProgressEntry(serviceOrderId, newStatus, notes, updatedBy);
      }

      return true;

    } catch (error) {
      console.error('❌ [API NotificationService] Erro ao processar mudança:', error);
      return false;
    }
  }
}

export default NotificationService;
