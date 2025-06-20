// ===================================================================
// 🤖 DASHBOARD DE IA E PREVISÕES (MVP 4)
// ===================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
  RefreshCw,
  Settings,
  BarChart3,
  Package,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Lightbulb
} from 'lucide-react';
import { useAI, useDemandPredictions, useStockOptimizations } from '@/hooks/useAI';
import { PredictionsCard } from './PredictionsCard';
import { AlertsCard } from './AlertsCard';
import { RecommendationsCard } from './RecommendationsCard';
import { AIMetricsCard } from './AIMetricsCard';

/**
 * Dashboard principal do sistema de IA
 */
export function AIDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { 
    aiMetrics,
    intelligentAlerts,
    isLoadingMetrics,
    isLoadingAlerts,
    refreshAlerts,
    refreshMetrics
  } = useAI();

  const { predictions } = useDemandPredictions();
  const { optimizations } = useStockOptimizations();

  /**
   * Estatísticas rápidas do sistema de IA
   */
  const aiStats = {
    totalPredictions: predictions.length,
    activeAlerts: intelligentAlerts.filter(alert => !alert.acknowledged).length,
    criticalAlerts: intelligentAlerts.filter(alert => alert.severity === 'critical').length,
    optimizationsSuggested: optimizations.length,
    accuracyScore: aiMetrics?.prediction_accuracy ? Math.round(aiMetrics.prediction_accuracy * 100) : 85,
    processingTime: aiMetrics?.processing_time || 1250
  };

  /**
   * Obter cor do indicador de performance
   */
  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  /**
   * Obter status geral do sistema de IA
   */
  const getSystemStatus = () => {
    if (aiStats.criticalAlerts > 0) return { status: 'critical', label: 'Crítico', color: 'bg-red-500' };
    if (aiStats.activeAlerts > 5) return { status: 'warning', label: 'Atenção', color: 'bg-yellow-500' };
    return { status: 'healthy', label: 'Saudável', color: 'bg-green-500' };
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            Inteligência Artificial
          </h1>
          <p className="text-muted-foreground">
            Insights automáticos e previsões para otimizar sua operação
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            className={`${systemStatus.color} text-white`}
          >
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
            Sistema {systemStatus.label}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshAlerts();
              refreshMetrics();
            }}
            disabled={isLoadingMetrics || isLoadingAlerts}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(isLoadingMetrics || isLoadingAlerts) ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Previsões Ativas</p>
                <p className="text-2xl font-bold">{aiStats.totalPredictions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alertas Ativos</p>
                <p className="text-2xl font-bold">{aiStats.activeAlerts}</p>
                {aiStats.criticalAlerts > 0 && (
                  <p className="text-xs text-red-600 font-medium">
                    {aiStats.criticalAlerts} críticos
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Precisão</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(aiStats.accuracyScore)}`}>
                  {aiStats.accuracyScore}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tempo Processamento</p>
                <p className="text-2xl font-bold">{aiStats.processingTime}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Previsões
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas
            {aiStats.activeAlerts > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                {aiStats.activeAlerts}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Aba: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Métricas de IA */}
            <AIMetricsCard metrics={aiMetrics} isLoading={isLoadingMetrics} />
            
            {/* Alertas recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alertas Recentes
                </CardTitle>
                <CardDescription>
                  Últimos alertas gerados pelo sistema de IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {intelligentAlerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className={`p-1 rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-100' :
                        alert.severity === 'high' ? 'bg-orange-100' :
                        alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        {alert.severity === 'critical' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <AlertTriangle className={`h-4 w-4 ${
                            alert.severity === 'high' ? 'text-orange-600' :
                            alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.description}</p>
                      </div>
                      <Badge variant={alert.acknowledged ? 'secondary' : 'destructive'}>
                        {alert.acknowledged ? 'Reconhecido' : 'Novo'}
                      </Badge>
                    </div>
                  ))}
                  
                  {intelligentAlerts.length === 0 && (
                    <div className="text-center py-6">
                      <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum alerta ativo</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recomendações rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Recomendações Inteligentes
              </CardTitle>
              <CardDescription>
                Sugestões automáticas para otimizar sua operação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-blue-50">
                  <Package className="h-6 w-6 text-blue-600 mb-2" />
                  <h4 className="font-semibold text-sm mb-1">Otimização de Estoque</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    3 itens precisam de reposição
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Ver Detalhes
                  </Button>
                </div>
                
                <div className="p-4 rounded-lg border bg-green-50">
                  <Users className="h-6 w-6 text-green-600 mb-2" />
                  <h4 className="font-semibold text-sm mb-1">Alocação de Técnicos</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Redistribuir para melhor eficiência
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Ver Sugestões
                  </Button>
                </div>
                
                <div className="p-4 rounded-lg border bg-purple-50">
                  <DollarSign className="h-6 w-6 text-purple-600 mb-2" />
                  <h4 className="font-semibold text-sm mb-1">Oportunidade de Receita</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Potencial de +15% em vendas
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Analisar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Previsões */}
        <TabsContent value="predictions">
          <PredictionsCard />
        </TabsContent>

        {/* Aba: Alertas */}
        <TabsContent value="alerts">
          <AlertsCard alerts={intelligentAlerts} isLoading={isLoadingAlerts} />
        </TabsContent>

        {/* Aba: Configurações */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de IA</CardTitle>
              <CardDescription>
                Configure o comportamento do sistema de inteligência artificial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Configurações de IA</h3>
                <p className="text-muted-foreground">
                  Painel de configurações será implementado na próxima iteração
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
