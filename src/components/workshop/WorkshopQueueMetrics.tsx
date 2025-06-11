import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  List,
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp,
  Timer,
  Target
} from 'lucide-react';
import { QueueMetrics } from '@/services/workshop/workshopQueueService';

interface WorkshopQueueMetricsProps {
  metrics: QueueMetrics;
  className?: string;
}

export function WorkshopQueueMetrics({ metrics, className }: WorkshopQueueMetricsProps) {
  
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

  const getUrgencyLevel = () => {
    if (metrics.overdueItems > 0) return 'high';
    if (metrics.urgentItems > 0) return 'medium';
    return 'low';
  };

  const getUrgencyColor = () => {
    const level = getUrgencyLevel();
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getEfficiencyScore = (): number => {
    if (metrics.totalItems === 0) return 100;
    
    const overdueRatio = metrics.overdueItems / metrics.totalItems;
    const urgentRatio = metrics.urgentItems / metrics.totalItems;
    
    // Score baseado em itens não atrasados e baixa urgência
    const score = Math.max(0, 100 - (overdueRatio * 50) - (urgentRatio * 25));
    return Math.round(score);
  };

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const efficiencyScore = getEfficiencyScore();

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Total de Itens */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <List className="h-4 w-4" />
            Total na Fila
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.totalItems}
              </div>
              <div className="text-xs text-gray-500">
                equipamentos
              </div>
            </div>
            <div className={`p-2 rounded-lg ${getUrgencyColor()}`}>
              <List className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Itens Urgentes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Urgentes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-600">
                {metrics.urgentItems}
              </div>
              <div className="text-xs text-gray-500">
                alta prioridade
              </div>
              {metrics.totalItems > 0 && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {((metrics.urgentItems / metrics.totalItems) * 100).toFixed(1)}%
                </Badge>
              )}
            </div>
            <div className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-200">
              <Zap className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Itens Atrasados */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Atrasados
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {metrics.overdueItems}
              </div>
              <div className="text-xs text-gray-500">
                fora do prazo
              </div>
              {metrics.totalItems > 0 && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {((metrics.overdueItems / metrics.totalItems) * 100).toFixed(1)}%
                </Badge>
              )}
            </div>
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600 border border-orange-200">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tempo Médio de Espera */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tempo Médio
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(metrics.averageWaitTime)}
              </div>
              <div className="text-xs text-gray-500">
                na oficina
              </div>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Eficiência (span 2 colunas em telas maiores) */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Eficiência da Fila
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className={`text-3xl font-bold ${getEfficiencyColor(efficiencyScore)}`}>
                {efficiencyScore}%
              </div>
              <div className="text-xs text-gray-500 mb-2">
                score de eficiência
              </div>
              
              {/* Barra de Progresso */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    efficiencyScore >= 80 ? 'bg-green-500' :
                    efficiencyScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${efficiencyScore}%` }}
                />
              </div>
              
              <div className="text-xs text-gray-500 mt-1">
                {efficiencyScore >= 80 ? '🎯 Excelente performance' :
                 efficiencyScore >= 60 ? '👍 Boa performance' : '⚠️ Precisa melhorar'}
              </div>
            </div>
            
            <div className="ml-4">
              <div className={`p-3 rounded-lg ${
                efficiencyScore >= 80 ? 'bg-green-50 text-green-600 border border-green-200' :
                efficiencyScore >= 60 ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' :
                'bg-red-50 text-red-600 border border-red-200'
              }`}>
                <Target className="h-6 w-6" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Estimativa Total */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Estimativa de Conclusão
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-2xl font-bold text-purple-600">
                {formatTime(metrics.estimatedCompletionTime)}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                para concluir toda a fila
              </div>
              
              {/* Breakdown por categoria */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Urgentes:</span>
                  <span className="font-medium">
                    {formatTime(metrics.estimatedCompletionTime * 0.3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Normais:</span>
                  <span className="font-medium">
                    {formatTime(metrics.estimatedCompletionTime * 0.7)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="ml-4">
              <div className="p-3 rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
                <Timer className="h-6 w-6" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
