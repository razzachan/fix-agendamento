import { ServiceOrder } from '@/types';
import { notificationEngine, NotificationEvent, NotificationContext } from './notificationEngine';
import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço para disparar notificações baseadas em eventos do sistema
 */
export class NotificationTriggers {
  
  /**
   * Dispara notificações quando uma nova ordem é criada
   */
  async onOrderCreated(serviceOrder: ServiceOrder): Promise<void> {
    const context: NotificationContext = {
      serviceOrder
    };

    await notificationEngine.triggerNotifications('order_created', context);
  }

  /**
   * Dispara notificações quando um técnico é atribuído
   */
  async onTechnicianAssigned(
    serviceOrder: ServiceOrder,
    technicianName: string
  ): Promise<void> {
    const context: NotificationContext = {
      serviceOrder,
      technicianName
    };

    await notificationEngine.triggerNotifications('technician_assigned', context);
  }

  /**
   * Dispara notificações quando uma oficina é atribuída
   */
  async onWorkshopAssigned(
    serviceOrder: ServiceOrder,
    workshopName: string
  ): Promise<void> {
    const context: NotificationContext = {
      serviceOrder,
      workshopName
    };

    await notificationEngine.triggerNotifications('workshop_assigned', context);
  }

  /**
   * Dispara notificações baseadas em mudança de status
   */
  async onStatusChanged(
    serviceOrder: ServiceOrder,
    previousStatus: string,
    newStatus: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const context: NotificationContext = {
      serviceOrder,
      previousStatus,
      newStatus,
      additionalData
    };

    // Mapear status para eventos específicos
    const eventMap: Record<string, NotificationEvent> = {
      'collected': 'equipment_collected',
      'collected_for_diagnosis': 'equipment_collected',
      'at_workshop': 'equipment_at_workshop',
      'received_at_workshop': 'equipment_at_workshop',
      'diagnosis_completed': 'diagnosis_completed',
      'awaiting_quote_approval': 'quote_sent',
      'quote_approved': 'quote_approved',
      'quote_rejected': 'quote_rejected',
      'in_progress': 'repair_completed',
      'ready_for_delivery': 'equipment_ready_delivery',
      'delivered': 'equipment_delivered',
      'completed': 'order_completed',
      'cancelled': 'order_cancelled'
    };

    const event = eventMap[newStatus];
    if (event) {
      // Buscar dados adicionais se necessário
      await this.enrichContextWithAdditionalData(context);
      await notificationEngine.triggerNotifications(event, context);
    }

    // Sempre disparar evento genérico de mudança de status
    await notificationEngine.triggerNotifications('status_changed', context);
  }

  /**
   * Dispara notificações quando um pagamento é recebido
   */
  async onPaymentReceived(
    serviceOrder: ServiceOrder,
    paymentAmount: number,
    paymentType: 'partial' | 'final'
  ): Promise<void> {
    const context: NotificationContext = {
      serviceOrder,
      paymentAmount,
      additionalData: { paymentType }
    };

    await notificationEngine.triggerNotifications('payment_received', context);
  }

  /**
   * Dispara notificações quando um diagnóstico é completado
   */
  async onDiagnosisCompleted(
    serviceOrder: ServiceOrder,
    diagnosisData: any
  ): Promise<void> {
    const context: NotificationContext = {
      serviceOrder,
      additionalData: { diagnosis: diagnosisData }
    };

    await notificationEngine.triggerNotifications('diagnosis_completed', context);
  }

  /**
   * Dispara notificações quando técnico faz check-in
   */
  async onTechnicianCheckedIn(
    serviceOrder: ServiceOrder,
    technicianName: string,
    location?: string
  ): Promise<void> {
    const context: NotificationContext = {
      serviceOrder,
      technicianName,
      additionalData: { location }
    };

    await notificationEngine.triggerNotifications('technician_checked_in', context);
  }

  /**
   * Dispara notificações quando técnico faz check-out
   */
  async onTechnicianCheckedOut(
    serviceOrder: ServiceOrder,
    technicianName: string,
    workDuration: number,
    location?: string
  ): Promise<void> {
    const context: NotificationContext = {
      serviceOrder,
      technicianName,
      additionalData: {
        workDuration,
        location,
        formattedDuration: this.formatDuration(workDuration)
      }
    };

    await notificationEngine.triggerNotifications('technician_checked_out', context);
  }

