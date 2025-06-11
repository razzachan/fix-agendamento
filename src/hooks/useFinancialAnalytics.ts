import { useState, useCallback } from 'react';
import { FinancialAnalytics, FinancialFilters, FinancialAnalyticsService } from '@/services/financialAnalyticsService';
import { useToast } from '@/hooks/use-toast';

export interface UseFinancialAnalyticsReturn {
  // Estados
  analytics: FinancialAnalytics | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Ações
  loadAnalytics: (filters: FinancialFilters) => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  exportReport: (format: 'json' | 'csv' | 'pdf') => Promise<void>;
  
  // Utilitários
  formatCurrency: (amount: number) => string;
  formatPercentage: (value: number) => string;
  getGrowthColor: (growth: number) => string;
  getGrowthIcon: (growth: number) => 'up' | 'down' | 'neutral';
}

export function useFinancialAnalytics(): UseFinancialAnalyticsReturn {
  const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentFilters, setCurrentFilters] = useState<FinancialFilters | null>(null);
  const { toast } = useToast();

  /**
   * Carregar analytics com filtros
   */
  const loadAnalytics = useCallback(async (filters: FinancialFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentFilters(filters);

      console.log('🔍 [useFinancialAnalytics] Carregando analytics com filtros:', filters);

      const data = await FinancialAnalyticsService.getAnalytics(filters);
      
      setAnalytics(data);
      setLastUpdated(new Date());

      console.log('✅ [useFinancialAnalytics] Analytics carregados com sucesso');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar analytics financeiros';
      console.error('❌ [useFinancialAnalytics] Erro:', error);
      
      setError(message);
      toast({
        title: "Erro ao carregar analytics",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Atualizar analytics com os filtros atuais
   */
  const refreshAnalytics = useCallback(async () => {
    if (!currentFilters) {
      console.warn('⚠️ [useFinancialAnalytics] Nenhum filtro definido para refresh');
      return;
    }

    await loadAnalytics(currentFilters);
  }, [currentFilters, loadAnalytics]);

  /**
   * Exportar relatório
   */
  const exportReport = useCallback(async (format: 'json' | 'csv' | 'pdf') => {
    if (!analytics) {
      toast({
        title: "Erro na exportação",
        description: "Nenhum dado disponível para exportar",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(`📄 [useFinancialAnalytics] Exportando relatório em formato ${format}`);

      let content: string;
      let mimeType: string;
      let filename: string;

      const timestamp = new Date().toISOString().split('T')[0];

      switch (format) {
        case 'json':
          content = JSON.stringify(analytics, null, 2);
          mimeType = 'application/json';
          filename = `relatorio-financeiro-${timestamp}.json`;
          break;

        case 'csv':
          content = convertToCSV(analytics);
          mimeType = 'text/csv';
          filename = `relatorio-financeiro-${timestamp}.csv`;
          break;

        case 'pdf':
          // Para PDF, vamos gerar um HTML simples que pode ser convertido
          content = generateHTMLReport(analytics);
          mimeType = 'text/html';
          filename = `relatorio-financeiro-${timestamp}.html`;
          break;

        default:
          throw new Error(`Formato não suportado: ${format}`);
      }

      // Criar e baixar arquivo
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Relatório exportado",
        description: `Arquivo ${filename} baixado com sucesso`,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao exportar relatório';
      console.error('❌ [useFinancialAnalytics] Erro na exportação:', error);
      
      toast({
        title: "Erro na exportação",
        description: message,
        variant: "destructive"
      });
    }
  }, [analytics, toast]);

  /**
   * Formatar moeda
   */
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }, []);

  /**
   * Formatar porcentagem
   */
  const formatPercentage = useCallback((value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }, []);

  /**
   * Cor baseada no crescimento
   */
  const getGrowthColor = useCallback((growth: number): string => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  }, []);

  /**
   * Ícone baseado no crescimento
   */
  const getGrowthIcon = useCallback((growth: number): 'up' | 'down' | 'neutral' => {
    if (growth > 0) return 'up';
    if (growth < 0) return 'down';
    return 'neutral';
  }, []);

  return {
    // Estados
    analytics,
    isLoading,
    error,
    lastUpdated,
    
    // Ações
    loadAnalytics,
    refreshAnalytics,
    exportReport,
    
    // Utilitários
    formatCurrency,
    formatPercentage,
    getGrowthColor,
    getGrowthIcon
  };
}

/**
 * Converter analytics para CSV
 */
function convertToCSV(analytics: FinancialAnalytics): string {
  const lines: string[] = [];
  
  // Cabeçalho
  lines.push('Relatório Financeiro - EletroFix Hub Pro');
  lines.push(`Data de Geração: ${new Date().toLocaleString('pt-BR')}`);
  lines.push('');
  
  // Métricas de Performance
  lines.push('MÉTRICAS DE PERFORMANCE');
  lines.push('Métrica,Valor');
  lines.push(`Receita Total,${analytics.performanceMetrics.totalRevenue}`);
  lines.push(`Despesas Totais,${analytics.performanceMetrics.totalExpenses}`);
  lines.push(`Lucro Líquido,${analytics.performanceMetrics.netProfit}`);
  lines.push(`Margem de Lucro,${analytics.performanceMetrics.profitMargin.toFixed(2)}%`);
  lines.push(`Valor Médio por Ordem,${analytics.performanceMetrics.averageOrderValue}`);
  lines.push(`Total de Ordens,${analytics.performanceMetrics.totalOrders}`);
  lines.push('');
  
  // Receita por Tipo de Serviço
  lines.push('RECEITA POR TIPO DE SERVIÇO');
  lines.push('Tipo de Serviço,Receita,Quantidade,Valor Médio');
  analytics.revenueByServiceType.forEach(item => {
    lines.push(`${item.serviceType},${item.revenue},${item.count},${item.averageValue}`);
  });
  lines.push('');
  
  // Receita por Técnico
  lines.push('RECEITA POR TÉCNICO');
  lines.push('Técnico,Receita,Ordens,Valor Médio por Ordem');
  analytics.revenueByTechnician.forEach(item => {
    lines.push(`${item.technicianName},${item.revenue},${item.ordersCount},${item.averageOrderValue}`);
  });
  
  return lines.join('\n');
}

/**
 * Gerar relatório HTML
 */
function generateHTMLReport(analytics: FinancialAnalytics): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Relatório Financeiro - Fix Fogões</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .metric { background-color: #f9f9f9; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>Relatório Financeiro - Fix Fogões</h1>
      <p>Data de Geração: ${new Date().toLocaleString('pt-BR')}</p>
      
      <h2>Métricas de Performance</h2>
      <div class="metric">
        <strong>Receita Total:</strong> R$ ${analytics.performanceMetrics.totalRevenue.toLocaleString('pt-BR')}<br>
        <strong>Despesas Totais:</strong> R$ ${analytics.performanceMetrics.totalExpenses.toLocaleString('pt-BR')}<br>
        <strong>Lucro Líquido:</strong> R$ ${analytics.performanceMetrics.netProfit.toLocaleString('pt-BR')}<br>
        <strong>Margem de Lucro:</strong> ${analytics.performanceMetrics.profitMargin.toFixed(2)}%<br>
        <strong>Total de Ordens:</strong> ${analytics.performanceMetrics.totalOrders}
      </div>
      
      <h2>Receita por Tipo de Serviço</h2>
      <table>
        <tr><th>Tipo de Serviço</th><th>Receita</th><th>Quantidade</th><th>Valor Médio</th></tr>
        ${analytics.revenueByServiceType.map(item => 
          `<tr><td>${item.serviceType}</td><td>R$ ${item.revenue.toLocaleString('pt-BR')}</td><td>${item.count}</td><td>R$ ${item.averageValue.toLocaleString('pt-BR')}</td></tr>`
        ).join('')}
      </table>
      
      <h2>Receita por Técnico</h2>
      <table>
        <tr><th>Técnico</th><th>Receita</th><th>Ordens</th><th>Valor Médio por Ordem</th></tr>
        ${analytics.revenueByTechnician.map(item => 
          `<tr><td>${item.technicianName}</td><td>R$ ${item.revenue.toLocaleString('pt-BR')}</td><td>${item.ordersCount}</td><td>R$ ${item.averageOrderValue.toLocaleString('pt-BR')}</td></tr>`
        ).join('')}
      </table>
    </body>
    </html>
  `;
}
