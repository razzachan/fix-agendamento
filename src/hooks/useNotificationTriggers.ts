import { useCallback } from 'react';
import { ServiceOrder } from '@/types';
import { notificationTriggers } from '@/services/notifications/notificationTriggers';

/**
 * Hook para disparar notificações de forma consistente em todo o sistema
 */
export function useNotificationTriggers() {
  
  /**
   * Dispara notificações quando uma ordem é criada
   */
  const triggerOrderCreated = useCallback(async (serviceOrder: ServiceOrder) => {
    try {
      await notificationTriggers.onOrderCreated(serviceOrder);
    } catch (error) {
      console.error('❌ Erro ao disparar notificações de criação:', error);
    }
  }, []);

  /**
   * Dispara notificações quando um técnico é atribuído
   */
  const triggerTechnicianAssigned = useCallback(async (
    serviceOrder: ServiceOrder,
    technicianName: string
  ) => {
    try {
      await notificationTriggers.onTechnicianAssigned(serviceOrder, technicianName);
    } catch (error) {
      console.error('❌ Erro ao disparar notificações de atribuição:', error);
    }
  }, []);

  /**
   * Dispara notificações quando uma oficina é atribuída
   */
  const triggerWorkshopAssigned = useCallback(async (
    serviceOrder: ServiceOrder,
    workshopName: string
  ) => {
    try {
      await notificationTriggers.onWorkshopAssigned(serviceOrder, workshopName);
    } catch (error) {
      console.error('❌ Erro ao disparar notificações de oficina:', error);
    }
  }, []);

  /**
   * Dispara notificações quando o status muda
   */
  const triggerStatusChanged = useCallback(async (
    serviceOrder: ServiceOrder,
    previousStatus: string,
    newStatus: string,
    additionalData?: Record<string, any>
  ) => {
    try {
      await notificationTriggers.onStatusChanged(
        serviceOrder,
        previousStatus,
        newStatus,
        additionalData
      );
    } catch (error) {
      console.error('❌ Erro ao disparar notificações de status:', error);
    }
  }, []);

  /**
   * Dispara notificações quando um pagamento é recebido
   */
  const triggerPaymentReceived = useCallback(async (
    serviceOrder: ServiceOrder,
    paymentAmount: number,
    paymentType: 'partial' | 'final'
  ) => {
    try {
      await notificationTriggers.onPaymentReceived(serviceOrder, paymentAmount, paymentType);
    } catch (error) {
      console.error('❌ Erro ao disparar notificações de pagamento:', error);
    }
  }, []);

  /**
   * Dispara notificações quando um diagnóstico é completado
   */
  const triggerDiagnosisCompleted = useCallback(async (
    serviceOrder: ServiceOrder,
    diagnosisData: any
  ) => {
    try {
      await notificationTriggers.onDiagnosisCompleted(serviceOrder, diagnosisData);
    } catch (error) {
      console.error('❌ Erro ao disparar notificações de diagnóstico:', error);
    }
  }, []);

  /**
   * Dispara notificações quando um orçamento é aprovado
   */
  const triggerQuoteApproved = useCallback(async (
    serviceOrder: ServiceOrder,
    approvedAmount: number
  ) => {
    try {
      await notificationTriggers.onQuoteApproved(serviceOrder, approvedAmount);
    } catch (error) {
      console.error('❌ Erro ao disparar notificações de orçamento:', error);
    }
  }, []);

  /**
   * Dispara notificações customizadas
   */
  const triggerCustomNotification = useCallback(async (
    event: string,
    serviceOrder: ServiceOrder,
    additionalData?: Record<string, any>
  ) => {
    try {
      await notificationTriggers.triggerCustomNotification(
        event as any,
        serviceOrder,
        additionalData
      );
    } catch (error) {
      console.error('❌ Erro ao disparar notificação customizada:', error);
    }
  }, []);

  /**
   * Dispara notificações de sistema
   */
  const triggerSystemNotification = useCallback(async (
    userIds: string[],
    title: string,
    description: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    try {
      await notificationTriggers.triggerSystemNotification(userIds, title, description, type);
    } catch (error) {
      console.error('❌ Erro ao disparar notificação de sistema:', error);
    }
  }, []);

  /**
   * Dispara notificações para uma role específica
   */
  const triggerRoleNotification = useCallback(async (
    role: string,
    title: string,
    description: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    try {
      await notificationTriggers.triggerRoleNotification(role, title, description, type);
    } catch (error) {
      console.error('❌ Erro ao disparar notificação de role:', error);
    }
  }, []);

  /**
   * Dispara notificações de lembrete
   */
  const triggerScheduleReminder = useCallback(async (
    serviceOrder: ServiceOrder,
    reminderType: 'upcoming' | 'overdue' | 'today'
  ) => {
    try {
      await notificationTriggers.triggerScheduleReminder(serviceOrder, reminderType);
    } catch (error) {
      console.error('❌ Erro ao disparar lembrete:', error);
    }
  }, []);

  /**
   * Dispara notificações de métricas
   */
  const triggerMetricsNotification = useCallback(async (
    metrics: {
      totalOrders: number;
      completedOrders: number;
      pendingOrders: number;
      overdueOrders: number;
    },
    period: string
  ) => {
    try {
      await notificationTriggers.triggerMetricsNotification(metrics, period);
    } catch (error) {
      console.error('❌ Erro ao disparar notificação de métricas:', error);
    }
  }, []);

  return {
    // Eventos principais do ciclo de vida
    triggerOrderCreated,
    triggerTechnicianAssigned,
    triggerWorkshopAssigned,
    triggerStatusChanged,
    triggerPaymentReceived,
    triggerDiagnosisCompleted,
    triggerQuoteApproved,
    
    // Notificações customizadas e de sistema
    triggerCustomNotification,
    triggerSystemNotification,
    triggerRoleNotification,
    
    // Lembretes e métricas
    triggerScheduleReminder,
    triggerMetricsNotification
  };
}