  /**
   * Formatar duração em minutos para string legível
   */
  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);

    if (remainingMinutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}min`;
  }

  /**
   * Dispara notificações quando um orçamento é aprovado
   */
  async onQuoteApproved(
    serviceOrder: ServiceOrder,
    approvedAmount: number
  ): Promise<void> {
    const context: NotificationContext = {
      serviceOrder,
      additionalData: { approvedAmount }
    };

    await notificationEngine.triggerNotifications('quote_approved', context);
  }

  /**
   * Enriquece o contexto com dados adicionais do banco
   */
  private async enrichContextWithAdditionalData(context: NotificationContext): Promise<void> {
    try {
      // Buscar nome do técnico se houver
      if (context.serviceOrder.technicianId && !context.technicianName) {
        const { data: technician } = await supabase
          .from('users')
          .select('name')
          .eq('id', context.serviceOrder.technicianId)
          .single();
        
        if (technician) {
          context.technicianName = technician.name;
        }
      }

      // Buscar nome da oficina se houver
      if (context.serviceOrder.workshopId && !context.workshopName) {
        const { data: workshop } = await supabase
          .from('users')
          .select('name')
          .eq('id', context.serviceOrder.workshopId)
          .single();
        
        if (workshop) {
          context.workshopName = workshop.name;
        }
      }
    } catch (error) {
      console.error('❌ Erro ao enriquecer contexto:', error);
    }
  }

  /**
   * Método utilitário para disparar notificações customizadas
   */
  async triggerCustomNotification(
    event: NotificationEvent,
    serviceOrder: ServiceOrder,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const context: NotificationContext = {
      serviceOrder,
      additionalData
    };

    await this.enrichContextWithAdditionalData(context);
    await notificationEngine.triggerNotifications(event, context);
  }

  /**
   * Dispara múltiplas notificações em lote
   */
  async triggerBatchNotifications(
    notifications: Array<{
      event: NotificationEvent;
      serviceOrder: ServiceOrder;
      additionalData?: Record<string, any>;
    }>
  ): Promise<void> {
    const promises = notifications.map(notification =>
      this.triggerCustomNotification(
        notification.event,
        notification.serviceOrder,
        notification.additionalData
      )
    );

    await Promise.allSettled(promises);
  }

  /**
   * Dispara notificações para eventos de sistema (não relacionados a OS específica)
   */
  async triggerSystemNotification(
    userIds: string[],
    title: string,
    description: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title,
        description,
        type,
        read: false,
        time: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('❌ Erro ao criar notificações de sistema:', error);
      } else {
        console.log(`✅ ${notifications.length} notificações de sistema criadas`);
      }
    } catch (error) {
      console.error('❌ Erro ao disparar notificações de sistema:', error);
    }
  }

  /**
   * Dispara notificações para todos os usuários de uma role específica
   */
  async triggerRoleNotification(
    role: string,
    title: string,
    description: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('role', role);

      if (users && users.length > 0) {
        const userIds = users.map(user => user.id);
        await this.triggerSystemNotification(userIds, title, description, type);
      }
    } catch (error) {
      console.error(`❌ Erro ao disparar notificações para role ${role}:`, error);
    }
  }

  /**
   * Dispara notificações de lembrete/agendamento
   */
  async triggerScheduleReminder(
    serviceOrder: ServiceOrder,
    reminderType: 'upcoming' | 'overdue' | 'today'
  ): Promise<void> {
    const titles = {
      upcoming: 'Serviço agendado para amanhã',
      overdue: 'Serviço em atraso',
      today: 'Serviço agendado para hoje'
    };

    const descriptions = {
      upcoming: `Lembrete: Serviço para ${serviceOrder.clientName} agendado para amanhã`,
      overdue: `Atenção: Serviço para ${serviceOrder.clientName} está em atraso`,
      today: `Serviço para ${serviceOrder.clientName} agendado para hoje`
    };

    const context: NotificationContext = {
      serviceOrder,
      additionalData: { reminderType }
    };

    // Notificar técnico responsável
    if (serviceOrder.technicianId) {
      await this.triggerSystemNotification(
        [serviceOrder.technicianId],
        titles[reminderType],
        descriptions[reminderType],
        reminderType === 'overdue' ? 'warning' : 'info'
      );
    }

    // Notificar admin se for atraso
    if (reminderType === 'overdue') {
      await this.triggerRoleNotification(
        'admin',
        'Serviço em atraso',
        `OS de ${serviceOrder.clientName} está em atraso`,
        'warning'
      );
    }
  }

  /**
   * Dispara notificações de métricas/relatórios
   */
  async triggerMetricsNotification(
    metrics: {
      totalOrders: number;
      completedOrders: number;
      pendingOrders: number;
      overdueOrders: number;
    },
    period: string
  ): Promise<void> {
    const title = `Relatório ${period}`;
    const description = `${metrics.completedOrders}/${metrics.totalOrders} ordens concluídas. ${metrics.overdueOrders} em atraso.`;

    await this.triggerRoleNotification(
      'admin',
      title,
      description,
      metrics.overdueOrders > 0 ? 'warning' : 'info'
    );
  }
}

// Instância singleton do serviço
export const notificationTriggers = new NotificationTriggers();
