import { supabase } from '@/integrations/supabase/client';

export interface WeeklyPerformanceData {
  day: string;
  orders: number;
  revenue: number;
  date: string;
}

export interface TeamPerformanceData {
  name: string;
  orders: number;
  rating: number;
  status: string;
  technicianId: string;
  revenue: number;
}

export interface GrowthMetrics {
  revenueGrowth: number;
  ordersGrowth: number;
  clientsGrowth: number;
  avgOrderValueGrowth: number;
}

export interface ExecutiveSummary {
  efficiency: number; // % de ordens concluídas no prazo
  quality: number; // % de ordens sem retrabalho/reclamações
  punctuality: number; // % de ordens entregues no prazo
  totalOrders: number;
  avgCompletionTime: number; // em dias
  customerSatisfaction: number; // média das avaliações
}

export interface ExecutiveSummary {
  efficiency: number; // % de ordens concluídas no prazo
  quality: number; // % de ordens sem retrabalho/reclamações
  punctuality: number; // % de ordens entregues no prazo
  totalOrders: number;
  avgCompletionTime: number; // em dias
  customerSatisfaction: number; // média das avaliações
}

/**
 * Serviço centralizado para analytics do dashboard
 * Substitui dados mockados por dados reais do banco
 */
export class DashboardAnalyticsService {
  
  /**
   * FASE 1: Performance Semanal com Dados Reais
   * Busca ordens e receita dos últimos 7 dias
   */
  static async getWeeklyPerformance(): Promise<WeeklyPerformanceData[]> {
    try {
      console.log('📊 [DashboardAnalytics] Buscando performance semanal...');

      // Calcular datas dos últimos 7 dias
      const today = new Date();
      const weekDays = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        weekDays.push({
          day: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()],
          date: date.toISOString().split('T')[0],
          orders: 0,
          revenue: 0
        });
      }

      // Buscar ordens dos últimos 7 dias
      const startDate = weekDays[0].date;
      const endDate = weekDays[weekDays.length - 1].date;

      const { data: orders, error: ordersError } = await supabase
        .from('service_orders')
        .select('created_at, final_cost, completed_date')
        .gte('created_at', startDate + 'T00:00:00Z')
        .lte('created_at', endDate + 'T23:59:59Z');

      if (ordersError) {
        console.error('❌ Erro ao buscar ordens:', ordersError);
        throw ordersError;
      }

      // Buscar transações financeiras dos últimos 7 dias
      const { data: transactions, error: transError } = await supabase
        .from('financial_transactions')
        .select('date, amount, type')
        .eq('type', 'income')
        .gte('date', startDate)
        .lte('date', endDate);

      if (transError) {
        console.error('❌ Erro ao buscar transações:', transError);
        throw transError;
      }

      // Processar dados por dia
      weekDays.forEach(dayData => {
        // Contar ordens criadas no dia
        const dayOrders = orders?.filter(order => {
          const orderDate = new Date(order.created_at).toISOString().split('T')[0];
          return orderDate === dayData.date;
        }) || [];

        dayData.orders = dayOrders.length;

        // Somar receita do dia (de transações financeiras)
        const dayTransactions = transactions?.filter(tx => tx.date === dayData.date) || [];
        dayData.revenue = dayTransactions.reduce((sum, tx) => sum + tx.amount, 0);

        // Se não há transações, usar final_cost das ordens concluídas
        if (dayData.revenue === 0) {
          const completedOrders = dayOrders.filter(order => 
            order.completed_date && 
            new Date(order.completed_date).toISOString().split('T')[0] === dayData.date
          );
          dayData.revenue = completedOrders.reduce((sum, order) => sum + (order.final_cost || 0), 0);
        }
      });

