import { supabase } from '@/integrations/supabase/client';

export interface ProductivityMetrics {
  id?: string;
  technician_id: string;
  metric_date: string;
  metric_period: 'daily' | 'weekly' | 'monthly';
  orders_completed: number;
  orders_started: number;
  total_work_hours: number;
  average_service_time_minutes: number;
  customer_satisfaction_avg?: number;
  on_time_arrivals: number;
  late_arrivals: number;
  punctuality_rate: number;
  total_distance_km: number;
  optimized_distance_km?: number;
  route_efficiency_rate?: number;
  total_revenue: number;
  average_order_value: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductivitySummary {
  period: string;
  metrics: ProductivityMetrics;
  trends: {
    orders_completed: number; // % change from previous period
    efficiency: number;
    satisfaction: number;
    revenue: number;
  };
  achievements: string[];
  recommendations: string[];
}

export interface ProductivityComparison {
  technician: ProductivityMetrics;
  teamAverage: ProductivityMetrics;
  ranking: {
    position: number;
    total: number;
    percentile: number;
  };
}

/**
 * Serviço para gerenciar métricas de produtividade dos técnicos
 */
export class ProductivityService {
  /**
   * Calcular métricas diárias para um técnico
   */
  static async calculateDailyMetrics(
    technicianId: string, 
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<void> {
    try {
      console.log('🔄 [ProductivityService] Calculando métricas diárias...');

      // Chamar função do banco para calcular métricas
      const { error } = await supabase.rpc('calculate_daily_productivity_metrics', {
        p_technician_id: technicianId,
        p_date: date
      });

      if (error) {
        console.error('❌ [ProductivityService] Erro ao calcular métricas:', error);
        throw error;
      }

      console.log('✅ [ProductivityService] Métricas calculadas com sucesso');
    } catch (error) {
      console.error('❌ [ProductivityService] Erro geral ao calcular métricas:', error);
      throw error;
    }
  }

  /**
   * Obter métricas de um técnico por período
   */
  static async getMetrics(
    technicianId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    startDate?: string,
    endDate?: string
  ): Promise<ProductivityMetrics[]> {
    try {
      let query = supabase
        .from('technician_productivity_metrics')
        .select('*')
        .eq('technician_id', technicianId)
        .eq('metric_period', period)
        .order('metric_date', { ascending: false });

      if (startDate) {
        query = query.gte('metric_date', startDate);
      }

      if (endDate) {
        query = query.lte('metric_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [ProductivityService] Erro ao buscar métricas:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ [ProductivityService] Erro geral ao buscar métricas:', error);
      throw error;
    }
  }

  /**
   * Obter resumo de produtividade com tendências
   */
  static async getProductivitySummary(
    technicianId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<ProductivitySummary> {
    try {
      const metrics = await ProductivityService.getMetrics(technicianId, period);
      
      if (metrics.length === 0) {
        throw new Error('Nenhuma métrica encontrada para o período');
      }

      const currentMetrics = metrics[0];
      const previousMetrics = metrics[1];

      // Calcular tendências
      const trends = {
        orders_completed: previousMetrics 
          ? ((currentMetrics.orders_completed - previousMetrics.orders_completed) / previousMetrics.orders_completed) * 100
          : 0,
        efficiency: previousMetrics && currentMetrics.route_efficiency_rate && previousMetrics.route_efficiency_rate
          ? currentMetrics.route_efficiency_rate - previousMetrics.route_efficiency_rate
          : 0,
        satisfaction: previousMetrics && currentMetrics.customer_satisfaction_avg && previousMetrics.customer_satisfaction_avg
          ? currentMetrics.customer_satisfaction_avg - previousMetrics.customer_satisfaction_avg
          : 0,
        revenue: previousMetrics
          ? ((currentMetrics.total_revenue - previousMetrics.total_revenue) / previousMetrics.total_revenue) * 100
          : 0
      };

      // Gerar conquistas
      const achievements = ProductivityService.generateAchievements(currentMetrics, trends);

      // Gerar recomendações
      const recommendations = ProductivityService.generateRecommendations(currentMetrics, trends);

      return {
        period: currentMetrics.metric_date,
        metrics: currentMetrics,
        trends,
        achievements,
        recommendations
      };
    } catch (error) {
      console.error('❌ [ProductivityService] Erro ao gerar resumo:', error);
      throw error;
    }
  }

  /**
   * Comparar produtividade com a equipe
   */
  static async getProductivityComparison(
    technicianId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    date?: string
  ): Promise<ProductivityComparison> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];

      // Buscar métricas do técnico
      const { data: technicianData, error: technicianError } = await supabase
        .from('technician_productivity_metrics')
        .select('*')
        .eq('technician_id', technicianId)
        .eq('metric_period', period)
        .eq('metric_date', targetDate)
        .single();

      if (technicianError) {
        throw technicianError;
      }

      // Buscar métricas de todos os técnicos para comparação
      const { data: allMetrics, error: allError } = await supabase
        .from('technician_productivity_metrics')
        .select('*')
        .eq('metric_period', period)
        .eq('metric_date', targetDate);

      if (allError) {
        throw allError;
      }

      // Calcular médias da equipe
      const teamAverage = ProductivityService.calculateTeamAverage(allMetrics);

      // Calcular ranking
      const sortedByOrders = allMetrics
        .sort((a, b) => b.orders_completed - a.orders_completed);
      
      const position = sortedByOrders.findIndex(m => m.technician_id === technicianId) + 1;
      const total = sortedByOrders.length;
      const percentile = ((total - position + 1) / total) * 100;

      return {
        technician: technicianData,
        teamAverage,
        ranking: {
          position,
          total,
          percentile: Math.round(percentile)
        }
      };
    } catch (error) {
      console.error('❌ [ProductivityService] Erro ao comparar produtividade:', error);
      throw error;
    }
  }

