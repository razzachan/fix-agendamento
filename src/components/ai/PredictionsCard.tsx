// ===================================================================
// 🤖 CARD DE PREVISÕES DE DEMANDA (MVP 4)
// ===================================================================

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  RefreshCw,
  BarChart3,
  MapPin,
  Clock
} from 'lucide-react';
import { useDemandPredictions } from '@/hooks/useAI';

/**
 * Card para exibir previsões de demanda
 */
export function PredictionsCard() {
  const { predictions, isLoading } = useDemandPredictions();

  // Dados simulados para desenvolvimento
  const mockPredictions = [
    {
      id: '1',
      region: 'Centro',
      period: 'next_week',
      predicted_orders: 45,
      confidence: 0.87,
      factors: [
        { name: 'Tendência histórica', impact: 0.15, description: 'Crescimento de 15% nas últimas semanas', confidence: 0.9 },
        { name: 'Sazonalidade', impact: 0.08, description: 'Janeiro tradicionalmente tem mais demanda', confidence: 0.8 }
      ],
      recommendations: [
        'Considere aumentar a equipe de técnicos em 20%',
        'Prepare estoque adicional para alta demanda'
      ],
      historical_data: [
        { date: '2025-01-01', orders: 38, revenue: 15200 },
        { date: '2025-01-08', orders: 42, revenue: 16800 },
        { date: '2025-01-15', orders: 39, revenue: 15600 }
      ],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      region: 'Norte',
      period: 'next_month',
      predicted_orders: 180,
      confidence: 0.92,
      factors: [
        { name: 'Crescimento regional', impact: 0.25, description: 'Expansão de mercado na região', confidence: 0.95 },
        { name: 'Campanhas de marketing', impact: 0.12, description: 'Impacto das campanhas ativas', confidence: 0.85 }
      ],
      recommendations: [
        'Considere abrir nova oficina na região',
        'Aumente o estoque de peças mais demandadas'
      ],
      historical_data: [
        { date: '2024-12-01', orders: 145, revenue: 58000 },
        { date: '2024-11-01', orders: 132, revenue: 52800 },
        { date: '2024-10-01', orders: 128, revenue: 51200 }
      ],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const displayPredictions = predictions.length > 0 ? predictions : mockPredictions;

  /**
   * Obter cor da tendência
   */
  const getTrendColor = (impact: number) => {
    if (impact > 0.1) return 'text-green-600';
    if (impact > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  /**
   * Obter ícone da tendência
   */
  const getTrendIcon = (impact: number) => {
    if (impact > 0) return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  /**
   * Formatar período
   */
  const formatPeriod = (period: string) => {
    switch (period) {
      case 'next_week':
        return 'Próxima Semana';
      case 'next_month':
        return 'Próximo Mês';
      case 'next_quarter':
        return 'Próximo Trimestre';
      default:
        return period;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Previsões de Demanda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Previsões de Demanda</h2>
          <p className="text-muted-foreground">
            Previsões automáticas baseadas em dados históricos e tendências
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar Previsões
        </Button>
      </div>

      {/* Lista de previsões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displayPredictions.map((prediction) => (
          <Card key={prediction.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Região {prediction.region}
                  </CardTitle>
                  <CardDescription>
                    {formatPeriod(prediction.period)}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {Math.round(prediction.confidence * 100)}% confiança
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Previsão principal */}
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-1">
                  {prediction.predicted_orders}
                </div>
                <div className="text-sm text-muted-foreground">
                  ordens previstas
                </div>
              </div>

              {/* Fatores de influência */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Fatores de Influência</h4>
                {prediction.factors.map((factor, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTrendIcon(factor.impact)}
                        <span className="text-sm font-medium">{factor.name}</span>
                      </div>
                      <span className={`text-sm font-bold ${getTrendColor(factor.impact)}`}>
                        {factor.impact > 0 ? '+' : ''}{Math.round(factor.impact * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.abs(factor.impact) * 100} 
                      className="h-1"
                    />
                    <p className="text-xs text-muted-foreground">
                      {factor.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Recomendações */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Recomendações</h4>
                <div className="space-y-2">
                  {prediction.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dados históricos resumidos */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    <span>Baseado em {prediction.historical_data.length} períodos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      Expira em {Math.ceil((new Date(prediction.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  Ver Detalhes
                </Button>
                <Button size="sm" className="flex-1">
                  Aplicar Recomendações
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estado vazio */}
      {displayPredictions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma previsão disponível</h3>
            <p className="text-muted-foreground mb-4">
              Gere previsões de demanda para otimizar sua operação
            </p>
            <Button>
              <TrendingUp className="h-4 w-4 mr-2" />
              Gerar Primeira Previsão
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
