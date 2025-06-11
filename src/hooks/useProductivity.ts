import { useState, useCallback, useEffect } from 'react';
import { 
  ProductivityService, 
  ProductivityMetrics, 
  ProductivitySummary, 
  ProductivityComparison 
} from '@/services/productivityService';
import { useToast } from '@/hooks/use-toast';

export interface UseProductivityReturn {
  // Estados
  isLoading: boolean;
  metrics: ProductivityMetrics[];
  summary: ProductivitySummary | null;
  comparison: ProductivityComparison | null;
  
  // Ações
  loadMetrics: (
    technicianId: string,
    period?: 'daily' | 'weekly' | 'monthly',
    startDate?: string,
    endDate?: string
  ) => Promise<void>;
  loadSummary: (
    technicianId: string,
    period?: 'daily' | 'weekly' | 'monthly'
  ) => Promise<void>;
  loadComparison: (
    technicianId: string,
    period?: 'daily' | 'weekly' | 'monthly',
    date?: string
  ) => Promise<void>;
  calculateDailyMetrics: (technicianId: string, date?: string) => Promise<void>;
  exportReport: (
    technicianId: string,
    startDate: string,
    endDate: string,
    format?: 'json' | 'csv'
  ) => Promise<string | null>;
  
  // Utilitários
  formatMetricValue: (value: number, type: 'currency' | 'percentage' | 'time' | 'number') => string;
  getMetricTrend: (current: number, previous: number) => { value: number; direction: 'up' | 'down' | 'stable' };
  getPerformanceLevel: (metrics: ProductivityMetrics) => 'excellent' | 'good' | 'average' | 'needs_improvement';
}

/**
 * Hook para gerenciar métricas de produtividade dos técnicos
 */
export function useProductivity(): UseProductivityReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<ProductivityMetrics[]>([]);
  const [summary, setSummary] = useState<ProductivitySummary | null>(null);
  const [comparison, setComparison] = useState<ProductivityComparison | null>(null);
  const { toast } = useToast();

  /**
   * Carregar métricas de produtividade
   */
  const loadMetrics = useCallback(async (
    technicianId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    startDate?: string,
    endDate?: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      const metricsData = await ProductivityService.getMetrics(
        technicianId, 
        period, 
        startDate, 
        endDate
      );
      setMetrics(metricsData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar métricas';
      toast({
        title: "Erro ao carregar métricas",
        description: message,
        variant: "destructive"
      });
      setMetrics([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Carregar resumo de produtividade
   */
  const loadSummary = useCallback(async (
    technicianId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<void> => {
    try {
      setIsLoading(true);
      const summaryData = await ProductivityService.getProductivitySummary(technicianId, period);
      setSummary(summaryData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar resumo';
      toast({
        title: "Erro ao carregar resumo",
        description: message,
        variant: "destructive"
      });
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Carregar comparação com a equipe
   */
  const loadComparison = useCallback(async (
    technicianId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    date?: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      const comparisonData = await ProductivityService.getProductivityComparison(
        technicianId, 
        period, 
        date
      );
      setComparison(comparisonData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar comparação';
      toast({
        title: "Erro ao carregar comparação",
        description: message,
        variant: "destructive"
      });
      setComparison(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Calcular métricas diárias
   */
  const calculateDailyMetrics = useCallback(async (
    technicianId: string, 
    date?: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      await ProductivityService.calculateDailyMetrics(technicianId, date);
      
      toast({
        title: "Métricas atualizadas",
        description: "As métricas de produtividade foram recalculadas",
      });

      // Recarregar métricas após cálculo
      await loadMetrics(technicianId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao calcular métricas';
      toast({
        title: "Erro ao calcular métricas",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, loadMetrics]);

  /**
   * Exportar relatório
   */
  const exportReport = useCallback(async (
    technicianId: string,
    startDate: string,
    endDate: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string | null> => {
    try {
      setIsLoading(true);
      const report = await ProductivityService.exportProductivityReport(
        technicianId, 
        startDate, 
        endDate, 
        format
      );

      toast({
        title: "Relatório exportado",
        description: `Relatório em formato ${format.toUpperCase()} gerado com sucesso`,
      });

      return report;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao exportar relatório';
      toast({
        title: "Erro na exportação",
        description: message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Formatar valores de métricas
   */
  const formatMetricValue = useCallback((
    value: number, 
    type: 'currency' | 'percentage' | 'time' | 'number'
  ): string => {
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      
      case 'percentage':
        return `${value.toFixed(1)}%`;
      
      case 'time':
        if (value < 60) {
          return `${Math.round(value)} min`;
        }
        const hours = Math.floor(value / 60);
        const minutes = Math.round(value % 60);
        return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
      
      case 'number':
        return new Intl.NumberFormat('pt-BR').format(value);
      
      default:
        return value.toString();
    }
  }, []);

  /**
   * Calcular tendência de métrica
   */
  const getMetricTrend = useCallback((current: number, previous: number) => {
    if (previous === 0) {
      return { value: 0, direction: 'stable' as const };
    }

    const change = ((current - previous) / previous) * 100;
    const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';

    return { value: Math.abs(change), direction };
  }, []);

  /**
   * Determinar nível de performance
   */
  const getPerformanceLevel = useCallback((metrics: ProductivityMetrics): 'excellent' | 'good' | 'average' | 'needs_improvement' => {
    let score = 0;
    let factors = 0;

    // Avaliar ordens concluídas (peso: 25%)
    if (metrics.orders_completed >= 8) score += 25;
    else if (metrics.orders_completed >= 5) score += 18;
    else if (metrics.orders_completed >= 3) score += 12;
    else score += 5;
    factors++;

    // Avaliar satisfação do cliente (peso: 30%)
    if (metrics.customer_satisfaction_avg) {
      if (metrics.customer_satisfaction_avg >= 4.5) score += 30;
      else if (metrics.customer_satisfaction_avg >= 4.0) score += 22;
      else if (metrics.customer_satisfaction_avg >= 3.5) score += 15;
      else score += 8;
      factors++;
    }

    // Avaliar pontualidade (peso: 25%)
    if (metrics.punctuality_rate >= 95) score += 25;
    else if (metrics.punctuality_rate >= 85) score += 18;
    else if (metrics.punctuality_rate >= 75) score += 12;
    else score += 5;
    factors++;

    // Avaliar eficiência de rota (peso: 20%)
    if (metrics.route_efficiency_rate) {
      if (metrics.route_efficiency_rate >= 90) score += 20;
      else if (metrics.route_efficiency_rate >= 80) score += 15;
      else if (metrics.route_efficiency_rate >= 70) score += 10;
      else score += 5;
      factors++;
    }

    const averageScore = factors > 0 ? score / factors : 0;

    if (averageScore >= 22) return 'excellent';
    if (averageScore >= 18) return 'good';
    if (averageScore >= 12) return 'average';
    return 'needs_improvement';
  }, []);

  return {
    // Estados
    isLoading,
    metrics,
    summary,
    comparison,
    
    // Ações
    loadMetrics,
    loadSummary,
    loadComparison,
    calculateDailyMetrics,
    exportReport,
    
    // Utilitários
    formatMetricValue,
    getMetricTrend,
    getPerformanceLevel
  };
}
