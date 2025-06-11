import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Clock, 
  Calendar,
  TrendingUp,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { useWorkshopMetrics } from '@/hooks/useWorkshopMetrics';

interface WorkshopRealTimeDataProps {
  className?: string;
}

export function WorkshopRealTimeData({ className }: WorkshopRealTimeDataProps) {
  const { metrics, timeMetrics, lastUpdated, isLoading } = useWorkshopMetrics();

  if (isLoading || !metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Dados em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Activity className="h-6 w-6 animate-pulse text-blue-500" />
            <span className="ml-2 text-gray-600">Carregando dados em tempo real...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Equipamentos mais recentes
  const recentEquipments = timeMetrics
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 5);

  // Equipamentos com maior tempo na oficina
  const longestStayEquipments = timeMetrics
    .filter(e => !e.repairCompletedAt)
    .map(e => ({
      ...e,
      stayTime: (new Date().getTime() - new Date(e.receivedAt).getTime()) / (1000 * 60 * 60) // em horas
    }))
    .sort((a, b) => b.stayTime - a.stayTime)
    .slice(0, 3);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received_at_workshop':
      case 'collected':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'diagnosis_completed':
      case 'quote_sent':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'quote_approved':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready_for_delivery':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'received_at_workshop': 'Recebido',
      'collected': 'Coletado',
      'diagnosis_completed': 'Diagnóstico Concluído',
      'quote_sent': 'Orçamento Enviado',
      'quote_approved': 'Orçamento Aprovado',
      'in_progress': 'Em Progresso',
      'ready_for_delivery': 'Pronto para Entrega'
    };
    return statusMap[status] || status;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header com indicador de dados em tempo real */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Dados em Tempo Real
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600 font-medium">LIVE</span>
              </div>
            </CardTitle>
            {lastUpdated && (
              <div className="text-sm text-gray-500">
                Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalEquipments}</div>
              <div className="text-sm text-blue-700">Total na Oficina</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{metrics.pendingDiagnosis}</div>
              <div className="text-sm text-orange-700">Aguardando Diagnóstico</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{metrics.inProgress}</div>
              <div className="text-sm text-yellow-700">Em Progresso</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{metrics.equipmentsCompletedToday}</div>
              <div className="text-sm text-green-700">Concluídos Hoje</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipamentos Recém-Chegados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            Equipamentos Recém-Chegados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEquipments.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Nenhum equipamento recebido recentemente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEquipments.map((equipment, index) => (
                <div key={equipment.equipmentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{equipment.clientName}</div>
                      <div className="text-sm text-gray-600">{equipment.equipmentType}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`text-xs ${getStatusColor(equipment.status)}`}>
                      {getStatusText(equipment.status)}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(equipment.receivedAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(equipment.receivedAt).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipamentos com Maior Tempo na Oficina */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-red-600" />
            Equipamentos com Maior Tempo na Oficina
          </CardTitle>
        </CardHeader>
        <CardContent>
          {longestStayEquipments.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
              <p>Todos os equipamentos estão dentro do prazo!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {longestStayEquipments.map((equipment, index) => (
                <div key={equipment.equipmentId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-red-600">⚠️</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{equipment.clientName}</div>
                      <div className="text-sm text-gray-600">{equipment.equipmentType}</div>
                      <div className="text-xs text-gray-500">
                        Tipo: {equipment.serviceType === 'coleta_diagnostico' ? 'Diagnóstico' : 'Conserto'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">
                      {formatTime(equipment.stayTime)}
                    </div>
                    <div className="text-xs text-red-700">na oficina</div>
                    <Badge className={`text-xs mt-1 ${getStatusColor(equipment.status)}`}>
                      {getStatusText(equipment.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo de Performance em Tempo Real */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Performance em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Tempo Médio de Diagnóstico</span>
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(metrics.averageDiagnosisTime)}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Meta: 24h | {metrics.averageDiagnosisTime <= 24 ? '✅ Dentro do prazo' : '⚠️ Acima do prazo'}
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">Taxa de Conclusão no Prazo</span>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {metrics.onTimeCompletionRate.toFixed(1)}%
              </div>
              <div className="text-xs text-green-600 mt-1">
                {metrics.onTimeCompletionRate >= 80 ? '🎯 Excelente performance' : 
                 metrics.onTimeCompletionRate >= 60 ? '👍 Boa performance' : '⚠️ Precisa melhorar'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