  /**
   * Calcular média da equipe
   */
  private static calculateTeamAverage(metrics: ProductivityMetrics[]): ProductivityMetrics {
    if (metrics.length === 0) {
      throw new Error('Nenhuma métrica disponível para calcular média da equipe');
    }

    const totals = metrics.reduce((acc, metric) => ({
      orders_completed: acc.orders_completed + metric.orders_completed,
      orders_started: acc.orders_started + metric.orders_started,
      total_work_hours: acc.total_work_hours + metric.total_work_hours,
      average_service_time_minutes: acc.average_service_time_minutes + metric.average_service_time_minutes,
      customer_satisfaction_avg: acc.customer_satisfaction_avg + (metric.customer_satisfaction_avg || 0),
      on_time_arrivals: acc.on_time_arrivals + metric.on_time_arrivals,
      late_arrivals: acc.late_arrivals + metric.late_arrivals,
      punctuality_rate: acc.punctuality_rate + metric.punctuality_rate,
      total_distance_km: acc.total_distance_km + metric.total_distance_km,
      route_efficiency_rate: acc.route_efficiency_rate + (metric.route_efficiency_rate || 0),
      total_revenue: acc.total_revenue + metric.total_revenue,
      average_order_value: acc.average_order_value + metric.average_order_value
    }), {
      orders_completed: 0,
      orders_started: 0,
      total_work_hours: 0,
      average_service_time_minutes: 0,
      customer_satisfaction_avg: 0,
      on_time_arrivals: 0,
      late_arrivals: 0,
      punctuality_rate: 0,
      total_distance_km: 0,
      route_efficiency_rate: 0,
      total_revenue: 0,
      average_order_value: 0
    });

    const count = metrics.length;

    return {
      technician_id: 'team_average',
      metric_date: metrics[0].metric_date,
      metric_period: metrics[0].metric_period,
      orders_completed: Math.round(totals.orders_completed / count),
      orders_started: Math.round(totals.orders_started / count),
      total_work_hours: Number((totals.total_work_hours / count).toFixed(2)),
      average_service_time_minutes: Number((totals.average_service_time_minutes / count).toFixed(2)),
      customer_satisfaction_avg: Number((totals.customer_satisfaction_avg / count).toFixed(2)),
      on_time_arrivals: Math.round(totals.on_time_arrivals / count),
      late_arrivals: Math.round(totals.late_arrivals / count),
      punctuality_rate: Number((totals.punctuality_rate / count).toFixed(2)),
      total_distance_km: Number((totals.total_distance_km / count).toFixed(2)),
      route_efficiency_rate: Number((totals.route_efficiency_rate / count).toFixed(2)),
      total_revenue: Number((totals.total_revenue / count).toFixed(2)),
      average_order_value: Number((totals.average_order_value / count).toFixed(2))
    };
  }

