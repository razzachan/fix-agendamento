// ===================================================================
// 🤖 HOOK PARA SISTEMA DE IA E PREVISÕES (MVP 4)
// ===================================================================

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AIService } from '@/services/ai/aiService';
import {
  DemandPrediction,
  StockOptimization,
  IntelligentAlert,
  PerformanceAnalysis,
  CustomerSatisfactionAnalysis,
  AIMetrics,
  AlertSeverity
} from '@/types/ai';

/**
 * Hook principal para funcionalidades de IA
 */
export function useAI() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Query para métricas de IA
   */
  const {
    data: aiMetrics,
    isLoading: isLoadingMetrics,
    error: metricsError
  } = useQuery({
    queryKey: ['ai-metrics'],
    queryFn: AIService.getAIMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 60 * 1000 // 1 minuto
  });

  /**
   * Query para alertas inteligentes
   */
  const {
    data: intelligentAlerts = [],
    isLoading: isLoadingAlerts,
    error: alertsError
  } = useQuery({
    queryKey: ['intelligent-alerts'],
    queryFn: AIService.generateIntelligentAlerts,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 30 * 1000 // 30 segundos
  });

  /**
   * Mutation para gerar previsão de demanda
   */
  const demandPredictionMutation = useMutation({
    mutationFn: ({ region, period }: { region?: string; period?: string }) =>
      AIService.predictDemand(region, period),
    onMutate: () => setIsProcessing(true),
    onSettled: () => setIsProcessing(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demand-predictions'] });
      console.log('✅ [useAI] Previsão de demanda gerada');
    },
    onError: (error) => {
      console.error('❌ [useAI] Erro ao gerar previsão de demanda:', error);
    }
  });

  /**
   * Mutation para otimização de estoque
   */
  const stockOptimizationMutation = useMutation({
    mutationFn: (technicianId: string) =>
      AIService.optimizeStock(technicianId),
    onMutate: () => setIsProcessing(true),
    onSettled: () => setIsProcessing(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-optimizations'] });
      console.log('✅ [useAI] Otimização de estoque concluída');
    },
    onError: (error) => {
      console.error('❌ [useAI] Erro ao otimizar estoque:', error);
    }
  });

  /**
   * Mutation para análise de performance
   */
  const performanceAnalysisMutation = useMutation({
    mutationFn: ({ 
      entityId, 
      entityType 
    }: { 
      entityId: string; 
      entityType: 'technician' | 'workshop' | 'region' 
    }) =>
      AIService.analyzePerformance(entityId, entityType),
    onMutate: () => setIsProcessing(true),
    onSettled: () => setIsProcessing(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-analyses'] });
      console.log('✅ [useAI] Análise de performance concluída');
    },
    onError: (error) => {
      console.error('❌ [useAI] Erro ao analisar performance:', error);
    }
  });

  /**
   * Gerar previsão de demanda
   */
  const predictDemand = useCallback(async (region?: string, period?: string) => {
    try {
      const prediction = await demandPredictionMutation.mutateAsync({ region, period });
      return prediction;
    } catch (error) {
      throw error;
    }
  }, [demandPredictionMutation]);

  /**
   * Otimizar estoque
   */
  const optimizeStock = useCallback(async (technicianId: string) => {
    try {
      const optimization = await stockOptimizationMutation.mutateAsync(technicianId);
      return optimization;
    } catch (error) {
      throw error;
    }
  }, [stockOptimizationMutation]);

  /**
   * Analisar performance
   */
  const analyzePerformance = useCallback(async (
    entityId: string, 
    entityType: 'technician' | 'workshop' | 'region'
  ) => {
    try {
      const analysis = await performanceAnalysisMutation.mutateAsync({ entityId, entityType });
      return analysis;
    } catch (error) {
      throw error;
    }
  }, [performanceAnalysisMutation]);

  /**
   * Filtrar alertas por severidade
   */
  const filterAlertsBySeverity = useCallback((severity: AlertSeverity) => {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const minLevel = severityLevels[severity];
    
    return intelligentAlerts.filter(alert => 
      severityLevels[alert.severity] >= minLevel
    );
  }, [intelligentAlerts]);

  /**
   * Obter alertas críticos
   */
  const getCriticalAlerts = useCallback(() => {
    return intelligentAlerts.filter(alert => alert.severity === 'critical');
  }, [intelligentAlerts]);

  /**
   * Obter alertas não reconhecidos
   */
  const getUnacknowledgedAlerts = useCallback(() => {
    return intelligentAlerts.filter(alert => !alert.acknowledged);
  }, [intelligentAlerts]);

  return {
    // Estados
    isProcessing,
    aiMetrics,
    intelligentAlerts,
    
    // Ações
    predictDemand,
    optimizeStock,
    analyzePerformance,
    
    // Utilitários para alertas
    filterAlertsBySeverity,
    getCriticalAlerts,
    getUnacknowledgedAlerts,
    
    // Estados de loading
    isLoadingMetrics,
    isLoadingAlerts,
    isPredictingDemand: demandPredictionMutation.isPending,
    isOptimizingStock: stockOptimizationMutation.isPending,
    isAnalyzingPerformance: performanceAnalysisMutation.isPending,
    
    // Erros
    metricsError,
    alertsError,
    demandPredictionError: demandPredictionMutation.error,
    stockOptimizationError: stockOptimizationMutation.error,
    performanceAnalysisError: performanceAnalysisMutation.error,
    
    // Refresh
    refreshAlerts: () => queryClient.invalidateQueries({ queryKey: ['intelligent-alerts'] }),
    refreshMetrics: () => queryClient.invalidateQueries({ queryKey: ['ai-metrics'] })
  };
}

