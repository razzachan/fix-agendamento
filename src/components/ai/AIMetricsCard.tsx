// ===================================================================
// 🤖 CARD DE MÉTRICAS DE IA (MVP 4)
// ===================================================================

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Target,
  Zap,
  TrendingUp,
  Users,
  Clock,
  CheckCircle
} from 'lucide-react';
import { AIMetrics } from '@/types/ai';

interface AIMetricsCardProps {
  metrics?: AIMetrics;
  isLoading?: boolean;
}

/**
 * Card para exibir métricas de performance do sistema de IA
 */
export function AIMetricsCard({ metrics, isLoading }: AIMetricsCardProps) {
  // Dados simulados para desenvolvimento
  const mockMetrics: AIMetrics = {
    prediction_accuracy: 0.87,
    alert_precision: 0.82,
    recommendation_adoption: 0.68,
    user_satisfaction: 0.91,
    processing_time: 1250,
    last_updated: new Date().toISOString()
  };

  const displayMetrics = metrics || mockMetrics;

  /**
   * Obter cor baseada na performance
   */
  const getPerformanceColor = (value: number) => {
    if (value >= 0.9) return 'text-green-600';
    if (value >= 0.75) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Obter cor da barra de progresso
   */
  const getProgressColor = (value: number) => {
    if (value >= 90) return 'bg-green-500';
    if (value >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  /**
   * Formatar tempo de processamento
   */
  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  /**
   * Obter status geral baseado nas métricas
   */
  const getOverallStatus = () => {
    const avgScore = (
      displayMetrics.prediction_accuracy +
      displayMetrics.alert_precision +
      displayMetrics.recommendation_adoption +
      displayMetrics.user_satisfaction
    ) / 4;

    if (avgScore >= 0.85) return { label: 'Excelente', color: 'bg-green-500', textColor: 'text-green-600' };
    if (avgScore >= 0.7) return { label: 'Bom', color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    return { label: 'Precisa Melhorar', color: 'bg-red-500', textColor: 'text-red-600' };
  };

  const overallStatus = getOverallStatus();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Métricas de IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-2 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Métricas de IA
            </CardTitle>
            <CardDescription>
              Performance do sistema de inteligência artificial
            </CardDescription>
          </div>
          <Badge className={`${overallStatus.color} text-white`}>
            {overallStatus.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Precisão das Previsões */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Precisão das Previsões</span>
            </div>
            <span className={`text-sm font-bold ${getPerformanceColor(displayMetrics.prediction_accuracy)}`}>
              {Math.round(displayMetrics.prediction_accuracy * 100)}%
            </span>
          </div>
          <Progress 
            value={displayMetrics.prediction_accuracy * 100} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            Quão precisas são as previsões de demanda e otimizações
          </p>
        </div>

        {/* Precisão dos Alertas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Precisão dos Alertas</span>
            </div>
            <span className={`text-sm font-bold ${getPerformanceColor(displayMetrics.alert_precision)}`}>
              {Math.round(displayMetrics.alert_precision * 100)}%
            </span>
          </div>
          <Progress 
            value={displayMetrics.alert_precision * 100} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            Percentual de alertas que realmente indicam problemas
          </p>
        </div>

        {/* Adoção de Recomendações */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Adoção de Recomendações</span>
            </div>
            <span className={`text-sm font-bold ${getPerformanceColor(displayMetrics.recommendation_adoption)}`}>
              {Math.round(displayMetrics.recommendation_adoption * 100)}%
            </span>
          </div>
          <Progress 
            value={displayMetrics.recommendation_adoption * 100} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            Taxa de implementação das recomendações sugeridas
          </p>
        </div>

        {/* Satisfação do Usuário */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Satisfação do Usuário</span>
            </div>
            <span className={`text-sm font-bold ${getPerformanceColor(displayMetrics.user_satisfaction)}`}>
              {Math.round(displayMetrics.user_satisfaction * 100)}%
            </span>
          </div>
          <Progress 
            value={displayMetrics.user_satisfaction * 100} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground">
            Satisfação dos usuários com as funcionalidades de IA
          </p>
        </div>

        {/* Tempo de Processamento */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">Tempo de Processamento</span>
            </div>
            <span className="text-sm font-bold text-indigo-600">
              {formatProcessingTime(displayMetrics.processing_time)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-indigo-500" />
            <span className="text-xs text-muted-foreground">
              Tempo médio para gerar insights e recomendações
            </span>
          </div>
        </div>

        {/* Última atualização */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Última atualização:</span>
            <span>
              {new Date(displayMetrics.last_updated).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* Resumo de performance */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Resumo de Performance</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Status Geral:</span>
              <span className={`ml-2 font-semibold ${overallStatus.textColor}`}>
                {overallStatus.label}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Tendência:</span>
              <span className="ml-2 font-semibold text-green-600">
                ↗ Melhorando
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
