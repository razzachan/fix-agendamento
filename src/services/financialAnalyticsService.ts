import { supabase } from '@/integrations/supabase/client';

export interface FinancialAnalytics {
  // Métricas por período
  revenueByPeriod: {
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  
  // Métricas por tipo de serviço
  revenueByServiceType: {
    serviceType: string;
    revenue: number;
    count: number;
    averageValue: number;
  }[];
  
  // Métricas por técnico
  revenueByTechnician: {
    technicianId: string;
    technicianName: string;
    revenue: number;
    ordersCount: number;
    averageOrderValue: number;
  }[];
  
  // Métricas de performance
  performanceMetrics: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    averageOrderValue: number;
    totalOrders: number;
    pendingRevenue: number;
    overdueRevenue: number;
  };
  
  // Comparativo período anterior
  periodComparison: {
    revenueGrowth: number;
    expenseGrowth: number;
    profitGrowth: number;
    ordersGrowth: number;
  };
}

export interface FinancialFilters {
  startDate: string;
  endDate: string;
  serviceType?: string;
  technicianId?: string;
  status?: 'all' | 'paid' | 'pending' | 'overdue';
}

export class FinancialAnalyticsService {
  /**
   * Buscar analytics financeiros com filtros
   */
  static async getAnalytics(filters: FinancialFilters): Promise<FinancialAnalytics> {
    try {
      console.log('🔍 [FinancialAnalytics] Buscando analytics com filtros:', filters);

      // Buscar dados em paralelo
      const [
        revenueByPeriod,
        revenueByServiceType,
        revenueByTechnician,
        performanceMetrics,
        periodComparison
      ] = await Promise.all([
        this.getRevenueByPeriod(filters),
        this.getRevenueByServiceType(filters),
        this.getRevenueByTechnician(filters),
        this.getPerformanceMetrics(filters),
        this.getPeriodComparison(filters)
      ]);

      const analytics: FinancialAnalytics = {
        revenueByPeriod,
        revenueByServiceType,
        revenueByTechnician,
        performanceMetrics,
        periodComparison
      };

      console.log('✅ [FinancialAnalytics] Analytics calculados:', analytics);
      return analytics;

    } catch (error) {
      console.error('❌ [FinancialAnalytics] Erro ao buscar analytics:', error);
      throw error;
    }
  }

  /**
   * Receita por período (diário/semanal/mensal)
   */
  private static async getRevenueByPeriod(filters: FinancialFilters) {
    try {
      // Buscar transações financeiras no período
      let query = supabase
        .from('financial_transactions')
        .select('date, amount, type')
        .gte('date', filters.startDate)
        .lte('date', filters.endDate);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('paid_status', filters.status);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Agrupar por data
      const groupedByDate = transactions?.reduce((acc, tx) => {
        const date = tx.date;
        if (!acc[date]) {
          acc[date] = { revenue: 0, expenses: 0 };
        }
        
        if (tx.type === 'income') {
          acc[date].revenue += tx.amount;
        } else {
          acc[date].expenses += tx.amount;
        }
        
        return acc;
      }, {} as Record<string, { revenue: number; expenses: number }>) || {};

      // Converter para array ordenado
      return Object.entries(groupedByDate)
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.revenue - data.expenses
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    } catch (error) {
      console.error('❌ Erro ao buscar receita por período:', error);
      return [];
    }
  }

  /**
   * Receita por tipo de serviço
   */
  private static async getRevenueByServiceType(filters: FinancialFilters) {
    try {
      // Buscar transações financeiras com ordens de serviço e itens de serviço
      let query = supabase
        .from('financial_transactions')
        .select(`
          amount,
          type,
          paid_status,
          service_order_id,
          service_orders!inner(
            id,
            created_at,
            service_items(service_attendance_type)
          )
        `)
        .eq('type', 'income')
        .gte('date', filters.startDate)
        .lte('date', filters.endDate);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('paid_status', filters.status);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Agrupar por tipo de atendimento
      const groupedByType = transactions?.reduce((acc, tx) => {
        // Pegar o tipo de atendimento do primeiro item de serviço
        const serviceType = tx.service_orders?.service_items?.[0]?.service_attendance_type || 'Não especificado';

        if (!acc[serviceType]) {
          acc[serviceType] = { revenue: 0, count: 0 };
        }

        // Somar apenas receitas pagas se filtro não especificar
        if (filters.status === 'all' || tx.paid_status === 'paid') {
          acc[serviceType].revenue += tx.amount;
          acc[serviceType].count += 1;
        }

        return acc;
      }, {} as Record<string, { revenue: number; count: number }>) || {};

      // Converter para array com nomes amigáveis
      return Object.entries(groupedByType).map(([serviceType, data]) => ({
        serviceType: this.getServiceTypeLabel(serviceType),
        revenue: data.revenue,
        count: data.count,
        averageValue: data.count > 0 ? data.revenue / data.count : 0
      }));

    } catch (error) {
      console.error('❌ Erro ao buscar receita por tipo de serviço:', error);
      return [];
    }
  }