  /**
   * Gerar conquistas baseadas nas métricas
   */
  private static generateAchievements(metrics: ProductivityMetrics, trends: any): string[] {
    const achievements: string[] = [];

    // Conquistas baseadas em números absolutos
    if (metrics.orders_completed >= 10) {
      achievements.push('🏆 Mais de 10 ordens concluídas!');
    }

    if (metrics.customer_satisfaction_avg && metrics.customer_satisfaction_avg >= 4.5) {
      achievements.push('⭐ Excelente avaliação dos clientes!');
    }

    if (metrics.punctuality_rate >= 95) {
      achievements.push('⏰ Pontualidade exemplar!');
    }

    if (metrics.route_efficiency_rate && metrics.route_efficiency_rate >= 90) {
      achievements.push('🗺️ Rotas super otimizadas!');
    }

    // Conquistas baseadas em tendências
    if (trends.orders_completed > 20) {
      achievements.push('📈 Produtividade em alta!');
    }

    if (trends.satisfaction > 0.5) {
      achievements.push('😊 Satisfação dos clientes melhorando!');
    }

    if (trends.revenue > 15) {
      achievements.push('💰 Receita crescendo!');
    }

    return achievements;
  }

  /**
   * Gerar recomendações baseadas nas métricas
   */
  private static generateRecommendations(metrics: ProductivityMetrics, trends: any): string[] {
    const recommendations: string[] = [];

    // Recomendações baseadas em métricas baixas
    if (metrics.punctuality_rate < 80) {
      recommendations.push('⏰ Tente sair mais cedo para melhorar a pontualidade');
    }

    if (metrics.customer_satisfaction_avg && metrics.customer_satisfaction_avg < 4.0) {
      recommendations.push('😊 Foque na comunicação e qualidade do atendimento');
    }

    if (metrics.average_service_time_minutes > 120) {
      recommendations.push('⚡ Considere otimizar o tempo de atendimento');
    }

    if (metrics.route_efficiency_rate && metrics.route_efficiency_rate < 70) {
      recommendations.push('🗺️ Use mais o sistema de roteirização para otimizar rotas');
    }

    // Recomendações baseadas em tendências negativas
    if (trends.orders_completed < -10) {
      recommendations.push('📊 Analise os fatores que podem estar afetando sua produtividade');
    }

    if (trends.satisfaction < -0.3) {
      recommendations.push('🎯 Revise os processos de atendimento ao cliente');
    }

    // Recomendações gerais se não houver problemas específicos
    if (recommendations.length === 0) {
      recommendations.push('🚀 Continue o excelente trabalho!');
      recommendations.push('📚 Considere participar de treinamentos para aprimorar ainda mais suas habilidades');
    }

    return recommendations;
  }

  /**
   * Exportar relatório de produtividade
   */
  static async exportProductivityReport(
    technicianId: string,
    startDate: string,
    endDate: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const metrics = await ProductivityService.getMetrics(
        technicianId, 
        'daily', 
        startDate, 
        endDate
      );

      if (format === 'csv') {
        return ProductivityService.convertToCSV(metrics);
      }

      return JSON.stringify(metrics, null, 2);
    } catch (error) {
      console.error('❌ [ProductivityService] Erro ao exportar relatório:', error);
      throw error;
    }
  }

  /**
   * Converter métricas para CSV
   */
  private static convertToCSV(metrics: ProductivityMetrics[]): string {
    if (metrics.length === 0) {
      return 'Nenhuma métrica encontrada';
    }

    const headers = Object.keys(metrics[0]).join(',');
    const rows = metrics.map(metric =>
      Object.values(metric).map(value =>
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }
}

// Função auxiliar para download de arquivo
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