/**
 * Hook específico para integração automática com mudanças de status
 */
export function useStatusNotifications() {
  const { triggerStatusChanged } = useNotificationTriggers();

  /**
   * Wrapper para atualização de status que dispara notificações automaticamente
   */
  const updateStatusWithNotifications = useCallback(async (
    updateFunction: () => Promise<boolean>,
    serviceOrder: ServiceOrder,
    newStatus: string,
    additionalData?: Record<string, any>
  ) => {
    const previousStatus = serviceOrder.status;
    
    // Executar a atualização
    const success = await updateFunction();
    
    if (success) {
      // Disparar notificações
      await triggerStatusChanged(serviceOrder, previousStatus, newStatus, additionalData);
    }
    
    return success;
  }, [triggerStatusChanged]);

  return {
    updateStatusWithNotifications
  };
}

/**
 * Hook para notificações de pagamento
 */
export function usePaymentNotifications() {
  const { triggerPaymentReceived } = useNotificationTriggers();

  /**
   * Wrapper para confirmação de pagamento que dispara notificações
   */
  const confirmPaymentWithNotifications = useCallback(async (
    confirmFunction: () => Promise<boolean>,
    serviceOrder: ServiceOrder,
    paymentAmount: number,
    paymentType: 'partial' | 'final'
  ) => {
    // Executar a confirmação
    const success = await confirmFunction();
    
    if (success) {
      // Disparar notificações
      await triggerPaymentReceived(serviceOrder, paymentAmount, paymentType);
    }
    
    return success;
  }, [triggerPaymentReceived]);

  return {
    confirmPaymentWithNotifications
  };
}

/**
 * Hook para notificações de diagnóstico
 */
export function useDiagnosisNotifications() {
  const { triggerDiagnosisCompleted } = useNotificationTriggers();

  /**
   * Wrapper para salvamento de diagnóstico que dispara notificações
   */
  const saveDiagnosisWithNotifications = useCallback(async (
    saveFunction: () => Promise<boolean>,
    serviceOrder: ServiceOrder,
    diagnosisData: any
  ) => {
    // Executar o salvamento
    const success = await saveFunction();
    
    if (success) {
      // Disparar notificações
      await triggerDiagnosisCompleted(serviceOrder, diagnosisData);
    }
    
    return success;
  }, [triggerDiagnosisCompleted]);

  return {
    saveDiagnosisWithNotifications
  };
}
