// ===================================================================
// 🤖 TIPOS PARA SISTEMA DE IA E PREVISÕES (MVP 4)
// ===================================================================

// Tipos para previsão de demanda
export interface DemandPrediction {
  id: string;
  region: string;
  period: string; // 'next_week' | 'next_month' | 'next_quarter'
  predicted_orders: number;
  confidence: number; // 0-1 (0-100%)
  factors: DemandFactor[];
  recommendations: string[];
  historical_data: HistoricalDataPoint[];
  created_at: string;
  expires_at: string;
}

export interface DemandFactor {
  name: string;
  impact: number; // -1 a 1 (negativo = reduz demanda, positivo = aumenta)
  description: string;
  confidence: number;
}

export interface HistoricalDataPoint {
  date: string;
  orders: number;
  revenue: number;
  events?: string[]; // eventos que podem ter influenciado
}

// Tipos para otimização de estoque
export interface StockOptimization {
  technician_id: string;
  analysis_date: string;
  recommendations: StockRecommendation[];
  total_savings_potential: number;
  confidence_score: number;
}

export interface StockRecommendation {
  item_id: string;
  item_name: string;
  current_stock: number;
  recommended_stock: number;
  action: 'increase' | 'decrease' | 'maintain';
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cost_impact: number; // valor em R$
  usage_prediction: UsagePrediction;
}

export interface UsagePrediction {
  next_week: number;
  next_month: number;
  seasonal_factor: number;
  trend_factor: number;
  confidence: number;
}

// Tipos para alertas inteligentes
export interface IntelligentAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  suggested_actions: SuggestedAction[];
  confidence: number;
  data_points: AlertDataPoint[];
  created_at: string;
  expires_at?: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

export type AlertType = 
  | 'anomaly'           // Anomalia detectada
  | 'opportunity'       // Oportunidade identificada
  | 'risk'             // Risco potencial
  | 'performance'      // Problema de performance
  | 'efficiency'       // Oportunidade de eficiência
  | 'customer'         // Relacionado a clientes
  | 'financial'        // Relacionado a finanças
  | 'operational';     // Relacionado a operações

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SuggestedAction {
  title: string;
  description: string;
  priority: number; // 1-5
  estimated_impact: string;
  estimated_effort: 'low' | 'medium' | 'high';
  category: 'immediate' | 'short_term' | 'long_term';
}

export interface AlertDataPoint {
  metric: string;
  current_value: number;
  expected_value: number;
  deviation: number; // percentual
  timestamp: string;
}

// Tipos para análise de performance
export interface PerformanceAnalysis {
  entity_id: string; // ID do técnico, oficina, etc.
  entity_type: 'technician' | 'workshop' | 'region';
  analysis_period: string;
  metrics: PerformanceMetric[];
  score: number; // 0-100
  ranking: number; // posição no ranking
  trends: TrendAnalysis[];
  recommendations: PerformanceRecommendation[];
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  benchmark: number; // valor de referência
  performance: 'excellent' | 'good' | 'average' | 'below_average' | 'poor';
  trend: 'improving' | 'stable' | 'declining';
  weight: number; // peso na pontuação geral
}

export interface TrendAnalysis {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  rate: number; // taxa de mudança
  significance: 'high' | 'medium' | 'low';
  prediction: number; // valor previsto para próximo período
}

export interface PerformanceRecommendation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  category: string;
  metrics_affected: string[];
}

// Tipos para análise de satisfação do cliente
export interface CustomerSatisfactionAnalysis {
  period: string;
  overall_score: number; // 0-10
  response_rate: number; // percentual
  nps_score: number; // Net Promoter Score
  segments: SatisfactionSegment[];
  trends: SatisfactionTrend[];
  insights: CustomerInsight[];
}

export interface SatisfactionSegment {
  name: string;
  score: number;
  count: number;
  percentage: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface SatisfactionTrend {
  period: string;
  score: number;
  volume: number;
  key_drivers: string[];
}

export interface CustomerInsight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  frequency: number;
  impact: 'high' | 'medium' | 'low';
  suggested_actions: string[];
}

// Tipos para configuração de IA
export interface AIConfiguration {
  demand_prediction: {
    enabled: boolean;
    update_frequency: 'daily' | 'weekly';
    confidence_threshold: number;
    historical_periods: number;
  };
  stock_optimization: {
    enabled: boolean;
    update_frequency: 'daily' | 'weekly';
    safety_stock_days: number;
    cost_threshold: number;
  };
  intelligent_alerts: {
    enabled: boolean;
    severity_threshold: AlertSeverity;
    auto_acknowledge_low: boolean;
    notification_channels: string[];
  };
  performance_analysis: {
    enabled: boolean;
    benchmark_period: 'month' | 'quarter' | 'year';
    ranking_enabled: boolean;
    auto_recommendations: boolean;
  };
}

// Tipos para métricas de IA
export interface AIMetrics {
  prediction_accuracy: number; // precisão das previsões
  alert_precision: number; // precisão dos alertas
  recommendation_adoption: number; // taxa de adoção das recomendações
  user_satisfaction: number; // satisfação com as funcionalidades de IA
  processing_time: number; // tempo médio de processamento
  last_updated: string;
}