  /**
   * Receita por técnico
   */
  private static async getRevenueByTechnician(filters: FinancialFilters) {
    try {
      // Buscar transações financeiras com ordens de serviço e técnicos
      let query = supabase
        .from('financial_transactions')
        .select(`
          amount,
          type,
          paid_status,
          service_order_id,
          service_orders!inner(
            technician_id,
            technician_name,
            created_at
          )
        `)
        .eq('type', 'income')
        .gte('date', filters.startDate)
        .lte('date', filters.endDate)
        .not('service_orders.technician_id', 'is', null);

      if (filters.technicianId) {
        query = query.eq('service_orders.technician_id', filters.technicianId);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('paid_status', filters.status);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Agrupar por técnico
      const groupedByTechnician = transactions?.reduce((acc, tx) => {
        const technicianId = tx.service_orders?.technician_id;
        const technicianName = tx.service_orders?.technician_name || 'Técnico não identificado';

        if (!technicianId) return acc;

        if (!acc[technicianId]) {
          acc[technicianId] = {
            name: technicianName,
            revenue: 0,
            ordersCount: 0
          };
        }

        // Somar receitas baseado no filtro de status
        if (filters.status === 'all' || tx.paid_status === 'paid') {
          acc[technicianId].revenue += tx.amount;
          acc[technicianId].ordersCount += 1;
        }

        return acc;
      }, {} as Record<string, { name: string; revenue: number; ordersCount: number }>) || {};

      // Converter para array
      return Object.entries(groupedByTechnician).map(([technicianId, data]) => ({
        technicianId,
        technicianName: data.name,
        revenue: data.revenue,
        ordersCount: data.ordersCount,
        averageOrderValue: data.ordersCount > 0 ? data.revenue / data.ordersCount : 0
      }));

    } catch (error) {
      console.error('❌ Erro ao buscar receita por técnico:', error);
      return [];
    }
  }

  /**
   * Métricas de performance
   */
  private static async getPerformanceMetrics(filters: FinancialFilters) {
    try {
      // Buscar todas as transações no período
      let transactionsQuery = supabase
        .from('financial_transactions')
        .select('amount, type, paid_status')
        .gte('date', filters.startDate)
        .lte('date', filters.endDate);

      if (filters.status && filters.status !== 'all') {
        transactionsQuery = transactionsQuery.eq('paid_status', filters.status);
      }

      const { data: transactions, error } = await transactionsQuery;

      if (error) throw error;

      // Buscar total de ordens no período
      let ordersQuery = supabase
        .from('service_orders')
        .select('id, final_cost')
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate);

      if (filters.technicianId) {
        ordersQuery = ordersQuery.eq('technician_id', filters.technicianId);
      }

      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

      // Calcular métricas baseado no filtro de status
      const totalRevenue = transactions
        ?.filter(tx => tx.type === 'income' && (filters.status === 'all' || tx.paid_status === 'paid'))
        .reduce((sum, tx) => sum + tx.amount, 0) || 0;

      const totalExpenses = transactions
        ?.filter(tx => tx.type === 'expense' && (filters.status === 'all' || tx.paid_status === 'paid'))
        .reduce((sum, tx) => sum + tx.amount, 0) || 0;

      const pendingRevenue = transactions
        ?.filter(tx => tx.type === 'income' && tx.paid_status === 'pending')
        .reduce((sum, tx) => sum + tx.amount, 0) || 0;

      const overdueRevenue = transactions
        ?.filter(tx => tx.type === 'income' && tx.paid_status === 'overdue')
        .reduce((sum, tx) => sum + tx.amount, 0) || 0;

      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const totalOrders = orders?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        averageOrderValue,
        totalOrders,
        pendingRevenue,
        overdueRevenue
      };

    } catch (error) {
      console.error('❌ Erro ao buscar métricas de performance:', error);
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        averageOrderValue: 0,
        totalOrders: 0,
        pendingRevenue: 0,
        overdueRevenue: 0
      };
    }
  }

  /**
   * Comparativo com período anterior
   */
  private static async getPeriodComparison(filters: FinancialFilters) {
    try {
      // Calcular período anterior (mesmo intervalo de dias)
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const previousEndDate = new Date(startDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
      const previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - daysDiff);

      // Buscar métricas do período atual e anterior
      const [currentMetrics, previousMetrics] = await Promise.all([
        this.getPerformanceMetrics(filters),
        this.getPerformanceMetrics({
          ...filters,
          startDate: previousStartDate.toISOString().split('T')[0],
          endDate: previousEndDate.toISOString().split('T')[0]
        })
      ]);

      // Calcular crescimento percentual
      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      return {
        revenueGrowth: calculateGrowth(currentMetrics.totalRevenue, previousMetrics.totalRevenue),
        expenseGrowth: calculateGrowth(currentMetrics.totalExpenses, previousMetrics.totalExpenses),
        profitGrowth: calculateGrowth(currentMetrics.netProfit, previousMetrics.netProfit),
        ordersGrowth: calculateGrowth(currentMetrics.totalOrders, previousMetrics.totalOrders)
      };

    } catch (error) {
      console.error('❌ Erro ao buscar comparativo de período:', error);
      return {
        revenueGrowth: 0,
        expenseGrowth: 0,
        profitGrowth: 0,
        ordersGrowth: 0
      };
    }
  }

  /**
   * Traduzir tipos de serviço para nomes amigáveis
   */
  private static getServiceTypeLabel(serviceType: string): string {
    const labels: Record<string, string> = {
      'em_domicilio': 'Em Domicílio',
      'coleta_conserto': 'Coleta Conserto',
      'coleta_diagnostico': 'Coleta Diagnóstico',
      'Não especificado': 'Não Especificado'
    };

    return labels[serviceType] || serviceType;
  }
}
