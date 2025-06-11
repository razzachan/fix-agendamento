import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Clock,
  CheckCircle,
  TrendingUp,
  Package,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Target,
  Zap
} from 'lucide-react';
import { useWorkshopMetrics } from '@/hooks/useWorkshopMetrics';
import { WorkshopChartsSection } from './WorkshopChartsSection';
import { WorkshopRealTimeData } from './WorkshopRealTimeData';

interface WorkshopMetricsDashboardProps {
  className?: string;
}

export function WorkshopMetricsDashboard({ className }: WorkshopMetricsDashboardProps) {
  const {
    metrics,
    isLoading,
    error,
    lastUpdated,
    refreshAll
  } = useWorkshopMetrics();

  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours.toFixed(1)}h`;
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadgeVariant = (percentage: number): "default" | "secondary" | "destructive" | "outline" => {
    if (percentage >= 80) return 'default';
    if (percentage >= 60) return 'secondary';
    return 'destructive';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Métricas da Oficina
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Carregando métricas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Métricas da Oficina
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {error || 'Não foi possível carregar as métricas.'}
            </p>
            <Button onClick={refreshAll} variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header com botão de atualização */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Dashboard de Métricas da Oficina
            </CardTitle>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-sm text-gray-500">
                  Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
                </span>
              )}
              <Button onClick={refreshAll} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Métricas de Status dos Equipamentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Equipamentos</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalEquipments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Aguardando Diagnóstico</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.pendingDiagnosis}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Aguardando Aprovação</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.awaitingApproval}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Em Progresso</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Prontos para Entrega</p>
                <p className="text-2xl font-bold text-green-600">{metrics.readyForDelivery}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Tempo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Tempo Médio de Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatTime(metrics.averageDiagnosisTime)}
              </span>
              <Badge variant={metrics.averageDiagnosisTime <= 24 ? 'default' : 'destructive'}>
                {metrics.averageDiagnosisTime <= 24 ? 'Dentro do Prazo' : 'Acima do Prazo'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Tempo Médio de Reparo</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatTime(metrics.averageRepairTime)}
              </span>
              <Badge variant={metrics.averageRepairTime <= 168 ? 'default' : 'destructive'}>
                {metrics.averageRepairTime <= 168 ? 'Dentro do Prazo' : 'Acima do Prazo'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Tempo Médio de Aprovação</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatTime(metrics.averageApprovalTime)}
              </span>
              <Badge variant={metrics.averageApprovalTime <= 48 ? 'default' : 'secondary'}>
                {metrics.averageApprovalTime <= 48 ? 'Rápido' : 'Normal'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Produtividade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Equipamentos Concluídos Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-3xl font-bold text-green-600">{metrics.equipmentsCompletedToday}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Equipamentos Concluídos (Semana)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-3xl font-bold text-blue-600">{metrics.equipmentsCompletedWeek}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Equipamentos Concluídos (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-3xl font-bold text-purple-600">{metrics.equipmentsCompletedMonth}</span>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Eficiência */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Taxa de Conclusão no Prazo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getStatusColor(metrics.onTimeCompletionRate)}`}>
                {metrics.onTimeCompletionRate.toFixed(1)}%
              </span>
              <Badge variant={getStatusBadgeVariant(metrics.onTimeCompletionRate)}>
                {metrics.onTimeCompletionRate >= 80 ? 'Excelente' :
                 metrics.onTimeCompletionRate >= 60 ? 'Bom' : 'Precisa Melhorar'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Precisão do Diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getStatusColor(metrics.diagnosisAccuracyRate)}`}>
                {metrics.diagnosisAccuracyRate.toFixed(1)}%
              </span>
              <Badge variant={getStatusBadgeVariant(metrics.diagnosisAccuracyRate)}>
                {metrics.diagnosisAccuracyRate >= 80 ? 'Alta' :
                 metrics.diagnosisAccuracyRate >= 60 ? 'Média' : 'Baixa'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Taxa de Aprovação de Orçamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getStatusColor(metrics.quoteApprovalRate)}`}>
                {metrics.quoteApprovalRate.toFixed(1)}%
              </span>
              <Badge variant={getStatusBadgeVariant(metrics.quoteApprovalRate)}>
                {metrics.quoteApprovalRate >= 80 ? 'Excelente' :
                 metrics.quoteApprovalRate >= 60 ? 'Boa' : 'Baixa'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Financeiras */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valor Médio de Reparo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.averageRepairValue)}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Receita Total (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-2xl font-bold text-blue-600">
              {formatCurrency(metrics.totalRevenueMonth)}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Valor Médio de Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <span className="text-2xl font-bold text-purple-600">
              {formatCurrency(metrics.averageQuoteValue)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Tipo de Equipamento */}
      {metrics.equipmentTypeDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Distribuição por Tipo de Equipamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.equipmentTypeDistribution.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" style={{
                      backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`
                    }} />
                    <span className="font-medium">{item.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{item.count} equipamentos</span>
                    <Badge variant="outline">{item.percentage.toFixed(1)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribuição por Tipo de Serviço */}
      {metrics.serviceTypeDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Distribuição por Tipo de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.serviceTypeDistribution.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item.type === 'coleta_diagnostico' ? 'bg-orange-500' : 'bg-blue-500'
                      }`} />
                      <span className="font-medium">
                        {item.type === 'coleta_diagnostico' ? 'Coleta Diagnóstico' : 'Coleta Conserto'}
                      </span>
                    </div>
                    <Badge variant="outline">{item.percentage.toFixed(1)}%</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Quantidade:</span> {item.count} equipamentos
                    </div>
                    <div>
                      <span className="font-medium">Tempo Médio:</span> {formatTime(item.averageTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dados em Tempo Real */}
      <WorkshopRealTimeData />

      {/* Seção de Gráficos e Visualizações */}
      {metrics && (
        <WorkshopChartsSection metrics={metrics} />
      )}
    </div>
  );
}