/**
 * Hook para previsões de demanda
 */
export function useDemandPredictions() {
  const {
    data: predictions = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['demand-predictions'],
    queryFn: async () => {
      // TODO: Implementar busca de previsões salvas quando houver backend
      return [];
    },
    staleTime: 10 * 60 * 1000 // 10 minutos
  });

  return {
    predictions,
    isLoading,
    error
  };
}

/**
 * Hook para otimizações de estoque
 */
export function useStockOptimizations() {
  const {
    data: optimizations = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['stock-optimizations'],
    queryFn: async () => {
      // TODO: Implementar busca de otimizações salvas quando houver backend
      return [];
    },
    staleTime: 15 * 60 * 1000 // 15 minutos
  });

  return {
    optimizations,
    isLoading,
    error
  };
}

/**
 * Hook para análises de performance
 */
export function usePerformanceAnalyses() {
  const {
    data: analyses = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['performance-analyses'],
    queryFn: async () => {
      // TODO: Implementar busca de análises salvas quando houver backend
      return [];
    },
    staleTime: 20 * 60 * 1000 // 20 minutos
  });

  return {
    analyses,
    isLoading,
    error
  };
}

/**
 * Hook para análise de satisfação do cliente
 */
export function useCustomerSatisfactionAnalysis() {
  const [period, setPeriod] = useState('month');
  
  const {
    data: analysis,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['customer-satisfaction', period],
    queryFn: () => AIService.analyzeCustomerSatisfaction(period),
    staleTime: 30 * 60 * 1000 // 30 minutos
  });

  const updatePeriod = useCallback((newPeriod: string) => {
    setPeriod(newPeriod);
  }, []);

  return {
    analysis,
    period,
    updatePeriod,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook para configuração de IA
 */
export function useAIConfiguration() {
  const [config, setConfig] = useState({
    demand_prediction: {
      enabled: true,
      update_frequency: 'daily' as const,
      confidence_threshold: 0.7,
      historical_periods: 12
    },
    stock_optimization: {
      enabled: true,
      update_frequency: 'weekly' as const,
      safety_stock_days: 7,
      cost_threshold: 100
    },
    intelligent_alerts: {
      enabled: true,
      severity_threshold: 'medium' as AlertSeverity,
      auto_acknowledge_low: true,
      notification_channels: ['in_app', 'email']
    },
    performance_analysis: {
      enabled: true,
      benchmark_period: 'month' as const,
      ranking_enabled: true,
      auto_recommendations: true
    }
  });

  const updateConfig = useCallback((newConfig: typeof config) => {
    setConfig(newConfig);
    // TODO: Salvar configuração no backend
    console.log('🔧 [useAI] Configuração de IA atualizada');
  }, []);

  const toggleFeature = useCallback((feature: keyof typeof config, enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        enabled
      }
    }));
  }, []);

  return {
    config,
    updateConfig,
    toggleFeature
  };
}
