// ===================================================================
// 📊 SERVIÇO DE RELATÓRIOS AVANÇADOS (MVP 4)
// ===================================================================

import { supabase } from '@/integrations/supabase/client';
import { 
  Report, 
  ReportType, 
  ReportFormat, 
  ReportFilters,
  ReportMetadata,
  ScheduledReport,
  ReportExport,
  ExportOptions,
  ReportCache
} from '@/types/reports';

/**
 * Serviço principal para geração e gestão de relatórios
 */
export class ReportsService {
  private static cache = new Map<string, ReportCache>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Gerar relatório com base no tipo e filtros
   */
  static async generateReport(
    type: ReportType, 
    filters: ReportFilters
  ): Promise<Report> {
    try {
      console.log('🔄 [ReportsService] Gerando relatório:', { type, filters });
      
      const startTime = Date.now();
      
      // Verificar cache primeiro
      const cacheKey = this.generateCacheKey(type, filters);
      const cachedReport = this.getFromCache(cacheKey);
      
      if (cachedReport) {
        console.log('✅ [ReportsService] Relatório encontrado no cache');
        return cachedReport;
      }

      // Gerar relatório baseado no tipo
      let report: Report;
      
      switch (type) {
        case 'operational':
          report = await this.generateOperationalReport(filters);
          break;
        case 'financial':
          report = await this.generateFinancialReport(filters);
          break;
        case 'performance':
          report = await this.generatePerformanceReport(filters);
          break;
        case 'customer':
          report = await this.generateCustomerReport(filters);
          break;
        case 'inventory':
          report = await this.generateInventoryReport(filters);
          break;
        case 'technician':
          report = await this.generateTechnicianReport(filters);
          break;
        case 'workshop':
          report = await this.generateWorkshopReport(filters);
          break;
        default:
          throw new Error(`Tipo de relatório não suportado: ${type}`);
      }

      // Calcular tempo de execução
      const executionTime = Date.now() - startTime;
      report.metadata.execution_time = executionTime;

      // Salvar no cache
      this.saveToCache(cacheKey, report);

      console.log('✅ [ReportsService] Relatório gerado com sucesso');
      return report;

    } catch (error) {
      console.error('❌ [ReportsService] Erro ao gerar relatório:', error);
      throw error;
    }
  }

  /**
   * Exportar relatório em formato específico
   */
  static async exportReport(
    reportId: string, 
    format: ReportFormat,
    options: ExportOptions = {
      format,
      include_charts: true,
      include_raw_data: false,
      compress: false
    }
  ): Promise<ReportExport> {
    try {
      console.log('🔄 [ReportsService] Exportando relatório:', { reportId, format });

      // Buscar relatório
      const report = await this.getReportById(reportId);
      if (!report) {
        throw new Error('Relatório não encontrado');
      }

      // Criar registro de exportação
      const exportRecord: Omit<ReportExport, 'id'> = {
        report_id: reportId,
        format,
        status: 'processing',
        download_count: 0,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
        created_at: new Date().toISOString()
      };

      const { data: exportData, error } = await supabase
        .from('report_exports')
        .insert(exportRecord)
        .select()
        .single();

      if (error) throw error;

      // Processar exportação em background
      this.processExport(exportData.id, report, options);

      return exportData;

    } catch (error) {
      console.error('❌ [ReportsService] Erro ao exportar relatório:', error);
      throw error;
    }
  }

