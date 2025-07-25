// ===================================================================
// 🤖 CARD DE ALERTAS INTELIGENTES (MVP 4)
// ===================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle,
  XCircle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  Wrench,
  Eye,
  EyeOff
} from 'lucide-react';
import { IntelligentAlert, AlertSeverity, AlertType } from '@/types/ai';

interface AlertsCardProps {
  alerts: IntelligentAlert[];
  isLoading?: boolean;
}

/**
 * Card para exibir e gerenciar alertas inteligentes
 */
export function AlertsCard({ alerts, isLoading }: AlertsCardProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'all'>('all');
  const [selectedType, setSelectedType] = useState<AlertType | 'all'>('all');

  // Dados simulados para desenvolvimento
  const mockAlerts: IntelligentAlert[] = [
    {
      id: '1',
      type: 'anomaly',
      severity: 'critical',
      title: 'Queda Significativa em Ordens',
      description: 'Redução de 45% nas ordens de hoje comparado à média semanal',
      suggested_actions: [
        { title: 'Verificar sistema de agendamentos', description: 'Confirmar se não há problemas técnicos', priority: 1, estimated_impact: 'Alto', estimated_effort: 'low', category: 'immediate' },
        { title: 'Contatar equipe de marketing', description: 'Investigar possíveis causas externas', priority: 2, estimated_impact: 'Médio', estimated_effort: 'medium', category: 'short_term' }
      ],
      confidence: 0.92,
      data_points: [
        { metric: 'Ordens hoje', current_value: 12, expected_value: 22, deviation: -45, timestamp: new Date().toISOString() }
      ],
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      acknowledged: false
    },
    {
      id: '2',
      type: 'opportunity',
      severity: 'medium',
      title: 'Oportunidade de Otimização de Estoque',
      description: 'Técnico João tem excesso de peças tipo A e falta de tipo B',
      suggested_actions: [
        { title: 'Redistribuir estoque', description: 'Transferir peças entre técnicos', priority: 1, estimated_impact: 'Médio', estimated_effort: 'low', category: 'immediate' }
      ],
      confidence: 0.78,
      data_points: [],
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      acknowledged: false
    },
    {
      id: '3',
      type: 'performance',
      severity: 'low',
      title: 'Melhoria na Eficiência de Técnicos',
      description: 'Técnicos da região Sul apresentam 15% mais eficiência',
      suggested_actions: [
        { title: 'Analisar práticas', description: 'Identificar fatores de sucesso para replicar', priority: 1, estimated_impact: 'Alto', estimated_effort: 'medium', category: 'long_term' }
      ],
      confidence: 0.85,
      data_points: [],
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      acknowledged: true
    }
  ];

  const displayAlerts = alerts.length > 0 ? alerts : mockAlerts;

  /**
   * Filtrar alertas baseado nos filtros selecionados
   */
  const filteredAlerts = displayAlerts.filter(alert => {
    const severityMatch = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    const typeMatch = selectedType === 'all' || alert.type === selectedType;
    return severityMatch && typeMatch;
  });

  /**
   * Obter ícone baseado no tipo de alerta
   */
  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'anomaly':
        return <XCircle className="h-4 w-4" />;
      case 'opportunity':
        return <TrendingUp className="h-4 w-4" />;
      case 'risk':
        return <AlertTriangle className="h-4 w-4" />;
      case 'performance':
        return <Users className="h-4 w-4" />;
      case 'efficiency':
        return <Wrench className="h-4 w-4" />;
      case 'customer':
        return <Users className="h-4 w-4" />;
      case 'financial':
        return <DollarSign className="h-4 w-4" />;
      case 'operational':
        return <Package className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  /**
   * Obter cor baseada na severidade
   */
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      case 'low':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  /**
   * Obter cor do ícone baseada na severidade
   */
  const getSeverityIconColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  /**
   * Formatar tempo relativo
   */
  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h atrás`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}min atrás`;
    } else {
      return 'Agora';
    }
  };

  /**
   * Contar alertas por severidade
   */
  const getAlertCounts = () => {
    return {
      critical: displayAlerts.filter(a => a.severity === 'critical').length,
      high: displayAlerts.filter(a => a.severity === 'high').length,
      medium: displayAlerts.filter(a => a.severity === 'medium').length,
      low: displayAlerts.filter(a => a.severity === 'low').length,
      unacknowledged: displayAlerts.filter(a => !a.acknowledged).length
    };
  };

  const alertCounts = getAlertCounts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas de alertas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{alertCounts.critical}</div>
            <div className="text-xs text-muted-foreground">Críticos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{alertCounts.high}</div>
            <div className="text-xs text-muted-foreground">Altos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{alertCounts.medium}</div>
            <div className="text-xs text-muted-foreground">Médios</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{alertCounts.low}</div>
            <div className="text-xs text-muted-foreground">Baixos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{alertCounts.unacknowledged}</div>
            <div className="text-xs text-muted-foreground">Não Lidos</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas Inteligentes
          </CardTitle>
          <CardDescription>
            Alertas automáticos gerados pelo sistema de IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedSeverity} onValueChange={(value) => setSelectedSeverity(value as AlertSeverity | 'all')}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="critical">Críticos</TabsTrigger>
              <TabsTrigger value="high">Altos</TabsTrigger>
              <TabsTrigger value="medium">Médios</TabsTrigger>
              <TabsTrigger value="low">Baixos</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedSeverity} className="mt-6">
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-1 rounded-full ${getSeverityIconColor(alert.severity)}`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{alert.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {alert.type}
                            </Badge>
                            <Badge variant={alert.acknowledged ? 'secondary' : 'destructive'} className="text-xs">
                              {alert.acknowledged ? (
                                <><Eye className="h-3 w-3 mr-1" /> Lido</>
                              ) : (
                                <><EyeOff className="h-3 w-3 mr-1" /> Novo</>
                              )}
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-sm mb-3">{alert.description}</p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(alert.created_at)}
                            </span>
                            <span>Confiança: {Math.round(alert.confidence * 100)}%</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              Ver Detalhes
                            </Button>
                            {!alert.acknowledged && (
                              <Button size="sm">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Marcar como Lido
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredAlerts.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum alerta encontrado</h3>
                    <p className="text-muted-foreground">
                      {selectedSeverity === 'all' 
                        ? 'Não há alertas ativos no momento'
                        : `Não há alertas de severidade ${selectedSeverity}`
                      }
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
