// ===================================================================
// 🤖 SERVIÇO DE IA E PREVISÕES (MVP 4)
// ===================================================================

import { supabase } from '@/integrations/supabase/client';
import {
  DemandPrediction,
  StockOptimization,
  IntelligentAlert,
  PerformanceAnalysis,
  CustomerSatisfactionAnalysis,
  AIConfiguration,
  AIMetrics,
  AlertType,
  AlertSeverity
} from '@/types/ai';

/**
 * Serviço principal para funcionalidades de IA e análise preditiva
 */
export class AIService {
  private static config: AIConfiguration = {
    demand_prediction: {
      enabled: true,
      update_frequency: 'daily',
      confidence_threshold: 0.7,
      historical_periods: 12
    },
    stock_optimization: {
      enabled: true,
      update_frequency: 'weekly',
      safety_stock_days: 7,
      cost_threshold: 100
    },
    intelligent_alerts: {
      enabled: true,
      severity_threshold: 'medium',
      auto_acknowledge_low: true,
      notification_channels: ['in_app', 'email']
    },
    performance_analysis: {
      enabled: true,
      benchmark_period: 'month',
      ranking_enabled: true,
      auto_recommendations: true
    }
  };

  /**
   * Prever demanda para uma região específica
   */
  static async predictDemand(
    region: string = 'all',
    period: string = 'next_month'
  ): Promise<DemandPrediction> {
    try {
      console.log('🔄 [AIService] Prevendo demanda:', { region, period });

      if (!this.config.demand_prediction.enabled) {
        throw new Error('Previsão de demanda está desabilitada');
      }

      // Buscar dados históricos
      const historicalData = await this.getHistoricalOrderData(region);
      
      // Calcular previsão usando algoritmo simples
      const prediction = this.calculateDemandPrediction(historicalData, period);
      
      // Salvar previsão no banco
      const { data, error } = await supabase
        .from('demand_predictions')
        .insert({
          region,
          period,
          predicted_orders: prediction.predicted_orders,
          confidence: prediction.confidence,
          factors: prediction.factors,
          recommendations: prediction.recommendations,
          historical_data: prediction.historical_data,
          expires_at: this.calculateExpirationDate(period)
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ [AIService] Previsão de demanda gerada com sucesso');
      return data;

    } catch (error) {
      console.error('❌ [AIService] Erro ao prever demanda:', error);
      throw error;
    }
  }

  /**
   * Otimizar estoque para um técnico
   */
  static async optimizeStock(technicianId: string): Promise<StockOptimization> {
    try {
      console.log('🔄 [AIService] Otimizando estoque para técnico:', technicianId);

      if (!this.config.stock_optimization.enabled) {
        throw new Error('Otimização de estoque está desabilitada');
      }

      // Buscar dados de uso de estoque
      const { data: stockData, error: stockError } = await supabase
        .from('technician_stock_movements')
        .select(`
          *,
          technician_stock_items(name, category, unit_cost)
        `)
        .eq('technician_id', technicianId)
        .gte('created_at', this.getDateDaysAgo(90)) // últimos 90 dias
        .order('created_at', { ascending: false });

      if (stockError) throw stockError;

      // Buscar estoque atual
      const { data: currentStock, error: currentError } = await supabase
        .from('technician_stock')
        .select(`
          *,
          technician_stock_items(name, category, unit_cost)
        `)
        .eq('technician_id', technicianId);

      if (currentError) throw currentError;

      // Calcular recomendações
      const recommendations = this.calculateStockRecommendations(
        stockData || [],
        currentStock || []
      );

      const optimization: StockOptimization = {
        technician_id: technicianId,
        analysis_date: new Date().toISOString(),
        recommendations,
        total_savings_potential: recommendations.reduce((sum, rec) => sum + rec.cost_impact, 0),
        confidence_score: this.calculateOverallConfidence(recommendations)
      };

      console.log('✅ [AIService] Otimização de estoque concluída');
      return optimization;

    } catch (error) {
      console.error('❌ [AIService] Erro ao otimizar estoque:', error);
      throw error;
    }
  }

  /**
   * Gerar alertas inteligentes
   */
  static async generateIntelligentAlerts(): Promise<IntelligentAlert[]> {
    try {
      console.log('🔄 [AIService] Gerando alertas inteligentes');

      if (!this.config.intelligent_alerts.enabled) {
        return [];
      }

      const alerts: IntelligentAlert[] = [];

      // Analisar métricas atuais
      const currentMetrics = await this.getCurrentMetrics();
      
      // Detectar anomalias
      const anomalies = await this.detectAnomalies(currentMetrics);
      alerts.push(...anomalies);

      // Identificar oportunidades
      const opportunities = await this.identifyOpportunities(currentMetrics);
      alerts.push(...opportunities);

      // Detectar riscos
      const risks = await this.detectRisks(currentMetrics);
      alerts.push(...risks);

      // Filtrar por severidade
      const filteredAlerts = alerts.filter(alert => 
        this.getSeverityLevel(alert.severity) >= 
        this.getSeverityLevel(this.config.intelligent_alerts.severity_threshold)
      );

      // Salvar alertas no banco
      for (const alert of filteredAlerts) {
        await this.saveAlert(alert);
      }

      console.log(`✅ [AIService] ${filteredAlerts.length} alertas inteligentes gerados`);
      return filteredAlerts;

    } catch (error) {
      console.error('❌ [AIService] Erro ao gerar alertas:', error);
      return [];
    }
  }

  /**
   * Analisar performance de uma entidade
   */
  static async analyzePerformance(
    entityId: string,
    entityType: 'technician' | 'workshop' | 'region'
  ): Promise<PerformanceAnalysis> {
    try {
      console.log('🔄 [AIService] Analisando performance:', { entityId, entityType });

      // Buscar dados de performance
      const performanceData = await this.getPerformanceData(entityId, entityType);
      
      // Calcular métricas
      const metrics = this.calculatePerformanceMetrics(performanceData, entityType);
      
      // Calcular score geral
      const score = this.calculatePerformanceScore(metrics);
      
      // Calcular ranking
      const ranking = await this.calculateRanking(entityId, entityType, score);
      
      // Analisar tendências
      const trends = this.analyzeTrends(performanceData);
      
      // Gerar recomendações
      const recommendations = this.generatePerformanceRecommendations(metrics, trends);

      const analysis: PerformanceAnalysis = {
        entity_id: entityId,
        entity_type: entityType,
        analysis_period: this.getCurrentPeriod(),
        metrics,
        score,
        ranking,
        trends,
        recommendations
      };

      console.log('✅ [AIService] Análise de performance concluída');
      return analysis;

    } catch (error) {
      console.error('❌ [AIService] Erro ao analisar performance:', error);
      throw error;
    }
  }

  /**
   * Analisar satisfação do cliente
   */
  static async analyzeCustomerSatisfaction(period: string = 'month'): Promise<CustomerSatisfactionAnalysis> {
    try {
      console.log('🔄 [AIService] Analisando satisfação do cliente');

      // Buscar dados de avaliações (simulado - implementar quando houver sistema de avaliação)
      const satisfactionData = await this.getSatisfactionData(period);
      
      const analysis: CustomerSatisfactionAnalysis = {
        period,
        overall_score: this.calculateOverallSatisfaction(satisfactionData),
        response_rate: this.calculateResponseRate(satisfactionData),
        nps_score: this.calculateNPS(satisfactionData),
        segments: this.analyzeSatisfactionSegments(satisfactionData),
        trends: this.analyzeSatisfactionTrends(satisfactionData),
        insights: this.generateCustomerInsights(satisfactionData)
      };

      console.log('✅ [AIService] Análise de satisfação concluída');
      return analysis;

    } catch (error) {
      console.error('❌ [AIService] Erro ao analisar satisfação:', error);
      throw error;
    }
  }

  /**
   * Obter métricas de IA
   */
  static async getAIMetrics(): Promise<AIMetrics> {
    try {
      // Calcular métricas de precisão das previsões
      const predictionAccuracy = await this.calculatePredictionAccuracy();
      
      // Calcular precisão dos alertas
      const alertPrecision = await this.calculateAlertPrecision();
      
      // Calcular taxa de adoção das recomendações
      const recommendationAdoption = await this.calculateRecommendationAdoption();
      
      // Calcular satisfação do usuário com IA
      const userSatisfaction = await this.calculateAIUserSatisfaction();
      
      // Calcular tempo médio de processamento
      const processingTime = await this.calculateProcessingTime();

      return {
        prediction_accuracy: predictionAccuracy,
        alert_precision: alertPrecision,
        recommendation_adoption: recommendationAdoption,
        user_satisfaction: userSatisfaction,
        processing_time: processingTime,
        last_updated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [AIService] Erro ao obter métricas de IA:', error);
      throw error;
    }
  }

  // ===================================================================
  // MÉTODOS PRIVADOS PARA CÁLCULOS E ANÁLISES
  // ===================================================================

  private static async getHistoricalOrderData(region: string) {
    const { data, error } = await supabase
      .from('service_orders')
      .select('created_at, final_value, status')
      .gte('created_at', this.getDateDaysAgo(365)) // último ano
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  private static calculateDemandPrediction(historicalData: any[], period: string): Partial<DemandPrediction> {
    // Algoritmo simples de previsão baseado em média móvel e sazonalidade
    const monthlyData = this.groupByMonth(historicalData);
    const trend = this.calculateTrend(monthlyData);
    const seasonality = this.calculateSeasonality(monthlyData);
    
    const basePredict = monthlyData.length > 0 ? 
      monthlyData[monthlyData.length - 1].orders : 0;
    
    const predicted_orders = Math.round(basePredict * trend * seasonality);
    
    return {
      predicted_orders,
      confidence: Math.min(0.9, monthlyData.length / 12), // mais dados = mais confiança
      factors: [
        { name: 'Tendência histórica', impact: trend - 1, description: 'Baseado nos últimos 12 meses', confidence: 0.8 },
        { name: 'Sazonalidade', impact: seasonality - 1, description: 'Padrão sazonal identificado', confidence: 0.7 }
      ],
      recommendations: this.generateDemandRecommendations(predicted_orders, basePredict),
      historical_data: monthlyData.map(item => ({
        date: item.month,
        orders: item.orders,
        revenue: item.revenue
      }))
    };
  }

  private static groupByMonth(data: any[]) {
    const grouped = data.reduce((acc, item) => {
      const month = item.created_at.substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { month, orders: 0, revenue: 0 };
      }
      acc[month].orders++;
      acc[month].revenue += item.final_value || 0;
      return acc;
    }, {});
    
    return Object.values(grouped);
  }

  private static calculateTrend(monthlyData: any[]): number {
    if (monthlyData.length < 2) return 1;
    
    const recent = monthlyData.slice(-3).reduce((sum, item) => sum + item.orders, 0) / 3;
    const older = monthlyData.slice(-6, -3).reduce((sum, item) => sum + item.orders, 0) / 3;
    
    return older > 0 ? recent / older : 1;
  }

  private static calculateSeasonality(monthlyData: any[]): number {
    // Simplificado: assumir que dezembro tem 20% mais demanda
    const currentMonth = new Date().getMonth();
    return currentMonth === 11 ? 1.2 : 1.0;
  }

  private static generateDemandRecommendations(predicted: number, current: number): string[] {
    const recommendations = [];
    
    if (predicted > current * 1.2) {
      recommendations.push('Considere aumentar a equipe de técnicos');
      recommendations.push('Prepare estoque adicional para alta demanda');
    } else if (predicted < current * 0.8) {
      recommendations.push('Oportunidade para campanhas de marketing');
      recommendations.push('Considere promoções para estimular demanda');
    }
    
    return recommendations;
  }

  // Métodos utilitários
  private static getDateDaysAgo(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }

  private static calculateExpirationDate(period: string): string {
    const days = period === 'next_week' ? 7 : period === 'next_month' ? 30 : 90;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  private static getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private static getSeverityLevel(severity: AlertSeverity): number {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[severity] || 1;
  }

  // Métodos placeholder para implementação futura
  private static async getCurrentMetrics() { return {}; }
  private static async detectAnomalies(metrics: any): Promise<IntelligentAlert[]> { return []; }
  private static async identifyOpportunities(metrics: any): Promise<IntelligentAlert[]> { return []; }
  private static async detectRisks(metrics: any): Promise<IntelligentAlert[]> { return []; }
  private static async saveAlert(alert: IntelligentAlert) {}
  private static calculateStockRecommendations(movements: any[], current: any[]) { return []; }
  private static calculateOverallConfidence(recommendations: any[]): number { return 0.8; }
  private static async getPerformanceData(entityId: string, entityType: string) { return {}; }
  private static calculatePerformanceMetrics(data: any, entityType: string) { return []; }
  private static calculatePerformanceScore(metrics: any[]): number { return 85; }
  private static async calculateRanking(entityId: string, entityType: string, score: number): Promise<number> { return 1; }
  private static analyzeTrends(data: any) { return []; }
  private static generatePerformanceRecommendations(metrics: any[], trends: any[]) { return []; }
  private static async getSatisfactionData(period: string) { return []; }
  private static calculateOverallSatisfaction(data: any[]): number { return 8.5; }
  private static calculateResponseRate(data: any[]): number { return 0.75; }
  private static calculateNPS(data: any[]): number { return 50; }
  private static analyzeSatisfactionSegments(data: any[]) { return []; }
  private static analyzeSatisfactionTrends(data: any[]) { return []; }
  private static generateCustomerInsights(data: any[]) { return []; }
  private static async calculatePredictionAccuracy(): Promise<number> { return 0.85; }
  private static async calculateAlertPrecision(): Promise<number> { return 0.78; }
  private static async calculateRecommendationAdoption(): Promise<number> { return 0.65; }
  private static async calculateAIUserSatisfaction(): Promise<number> { return 0.82; }
  private static async calculateProcessingTime(): Promise<number> { return 1250; }
}
