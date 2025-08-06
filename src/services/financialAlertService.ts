import { ServiceOrder } from '@/types';
import { validateFinancialConsistency, calculateFinancialSummary } from '@/utils/financialCalculations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FinancialAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  serviceOrderId: string;
  orderNumber?: string;
  clientName: string;
  severity: 'high' | 'medium' | 'low';
  createdAt: Date;
  isRead: boolean;
  actionRequired: boolean;
}

export class FinancialAlertService {
  private static alerts: FinancialAlert[] = [];
  private static listeners: ((alerts: FinancialAlert[]) => void)[] = [];

  /**
   * Analisa uma ordem de serviço e gera alertas se necessário
   */
  static analyzeOrder(order: ServiceOrder): FinancialAlert[] {
    const validation = validateFinancialConsistency(order);
    const financial = calculateFinancialSummary(order);
    const alerts: FinancialAlert[] = [];

    // Alertas de erro (alta prioridade)
    validation.errors.forEach(error => {
      alerts.push({
        id: `error-${order.id}-${Date.now()}`,
        type: 'error',
        title: 'Erro Financeiro Crítico',
        message: error,
        serviceOrderId: order.id,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        severity: 'high',
        createdAt: new Date(),
        isRead: false,
        actionRequired: true
      });
    });

    // Alertas de aviso (média prioridade)
    validation.warnings.forEach(warning => {
      alerts.push({
        id: `warning-${order.id}-${Date.now()}`,
        type: 'warning',
        title: 'Inconsistência Financeira',
        message: warning,
        serviceOrderId: order.id,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        severity: 'medium',
        createdAt: new Date(),
        isRead: false,
        actionRequired: false
      });
    });

    // Alertas de pagamento em atraso
    if (financial.isOverdue) {
      alerts.push({
        id: `overdue-${order.id}-${Date.now()}`,
        type: 'warning',
        title: 'Pagamento em Atraso',
        message: `Pagamento pendente há mais de 7 dias. Valor: R$ ${financial.pendingAmount.toFixed(2)}`,
        serviceOrderId: order.id,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        severity: 'high',
        createdAt: new Date(),
        isRead: false,
        actionRequired: true
      });
    }

    // Alerta para valores muito altos sem sinal
    if (financial.totalAmount > 1000 && financial.advancePayment === 0 && order.serviceAttendanceType !== 'em_domicilio') {
      alerts.push({
        id: `high-value-${order.id}-${Date.now()}`,
        type: 'info',
        title: 'Valor Alto Sem Sinal',
        message: `Serviço de R$ ${financial.totalAmount.toFixed(2)} sem sinal pago. Considere solicitar adiantamento.`,
        serviceOrderId: order.id,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        severity: 'medium',
        createdAt: new Date(),
        isRead: false,
        actionRequired: false
      });
    }

    return alerts;
  }

  /**
   * Analisa múltiplas ordens e gera alertas
   */
  static analyzeOrders(orders: ServiceOrder[]): FinancialAlert[] {
    const allAlerts: FinancialAlert[] = [];
    
    orders.forEach(order => {
      const orderAlerts = this.analyzeOrder(order);
      allAlerts.push(...orderAlerts);
    });

    // Atualizar alertas internos
    this.alerts = allAlerts;
    this.notifyListeners();

    return allAlerts;
  }

  /**
   * Obter todos os alertas
   */
  static getAlerts(): FinancialAlert[] {
    return this.alerts;
  }

  /**
   * Obter alertas não lidos
   */
  static getUnreadAlerts(): FinancialAlert[] {
    return this.alerts.filter(alert => !alert.isRead);
  }

  /**
   * Obter alertas por severidade
   */
  static getAlertsBySeverity(severity: 'high' | 'medium' | 'low'): FinancialAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Marcar alerta como lido
   */
  static markAsRead(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isRead = true;
      this.notifyListeners();
    }
  }

  /**
   * Marcar todos os alertas como lidos
   */
  static markAllAsRead(): void {
    this.alerts.forEach(alert => {
      alert.isRead = true;
    });
    this.notifyListeners();
  }

  /**
   * Remover alerta
   */
  static removeAlert(alertId: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
    this.notifyListeners();
  }

  /**
   * Limpar todos os alertas
   */
  static clearAlerts(): void {
    this.alerts = [];
    this.notifyListeners();
  }

  /**
   * Adicionar listener para mudanças nos alertas
   */
  static addListener(callback: (alerts: FinancialAlert[]) => void): () => void {
    this.listeners.push(callback);
    
    // Retornar função para remover o listener
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notificar todos os listeners
   */
  private static notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.alerts);
      } catch (error) {
        console.error('Erro ao notificar listener de alertas financeiros:', error);
      }
    });
  }

  /**
   * Exibir toast para alertas críticos
   */
  static showCriticalAlerts(): void {
    const criticalAlerts = this.alerts.filter(alert => 
      alert.severity === 'high' && !alert.isRead
    );

    criticalAlerts.forEach(alert => {
      toast.error(alert.title, {
        description: alert.message,
        duration: 10000, // 10 segundos para alertas críticos
        action: {
          label: 'Ver Detalhes',
          onClick: () => {
            // Aqui você pode implementar navegação para a OS
            console.log('Navegar para OS:', alert.serviceOrderId);
          }
        }
      });
    });
  }

  /**
   * Gerar relatório de alertas
   */
  static generateReport(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    unread: number;
    actionRequired: number;
  } {
    const total = this.alerts.length;
    const unread = this.getUnreadAlerts().length;
    const actionRequired = this.alerts.filter(alert => alert.actionRequired).length;

    const byType = this.alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = this.alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      byType,
      bySeverity,
      unread,
      actionRequired
    };
  }

  /**
   * Atualizar status de pagamento no banco de dados
   */
  static async updatePaymentStatus(
    serviceOrderId: string,
    paymentStatus: 'pending' | 'advance_paid' | 'partial' | 'completed' | 'overdue'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('service_orders')
        .update({ payment_status: paymentStatus })
        .eq('id', serviceOrderId);

      if (error) {
        console.error('Erro ao atualizar status de pagamento:', error);
        toast.error('Erro ao atualizar status de pagamento');
        return false;
      }

      toast.success('Status de pagamento atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar status de pagamento:', error);
      toast.error('Erro ao atualizar status de pagamento');
      return false;
    }
  }

  /**
   * Criar notificação no sistema para alertas críticos
   */
  static async createSystemNotification(alert: FinancialAlert): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: alert.title,
          description: alert.message,
          type: alert.type === 'error' ? 'error' : 'warning',
          read: false,
          time: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao criar notificação:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return false;
    }
  }

  /**
   * Processar alertas críticos e criar notificações
   */
  static async processCriticalAlerts(): Promise<void> {
    const criticalAlerts = this.alerts.filter(alert =>
      alert.severity === 'high' && !alert.isRead && alert.actionRequired
    );

    for (const alert of criticalAlerts) {
      await this.createSystemNotification(alert);
    }
  }
}