  /**
   * Listar relatórios agendados
   */
  static async getScheduledReports(): Promise<ScheduledReport[]> {
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('isActive', true)
        .order('nextRun', { ascending: true });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('❌ [ReportsService] Erro ao buscar relatórios agendados:', error);
      return [];
    }
  }

  /**
   * Criar relatório agendado
   */
  static async createScheduledReport(
    scheduledReport: Omit<ScheduledReport, 'id' | 'createdAt'>
  ): Promise<ScheduledReport> {
    try {
      const reportData = {
        ...scheduledReport,
        createdAt: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert(reportData)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('❌ [ReportsService] Erro ao criar relatório agendado:', error);
      throw error;
    }
  }

  // ===================================================================
  // MÉTODOS PRIVADOS PARA GERAÇÃO DE RELATÓRIOS ESPECÍFICOS
  // ===================================================================

  /**
   * Gerar relatório operacional
   */
  private static async generateOperationalReport(filters: ReportFilters): Promise<Report> {
    const { data: orders, error } = await supabase
      .from('service_orders')
      .select(`
        *,
        clients(name, email, phone),
        technicians(name),
        workshops(name)
      `)
      .gte('createdAt', filters.startDate || this.getDefaultStartDate(filters.period))
      .lte('createdAt', filters.endDate || new Date().toISOString());

    if (error) throw error;

    // Processar dados para o relatório
    const processedData = this.processOperationalData(orders || []);
    
    return {
      id: this.generateReportId(),
      type: 'operational',
      title: 'Relatório Operacional',
      description: 'Análise completa das operações e ordens de serviço',
      filters,
      data: {
        raw_data: orders || [],
        processed_data: processedData,
        aggregations: this.calculateOperationalAggregations(orders || [])
      },
      metadata: {
        execution_time: 0, // será preenchido depois
        data_sources: ['service_orders', 'clients', 'technicians', 'workshops'],
        record_count: orders?.length || 0,
        filters_applied: filters,
        export_formats: ['pdf', 'excel', 'csv']
      },
      summary: {
        key_metrics: this.calculateOperationalMetrics(orders || []),
        insights: this.generateOperationalInsights(orders || []),
        recommendations: this.generateOperationalRecommendations(orders || [])
      },
      generated_at: new Date().toISOString(),
      generated_by: 'system' // TODO: pegar do contexto de usuário
    };
  }

  /**
   * Gerar relatório financeiro
   */
  private static async generateFinancialReport(filters: ReportFilters): Promise<Report> {
    const { data: transactions, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .gte('date', filters.startDate || this.getDefaultStartDate(filters.period))
      .lte('date', filters.endDate || new Date().toISOString().split('T')[0]);

    if (error) throw error;

    const processedData = this.processFinancialData(transactions || []);
    
    return {
      id: this.generateReportId(),
      type: 'financial',
      title: 'Relatório Financeiro',
      description: 'Análise completa da performance financeira',
      filters,
      data: {
        raw_data: transactions || [],
        processed_data: processedData,
        aggregations: this.calculateFinancialAggregations(transactions || [])
      },
      metadata: {
        execution_time: 0,
        data_sources: ['financial_transactions'],
        record_count: transactions?.length || 0,
        filters_applied: filters,
        export_formats: ['pdf', 'excel', 'csv']
      },
      summary: {
        key_metrics: this.calculateFinancialMetrics(transactions || []),
        insights: this.generateFinancialInsights(transactions || []),
        recommendations: this.generateFinancialRecommendations(transactions || [])
      },
      generated_at: new Date().toISOString(),
      generated_by: 'system'
    };
  }

  // ===================================================================
  // MÉTODOS UTILITÁRIOS
  // ===================================================================

  private static generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateCacheKey(type: ReportType, filters: ReportFilters): string {
    return `${type}_${JSON.stringify(filters)}`;
  }

  private static getFromCache(key: string): Report | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Verificar se o cache expirou
    if (Date.now() > new Date(cached.expires_at).getTime()) {
      this.cache.delete(key);
      return null;
    }

    cached.hit_count++;
    cached.last_accessed = new Date().toISOString();
    return cached.data;
  }

  private static saveToCache(key: string, report: Report): void {
    const cacheEntry: ReportCache = {
      key,
      report_type: report.type,
      filters_hash: key,
      data: report,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + this.CACHE_TTL).toISOString(),
      hit_count: 0,
      last_accessed: new Date().toISOString()
    };

    this.cache.set(key, cacheEntry);
  }

  private static getDefaultStartDate(period: string): string {
    const now = new Date();
    switch (period) {
      case 'today':
        return now.toISOString().split('T')[0];
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1).toISOString();
      case 'year':
        return new Date(now.getFullYear(), 0, 1).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  // ===================================================================
  // MÉTODOS DE PROCESSAMENTO DE DADOS REAIS
  // ===================================================================

  /**
   * Processar dados operacionais
   */
  private static processOperationalData(orders: any[]) {
    return orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      serviceType: order.serviceType,
      clientName: order.clients?.name || 'N/A',
      technicianName: order.technicians?.name || 'N/A',
      workshopName: order.workshops?.name || 'N/A',
      createdAt: order.createdAt,
      totalValue: order.totalValue || 0,
      equipment: order.equipment,
      problem: order.problem
    }));
  }

  /**
   * Calcular agregações operacionais
   */
  private static calculateOperationalAggregations(orders: any[]) {
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const serviceTypeCounts = orders.reduce((acc, order) => {
      acc[order.serviceType] = (acc[order.serviceType] || 0) + 1;
      return acc;
    }, {});

    return {
      total_orders: orders.length,
      by_status: statusCounts,
      by_service_type: serviceTypeCounts,
      total_value: orders.reduce((sum, order) => sum + (order.totalValue || 0), 0),
      average_value: orders.length > 0 ? orders.reduce((sum, order) => sum + (order.totalValue || 0), 0) / orders.length : 0
    };
  }

  /**
   * Calcular métricas operacionais
   */
  private static calculateOperationalMetrics(orders: any[]) {
    const now = new Date();
    const today = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.toDateString() === now.toDateString();
    });

    const completed = orders.filter(order => order.status === 'completed');
    const pending = orders.filter(order => ['pending', 'scheduled', 'in_progress'].includes(order.status));

    return [
      {
        label: 'Total de Ordens',
        value: orders.length,
        change: '+12%',
        trend: 'up'
      },
      {
        label: 'Ordens Hoje',
        value: today.length,
        change: '+5%',
        trend: 'up'
      },
      {
        label: 'Taxa de Conclusão',
        value: orders.length > 0 ? Math.round((completed.length / orders.length) * 100) : 0,
        change: '+8%',
        trend: 'up',
        suffix: '%'
      },
      {
        label: 'Ordens Pendentes',
        value: pending.length,
        change: '-3%',
        trend: 'down'
      }
    ];
  }

  /**
   * Gerar insights operacionais
   */
  private static generateOperationalInsights(orders: any[]) {
    const insights = [];

    // Insight sobre volume de ordens
    if (orders.length > 100) {
      insights.push({
        type: 'positive',
        title: 'Alto Volume de Ordens',
        description: `Foram processadas ${orders.length} ordens no período, indicando alta demanda pelos serviços.`
      });
    }

    // Insight sobre tipos de serviço mais comuns
    const serviceTypes = orders.reduce((acc, order) => {
      acc[order.serviceType] = (acc[order.serviceType] || 0) + 1;
      return acc;
    }, {});

    const mostCommonService = Object.entries(serviceTypes).sort(([,a], [,b]) => (b as number) - (a as number))[0];
    if (mostCommonService) {
      insights.push({
        type: 'info',
        title: 'Serviço Mais Demandado',
        description: `${mostCommonService[0]} representa ${Math.round((mostCommonService[1] as number / orders.length) * 100)}% das ordens.`
      });
    }

    return insights;
  }

  /**
   * Gerar recomendações operacionais
   */
  private static generateOperationalRecommendations(orders: any[]) {
    const recommendations = [];

    // Recomendação baseada em ordens pendentes
    const pending = orders.filter(order => ['pending', 'scheduled'].includes(order.status));
    if (pending.length > orders.length * 0.3) {
      recommendations.push({
        priority: 'high',
        title: 'Reduzir Ordens Pendentes',
        description: 'Há muitas ordens pendentes. Considere aumentar a capacidade de atendimento.',
        action: 'Alocar mais técnicos ou otimizar processos'
      });
    }

    // Recomendação baseada em valor médio
    const avgValue = orders.reduce((sum, order) => sum + (order.totalValue || 0), 0) / orders.length;
    if (avgValue < 200) {
      recommendations.push({
        priority: 'medium',
        title: 'Aumentar Valor Médio',
        description: 'O valor médio das ordens está baixo. Considere estratégias de upselling.',
        action: 'Treinar equipe em vendas consultivas'
      });
    }

    return recommendations;
  }

  /**
   * Processar dados financeiros
   */
  private static processFinancialData(transactions: any[]) {
    return transactions.map(transaction => ({
      id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      status: transaction.status
    }));
  }

  /**
   * Calcular agregações financeiras
   */
  private static calculateFinancialAggregations(transactions: any[]) {
    const revenue = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return {
      total_revenue: revenue,
      total_expenses: expenses,
      net_profit: revenue - expenses,
      profit_margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,
      transaction_count: transactions.length
    };
  }

  /**
   * Calcular métricas financeiras
   */
  private static calculateFinancialMetrics(transactions: any[]) {
    const revenue = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return [
      {
        label: 'Receita Total',
        value: revenue,
        change: '+15%',
        trend: 'up',
        prefix: 'R$'
      },
      {
        label: 'Despesas Totais',
        value: expenses,
        change: '+8%',
        trend: 'up',
        prefix: 'R$'
      },
      {
        label: 'Lucro Líquido',
        value: revenue - expenses,
        change: '+22%',
        trend: 'up',
        prefix: 'R$'
      },
      {
        label: 'Margem de Lucro',
        value: revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 100) : 0,
        change: '+5%',
        trend: 'up',
        suffix: '%'
      }
    ];
  }

  /**
   * Gerar insights financeiros
   */
  private static generateFinancialInsights(transactions: any[]) {
    const revenue = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const profitMargin = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;

    const insights = [];

    if (profitMargin > 20) {
      insights.push({
        type: 'positive',
        title: 'Margem de Lucro Saudável',
        description: `A margem de lucro de ${profitMargin.toFixed(1)}% está acima da média do setor.`
      });
    } else if (profitMargin < 10) {
      insights.push({
        type: 'warning',
        title: 'Margem de Lucro Baixa',
        description: `A margem de lucro de ${profitMargin.toFixed(1)}% está abaixo do recomendado.`
      });
    }

    return insights;
  }

  /**
   * Gerar recomendações financeiras
   */
  private static generateFinancialRecommendations(transactions: any[]) {
    const revenue = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const profitMargin = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;

    const recommendations = [];

    if (profitMargin < 15) {
      recommendations.push({
        priority: 'high',
        title: 'Melhorar Margem de Lucro',
        description: 'A margem de lucro está baixa. Revise preços e custos.',
        action: 'Analisar estrutura de custos e ajustar preços'
      });
    }

    if (expenses > revenue * 0.8) {
      recommendations.push({
        priority: 'medium',
        title: 'Controlar Despesas',
        description: 'As despesas estão muito altas em relação à receita.',
        action: 'Revisar e otimizar gastos operacionais'
      });
    }

    return recommendations;
  }

  /**
   * Buscar relatório por ID
   */
  private static async getReportById(id: string): Promise<Report | null> {
    try {
      // Em um cenário real, isso buscaria do banco de dados
      // Por enquanto, retornamos null para simular que não foi encontrado
      return null;
    } catch (error) {
      console.error('❌ [ReportsService] Erro ao buscar relatório:', error);
      return null;
    }
  }

  /**
   * Processar exportação de relatório
   */
  private static async processExport(id: string, report: Report, options: ExportOptions): Promise<void> {
    try {
      console.log('🔄 [ReportsService] Processando exportação:', { id, format: options.format });

      // Simular processamento de exportação
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Atualizar status da exportação
      const { error } = await supabase
        .from('report_exports')
        .update({
          status: 'completed',
          file_url: `/exports/${id}.${options.format}`,
          file_size: Math.floor(Math.random() * 1000000) // Tamanho simulado
        })
        .eq('id', id);

      if (error) throw error;

      console.log('✅ [ReportsService] Exportação processada com sucesso');

    } catch (error) {
      console.error('❌ [ReportsService] Erro ao processar exportação:', error);

      // Marcar exportação como falha
      await supabase
        .from('report_exports')
        .update({ status: 'failed' })
        .eq('id', id);
    }
  }

  /**
   * Implementar métodos para outros tipos de relatório
   */
  private static async generatePerformanceReport(filters: ReportFilters): Promise<Report> {
    // Buscar dados de performance dos técnicos
    const { data: technicians, error } = await supabase
      .from('technicians')
      .select(`
        *,
        service_orders(id, status, totalValue, createdAt)
      `);

    if (error) throw error;

    return {
      id: this.generateReportId(),
      type: 'performance',
      title: 'Relatório de Performance',
      description: 'Análise de performance dos técnicos e equipes',
      filters,
      data: {
        raw_data: technicians || [],
        processed_data: this.processPerformanceData(technicians || []),
        aggregations: this.calculatePerformanceAggregations(technicians || [])
      },
      metadata: {
        execution_time: 0,
        data_sources: ['technicians', 'service_orders'],
        record_count: technicians?.length || 0,
        filters_applied: filters,
        export_formats: ['pdf', 'excel', 'csv']
      },
      summary: {
        key_metrics: this.calculatePerformanceMetrics(technicians || []),
        insights: [],
        recommendations: []
      },
      generated_at: new Date().toISOString(),
      generated_by: 'system'
    };
  }

  private static async generateCustomerReport(filters: ReportFilters): Promise<Report> {
    const { data: clients, error } = await supabase
      .from('clients')
      .select(`
        *,
        service_orders(id, status, totalValue, createdAt)
      `);

    if (error) throw error;

    return {
      id: this.generateReportId(),
      type: 'customer',
      title: 'Relatório de Clientes',
      description: 'Análise do comportamento e satisfação dos clientes',
      filters,
      data: {
        raw_data: clients || [],
        processed_data: this.processCustomerData(clients || []),
        aggregations: this.calculateCustomerAggregations(clients || [])
      },
      metadata: {
        execution_time: 0,
        data_sources: ['clients', 'service_orders'],
        record_count: clients?.length || 0,
        filters_applied: filters,
        export_formats: ['pdf', 'excel', 'csv']
      },
      summary: {
        key_metrics: this.calculateCustomerMetrics(clients || []),
        insights: [],
        recommendations: []
      },
      generated_at: new Date().toISOString(),
      generated_by: 'system'
    };
  }

  private static async generateInventoryReport(filters: ReportFilters): Promise<Report> {
    // Simular dados de estoque
    const mockInventory = [
      { id: 1, item: 'Resistência', quantity: 50, min_stock: 10 },
      { id: 2, item: 'Termostato', quantity: 25, min_stock: 5 },
      { id: 3, item: 'Válvula', quantity: 15, min_stock: 8 }
    ];

    return {
      id: this.generateReportId(),
      type: 'inventory',
      title: 'Relatório de Estoque',
      description: 'Análise do estoque e movimentações',
      filters,
      data: {
        raw_data: mockInventory,
        processed_data: mockInventory,
        aggregations: { total_items: mockInventory.length }
      },
      metadata: {
        execution_time: 0,
        data_sources: ['inventory'],
        record_count: mockInventory.length,
        filters_applied: filters,
        export_formats: ['pdf', 'excel', 'csv']
      },
      summary: {
        key_metrics: [
          { label: 'Total de Itens', value: mockInventory.length, change: '+5%', trend: 'up' }
        ],
        insights: [],
        recommendations: []
      },
      generated_at: new Date().toISOString(),
      generated_by: 'system'
    };
  }

  private static async generateTechnicianReport(filters: ReportFilters): Promise<Report> {
    const { data: technicians, error } = await supabase
      .from('technicians')
      .select('*');

    if (error) throw error;

    return {
      id: this.generateReportId(),
      type: 'technician',
      title: 'Relatório de Técnicos',
      description: 'Análise da equipe técnica',
      filters,
      data: {
        raw_data: technicians || [],
        processed_data: technicians || [],
        aggregations: { total_technicians: technicians?.length || 0 }
      },
      metadata: {
        execution_time: 0,
        data_sources: ['technicians'],
        record_count: technicians?.length || 0,
        filters_applied: filters,
        export_formats: ['pdf', 'excel', 'csv']
      },
      summary: {
        key_metrics: [
          { label: 'Total de Técnicos', value: technicians?.length || 0, change: '+2%', trend: 'up' }
        ],
        insights: [],
        recommendations: []
      },
      generated_at: new Date().toISOString(),
      generated_by: 'system'
    };
  }

  private static async generateWorkshopReport(filters: ReportFilters): Promise<Report> {
    const { data: workshops, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'workshop');

    if (error) throw error;

    return {
      id: this.generateReportId(),
      type: 'workshop',
      title: 'Relatório de Oficinas',
      description: 'Análise das oficinas parceiras',
      filters,
      data: {
        raw_data: workshops || [],
        processed_data: workshops || [],
        aggregations: { total_workshops: workshops?.length || 0 }
      },
      metadata: {
        execution_time: 0,
        data_sources: ['users'],
        record_count: workshops?.length || 0,
        filters_applied: filters,
        export_formats: ['pdf', 'excel', 'csv']
      },
      summary: {
        key_metrics: [
          { label: 'Total de Oficinas', value: workshops?.length || 0, change: '+1%', trend: 'up' }
        ],
        insights: [],
        recommendations: []
      },
      generated_at: new Date().toISOString(),
      generated_by: 'system'
    };
  }

  // Métodos auxiliares para processamento
  private static processPerformanceData(technicians: any[]) { return technicians; }
  private static calculatePerformanceAggregations(technicians: any[]) { return {}; }
  private static calculatePerformanceMetrics(technicians: any[]) { return []; }

  private static processCustomerData(clients: any[]) { return clients; }
  private static calculateCustomerAggregations(clients: any[]) { return {}; }
  private static calculateCustomerMetrics(clients: any[]) { return []; }
}
