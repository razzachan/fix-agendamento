import { useState, useEffect } from 'react';
import { FinancialAlert, FinancialAlertService } from '@/services/financialAlertService';
import { useAppData } from '@/hooks/useAppData';

export const useFinancialAlerts = () => {
  const { serviceOrders, isLoading } = useAppData();
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analisar ordens quando os dados mudarem
  useEffect(() => {
    if (!isLoading && serviceOrders.length > 0) {
      setIsAnalyzing(true);
      
      try {
        const newAlerts = FinancialAlertService.analyzeOrders(serviceOrders);
        setAlerts(newAlerts);
        
        // Mostrar alertas críticos e criar notificações
        FinancialAlertService.showCriticalAlerts();
        FinancialAlertService.processCriticalAlerts();
      } catch (error) {
        console.error('Erro ao analisar alertas financeiros:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, [serviceOrders, isLoading]);

  // Listener para mudanças nos alertas
  useEffect(() => {
    const removeListener = FinancialAlertService.addListener((updatedAlerts) => {
      setAlerts(updatedAlerts);
    });

    return removeListener;
  }, []);

  // Funções de controle
  const markAsRead = (alertId: string) => {
    FinancialAlertService.markAsRead(alertId);
  };

  const markAllAsRead = () => {
    FinancialAlertService.markAllAsRead();
  };

  const removeAlert = (alertId: string) => {
    FinancialAlertService.removeAlert(alertId);
  };

  const clearAlerts = () => {
    FinancialAlertService.clearAlerts();
  };

  const updatePaymentStatus = async (
    serviceOrderId: string, 
    paymentStatus: 'pending' | 'advance_paid' | 'partial' | 'completed' | 'overdue'
  ) => {
    return await FinancialAlertService.updatePaymentStatus(serviceOrderId, paymentStatus);
  };

  // Métricas derivadas
  const unreadAlerts = alerts.filter(alert => !alert.isRead);
  const criticalAlerts = alerts.filter(alert => alert.severity === 'high');
  const actionRequiredAlerts = alerts.filter(alert => alert.actionRequired);
  
  const alertsByType = alerts.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const alertsBySeverity = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    // Dados
    alerts,
    unreadAlerts,
    criticalAlerts,
    actionRequiredAlerts,
    alertsByType,
    alertsBySeverity,
    
    // Estados
    isAnalyzing,
    isLoading,
    
    // Ações
    markAsRead,
    markAllAsRead,
    removeAlert,
    clearAlerts,
    updatePaymentStatus,
    
    // Métricas
    totalAlerts: alerts.length,
    unreadCount: unreadAlerts.length,
    criticalCount: criticalAlerts.length,
    actionRequiredCount: actionRequiredAlerts.length,
    
    // Relatório
    report: FinancialAlertService.generateReport()
  };
};