      console.log('✅ [DashboardAnalytics] Performance semanal calculada:', weekDays);
      return weekDays;

    } catch (error) {
      console.error('❌ [DashboardAnalytics] Erro ao buscar performance semanal:', error);
      
      // Retornar dados vazios em caso de erro
      const today = new Date();
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - i));
        return {
          day: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()],
          date: date.toISOString().split('T')[0],
          orders: 0,
          revenue: 0
        };
      });
    }
  }

  /**
   * FASE 2: Performance da Equipe com Dados Reais
   * Busca dados reais dos técnicos
   */
  static async getTeamPerformance(): Promise<TeamPerformanceData[]> {
    try {
      console.log('👥 [DashboardAnalytics] Buscando performance da equipe...');

      // Buscar técnicos ativos
      const { data: technicians, error: techError } = await supabase
        .from('technicians')
        .select('id, name, email, status')
        .eq('status', 'active');

      if (techError) {
        console.error('❌ Erro ao buscar técnicos:', techError);
        throw techError;
      }

      if (!technicians || technicians.length === 0) {
        return [];
      }

      // Buscar ordens dos últimos 30 dias para cada técnico
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const teamPerformance: TeamPerformanceData[] = [];

      for (const tech of technicians) {
        // Buscar ordens do técnico
        const { data: techOrders, error: ordersError } = await supabase
          .from('service_orders')
          .select('id, final_cost, status, completed_date')
          .eq('technician_id', tech.id)
          .gte('created_at', last30Days.toISOString());

        if (ordersError) {
          console.error(`❌ Erro ao buscar ordens do técnico ${tech.name}:`, ordersError);
          continue;
        }

        // Buscar avaliações do técnico
        const { data: ratings, error: ratingsError } = await supabase
          .from('customer_ratings')
          .select('rating')
          .eq('technician_id', tech.id)
          .gte('created_at', last30Days.toISOString());

        if (ratingsError) {
          console.error(`❌ Erro ao buscar avaliações do técnico ${tech.name}:`, ratingsError);
        }

        // Calcular métricas
        const orders = techOrders?.length || 0;
        const revenue = techOrders?.reduce((sum, order) => sum + (order.final_cost || 0), 0) || 0;
        const avgRating = ratings && ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
          : 4.5; // Default se não há avaliações

        // Determinar status baseado em ordens recentes
        let status = 'Disponível';
        const activeOrders = techOrders?.filter(order => 
          ['scheduled', 'in_progress', 'on_the_way'].includes(order.status)
        ) || [];

        if (activeOrders.length > 0) {
          status = activeOrders.length > 2 ? 'Ocupado' : 'Ativo';
        }

        teamPerformance.push({
          name: tech.name,
          orders,
          rating: Math.round(avgRating * 10) / 10, // Arredondar para 1 casa decimal
          status,
          technicianId: tech.id,
          revenue
        });
      }

      // Ordenar por número de ordens (mais produtivo primeiro)
      teamPerformance.sort((a, b) => b.orders - a.orders);

      console.log('✅ [DashboardAnalytics] Performance da equipe calculada:', teamPerformance);
      return teamPerformance;

    } catch (error) {
      console.error('❌ [DashboardAnalytics] Erro ao buscar performance da equipe:', error);
      return [];
    }
  }

  /**
   * FASE 3: Métricas de Crescimento com Dados Reais
   * Compara período atual com período anterior
   */
  static async getGrowthMetrics(): Promise<GrowthMetrics> {
    try {
      console.log('📈 [DashboardAnalytics] Calculando métricas de crescimento...');

      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const sixtyDaysAgo = new Date(today);
      sixtyDaysAgo.setDate(today.getDate() - 60);

      // Período atual (últimos 30 dias)
      const currentPeriodStart = thirtyDaysAgo.toISOString().split('T')[0];
      const currentPeriodEnd = today.toISOString().split('T')[0];

      // Período anterior (30-60 dias atrás)
      const previousPeriodStart = sixtyDaysAgo.toISOString().split('T')[0];
      const previousPeriodEnd = thirtyDaysAgo.toISOString().split('T')[0];

      // Buscar dados do período atual
      const [currentOrders, currentTransactions, currentClients] = await Promise.all([
        this.getOrdersInPeriod(currentPeriodStart, currentPeriodEnd),
        this.getRevenueInPeriod(currentPeriodStart, currentPeriodEnd),
        this.getClientsInPeriod(currentPeriodStart, currentPeriodEnd)
      ]);

      // Buscar dados do período anterior
      const [previousOrders, previousTransactions, previousClients] = await Promise.all([
        this.getOrdersInPeriod(previousPeriodStart, previousPeriodEnd),
        this.getRevenueInPeriod(previousPeriodStart, previousPeriodEnd),
        this.getClientsInPeriod(previousPeriodStart, previousPeriodEnd)
      ]);

      // Calcular crescimentos
      const revenueGrowth = this.calculateGrowthPercentage(currentTransactions, previousTransactions);
      const ordersGrowth = this.calculateGrowthPercentage(currentOrders.length, previousOrders.length);
      const clientsGrowth = this.calculateGrowthPercentage(currentClients, previousClients);
      
      const currentAvgOrderValue = currentOrders.length > 0 ? currentTransactions / currentOrders.length : 0;
      const previousAvgOrderValue = previousOrders.length > 0 ? previousTransactions / previousOrders.length : 0;
      const avgOrderValueGrowth = this.calculateGrowthPercentage(currentAvgOrderValue, previousAvgOrderValue);

      const metrics = {
        revenueGrowth,
        ordersGrowth,
        clientsGrowth,
        avgOrderValueGrowth
      };

      console.log('✅ [DashboardAnalytics] Métricas de crescimento calculadas:', metrics);
      return metrics;

    } catch (error) {
      console.error('❌ [DashboardAnalytics] Erro ao calcular crescimento:', error);
      return {
        revenueGrowth: 0,
        ordersGrowth: 0,
        clientsGrowth: 0,
        avgOrderValueGrowth: 0
      };
    }
  }

  // Métodos auxiliares privados
  private static async getOrdersInPeriod(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('service_orders')
      .select('id, final_cost')
      .gte('created_at', startDate + 'T00:00:00Z')
      .lte('created_at', endDate + 'T23:59:59Z');

    if (error) throw error;
    return data || [];
  }

  private static async getRevenueInPeriod(startDate: string, endDate: string): Promise<number> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('amount')
      .eq('type', 'income')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;
    return data?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
  }

  private static async getClientsInPeriod(startDate: string, endDate: string): Promise<number> {
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .gte('created_at', startDate + 'T00:00:00Z')
      .lte('created_at', endDate + 'T23:59:59Z');

    if (error) throw error;
    return data?.length || 0;
  }

  private static calculateGrowthPercentage(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  /**
   * FASE 4: Resumo Executivo com Dados Reais
   * Calcula métricas de eficiência, qualidade e pontualidade
   */
  static async getExecutiveSummary(): Promise<ExecutiveSummary> {
    try {
      console.log('📊 [DashboardAnalytics] Calculando resumo executivo...');

      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const startDate = last30Days.toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      // Buscar ordens dos últimos 30 dias
      const { data: orders, error: ordersError } = await supabase
        .from('service_orders')
        .select('id, status, created_at, scheduled_date, completed_date, final_cost')
        .gte('created_at', startDate + 'T00:00:00Z')
        .lte('created_at', endDate + 'T23:59:59Z');

      if (ordersError) {
        console.error('❌ Erro ao buscar ordens para resumo executivo:', ordersError);
        throw ordersError;
      }

      // Buscar avaliações dos clientes
      const { data: ratings, error: ratingsError } = await supabase
        .from('customer_ratings')
        .select('rating')
        .gte('created_at', startDate + 'T00:00:00Z')
        .lte('created_at', endDate + 'T23:59:59Z');

      if (ratingsError) {
        console.error('❌ Erro ao buscar avaliações:', ratingsError);
      }

      const totalOrders = orders?.length || 0;

      if (totalOrders === 0) {
        return {
          efficiency: 0,
          quality: 0,
          punctuality: 0,
          totalOrders: 0,
          avgCompletionTime: 0,
          customerSatisfaction: 0
        };
      }

      // 1. EFICIÊNCIA: % de ordens concluídas no prazo
      const completedOrders = orders?.filter(order =>
        order.status === 'completed' && order.completed_date
      ) || [];

      const onTimeOrders = completedOrders.filter(order => {
        if (!order.scheduled_date || !order.completed_date) return false;

        const scheduledDate = new Date(order.scheduled_date);
        const completedDate = new Date(order.completed_date);

        // Considerar "no prazo" se concluído até 1 dia após o agendado
        const maxDate = new Date(scheduledDate);
        maxDate.setDate(maxDate.getDate() + 1);

        return completedDate <= maxDate;
      });

      const efficiency = totalOrders > 0 ? (onTimeOrders.length / totalOrders) * 100 : 0;

      // 2. QUALIDADE: % de ordens sem retrabalho (assumindo que ordens canceladas = problemas de qualidade)
      const cancelledOrders = orders?.filter(order => order.status === 'cancelled') || [];
      const quality = totalOrders > 0 ? ((totalOrders - cancelledOrders.length) / totalOrders) * 100 : 0;

      // 3. PONTUALIDADE: % de ordens entregues no prazo (similar à eficiência, mas mais rigorosa)
      const deliveredOnTime = completedOrders.filter(order => {
        if (!order.scheduled_date || !order.completed_date) return false;

        const scheduledDate = new Date(order.scheduled_date);
        const completedDate = new Date(order.completed_date);

        // Pontualidade: concluído no mesmo dia agendado
        return completedDate.toDateString() === scheduledDate.toDateString();
      });

      const punctuality = totalOrders > 0 ? (deliveredOnTime.length / totalOrders) * 100 : 0;

      // 4. TEMPO MÉDIO DE CONCLUSÃO
      const completionTimes = completedOrders
        .filter(order => order.created_at && order.completed_date)
        .map(order => {
          const created = new Date(order.created_at);
          const completed = new Date(order.completed_date!);
          return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // em dias
        });

      const avgCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
        : 0;

      // 5. SATISFAÇÃO DO CLIENTE
      const customerSatisfaction = ratings && ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

      const summary = {
        efficiency: Math.round(efficiency * 10) / 10,
        quality: Math.round(quality * 10) / 10,
        punctuality: Math.round(punctuality * 10) / 10,
        totalOrders,
        avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
        customerSatisfaction: Math.round(customerSatisfaction * 10) / 10
      };

      console.log('✅ [DashboardAnalytics] Resumo executivo calculado:', summary);
      return summary;

    } catch (error) {
      console.error('❌ [DashboardAnalytics] Erro ao calcular resumo executivo:', error);
      return {
        efficiency: 0,
        quality: 0,
        punctuality: 0,
        totalOrders: 0,
        avgCompletionTime: 0,
        customerSatisfaction: 0
      };
    }
  }
}
