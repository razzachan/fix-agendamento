import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProductivity } from '@/hooks/useProductivity';
import { useAuth } from '@/contexts/AuthContext';
import { downloadFile } from '@/services/productivityService';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Target,
  Clock,
  Star,
  MapPin,
  DollarSign,
  Download,
  RefreshCw,
  Trophy,
  Lightbulb
} from 'lucide-react';

interface ProductivityDashboardProps {
  className?: string;
}

/**
 * Dashboard de produtividade pessoal para técnicos
 */
export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({
  className
}) => {
  const { user } = useAuth();
  const {
    isLoading,
    metrics,
    summary,
    comparison,
    loadMetrics,
    loadSummary,
    loadComparison,
    calculateDailyMetrics,
    exportReport,
    formatMetricValue,
    getMetricTrend,
    getPerformanceLevel
  } = useProductivity();

  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Carregar dados ao montar o componente
  useEffect(() => {
    if (user?.id) {
      loadSummary(user.id, selectedPeriod);
      loadComparison(user.id, selectedPeriod);
      loadMetrics(user.id, selectedPeriod);
    }
  }, [user?.id, selectedPeriod, loadSummary, loadComparison, loadMetrics]);

  /**
   * Atualizar métricas
   */
  const handleRefreshMetrics = async () => {
    if (!user?.id) return;
    
    await calculateDailyMetrics(user.id);
    await loadSummary(user.id, selectedPeriod);
    await loadComparison(user.id, selectedPeriod);
  };

  /**
   * Exportar relatório
   */
  const handleExportReport = async (format: 'json' | 'csv') => {
    if (!user?.id) return;

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const report = await exportReport(user.id, startDate, endDate, format);
    if (report) {
      const filename = `produtividade_${user.id}_${startDate}_${endDate}.${format}`;
      downloadFile(report, filename, format === 'csv' ? 'text/csv' : 'application/json');
    }
  };

  /**
   * Renderizar ícone de tendência
   */
  const renderTrendIcon = (trend: { value: number; direction: 'up' | 'down' | 'stable' }) => {
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  /**
   * Obter cor do nível de performance
   */
  const getPerformanceColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'average':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  /**
   * Obter label do nível de performance
   */
  const getPerformanceLabel = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'Excelente';
      case 'good':
        return 'Bom';
      case 'average':
        return 'Médio';
      default:
        return 'Precisa Melhorar';
    }
  };

  if (!user?.id) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Faça login para ver suas métricas de produtividade</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Minha Produtividade</h2>
          <p className="text-gray-600">Acompanhe seu desempenho e evolução</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshMetrics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportReport('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily">Diário</TabsTrigger>
          <TabsTrigger value="weekly">Semanal</TabsTrigger>
          <TabsTrigger value="monthly">Mensal</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="space-y-6">
          {/* Resumo Geral */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ordens Concluídas */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Ordens Concluídas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {summary.metrics.orders_completed}
                    </span>
                    <div className="flex items-center gap-1">
                      {renderTrendIcon(getMetricTrend(summary.metrics.orders_completed, summary.trends.orders_completed))}
                      <span className="text-sm text-gray-500">
                        {Math.abs(summary.trends.orders_completed).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Satisfação do Cliente */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Satisfação do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-bold">
                        {summary.metrics.customer_satisfaction_avg?.toFixed(1) || 'N/A'}
                      </span>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="flex items-center gap-1">
                      {renderTrendIcon(getMetricTrend(summary.metrics.customer_satisfaction_avg || 0, summary.trends.satisfaction))}
                      <span className="text-sm text-gray-500">
                        {Math.abs(summary.trends.satisfaction).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pontualidade */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Pontualidade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {formatMetricValue(summary.metrics.punctuality_rate, 'percentage')}
                    </span>
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Receita */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Receita Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {formatMetricValue(summary.metrics.total_revenue, 'currency')}
                    </span>
                    <div className="flex items-center gap-1">
                      {renderTrendIcon(getMetricTrend(summary.metrics.total_revenue, summary.trends.revenue))}
                      <span className="text-sm text-gray-500">
                        {Math.abs(summary.trends.revenue).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Nível de Performance */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Nível de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Badge className={getPerformanceColor(getPerformanceLevel(summary.metrics))}>
                    {getPerformanceLabel(getPerformanceLevel(summary.metrics))}
                  </Badge>
                  {comparison && (
                    <div className="text-sm text-gray-600">
                      Posição: {comparison.ranking.position}º de {comparison.ranking.total} técnicos
                      ({comparison.ranking.percentile}º percentil)
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conquistas */}
          {summary && summary.achievements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  Conquistas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {summary.achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg"
                    >
                      <span className="text-sm">{achievement}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recomendações */}
          {summary && summary.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  Recomendações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.recommendations.map((recommendation, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg"
                    >
                      <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparação com a Equipe */}
          {comparison && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Comparação com a Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Suas Ordens</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {comparison.technician.orders_completed}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Média da Equipe</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {comparison.teamAverage.orders_completed}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Sua Posição</p>
                    <p className="text-2xl font-bold text-green-600">
                      {comparison.ranking.position}º
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estado de Loading */}
          {isLoading && (
            <Card>
              <CardContent className="py-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Carregando métricas de produtividade...</p>
              </CardContent>
            </Card>
          )}

          {/* Estado Vazio */}
          {!isLoading && !summary && (
            <Card>
              <CardContent className="py-8 text-center">
                <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Nenhuma métrica disponível</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Complete alguns atendimentos para ver suas métricas de produtividade
                </p>
                <Button onClick={handleRefreshMetrics}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Calcular Métricas
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
