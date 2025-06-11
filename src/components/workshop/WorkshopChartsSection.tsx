import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Clock,
  Package,
  Wrench
} from 'lucide-react';
import { WorkshopMetrics } from '@/services/workshop/workshopMetricsService';

interface WorkshopChartsSectionProps {
  metrics: WorkshopMetrics;
  className?: string;
}

export function WorkshopChartsSection({ metrics, className }: WorkshopChartsSectionProps) {
  
  // Dados para gráfico de status dos equipamentos
  const statusData = [
    { 
      name: 'Aguardando Diagnóstico', 
      value: metrics.pendingDiagnosis, 
      color: 'bg-orange-500',
      icon: Clock
    },
    { 
      name: 'Aguardando Aprovação', 
      value: metrics.awaitingApproval, 
      color: 'bg-yellow-500',
      icon: BarChart3
    },
    { 
      name: 'Em Progresso', 
      value: metrics.inProgress, 
      color: 'bg-blue-500',
      icon: Wrench
    },
    { 
      name: 'Prontos para Entrega', 
      value: metrics.readyForDelivery, 
      color: 'bg-green-500',
      icon: Package
    }
  ];

  const totalEquipments = statusData.reduce((sum, item) => sum + item.value, 0);

  // Dados de produtividade semanal (DADOS REAIS do banco de dados)
  const weeklyProductivity = metrics.weeklyProductivity || [];
  const maxCompleted = Math.max(...weeklyProductivity.map(d => d.completed), 1); // Mínimo 1 para evitar divisão por zero

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Gráfico de Status dos Equipamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-600" />
            Distribuição de Status dos Equipamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusData.map((item, index) => {
              const percentage = totalEquipments > 0 ? (item.value / totalEquipments) * 100 : 0;
              const IconComponent = item.icon;
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${item.color}`} />
                    <IconComponent className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <span className="font-bold text-gray-900">{item.value}</span>
                      <Badge variant="outline" className="text-xs">
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {totalEquipments === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum equipamento na oficina</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Produtividade Semanal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Produtividade Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Equipamentos concluídos por dia (últimos 7 dias)</span>
              <span>Total da semana: {weeklyProductivity.reduce((sum, day) => sum + day.completed, 0)}</span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weeklyProductivity.map((day, index) => {
                const heightPercentage = maxCompleted > 0 ? (day.completed / maxCompleted) * 100 : 0;
                
                return (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <div className="w-full h-24 bg-gray-100 rounded-lg flex items-end p-1">
                      <div 
                        className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded transition-all duration-300"
                        style={{ height: `${heightPercentage}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-900">{day.day}</div>
                      <div className="text-xs text-gray-500">{day.completed}</div>
                      <div className="text-xs text-gray-400">{new Date(day.date).getDate()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Tempo Comparativas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            Comparativo de Tempos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tempo de Diagnóstico */}
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {metrics.averageDiagnosisTime.toFixed(1)}h
              </div>
              <div className="text-sm text-orange-700 font-medium mb-2">
                Tempo Médio de Diagnóstico
              </div>
              <div className="w-full bg-orange-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((metrics.averageDiagnosisTime / 24) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-orange-600 mt-1">
                Meta: 24h
              </div>
            </div>

            {/* Tempo de Reparo */}
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {(metrics.averageRepairTime / 24).toFixed(1)}d
              </div>
              <div className="text-sm text-blue-700 font-medium mb-2">
                Tempo Médio de Reparo
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((metrics.averageRepairTime / 168) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Meta: 7 dias
              </div>
            </div>

            {/* Tempo de Aprovação */}
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {metrics.averageApprovalTime.toFixed(1)}h
              </div>
              <div className="text-sm text-purple-700 font-medium mb-2">
                Tempo Médio de Aprovação
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((metrics.averageApprovalTime / 48) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-purple-600 mt-1">
                Meta: 48h
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores de Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Indicadores de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Taxa de Conclusão no Prazo */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-green-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${metrics.onTimeCompletionRate}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">
                    {metrics.onTimeCompletionRate.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-700">
                Conclusão no Prazo
              </div>
            </div>

            {/* Precisão do Diagnóstico */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${metrics.diagnosisAccuracyRate}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">
                    {metrics.diagnosisAccuracyRate.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-700">
                Precisão do Diagnóstico
              </div>
            </div>

            {/* Taxa de Aprovação */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-yellow-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${metrics.quoteApprovalRate}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">
                    {metrics.quoteApprovalRate.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-700">
                Taxa de Aprovação
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
