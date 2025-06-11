import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { orderLifecycleService } from '@/services/orderLifecycle/OrderLifecycleService';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3, 
  TrendingUp, 
  RefreshCw,
  Calendar,
  Route,
  FileCheck,
  Archive
} from 'lucide-react';
import { toast } from 'sonner';

interface LifecycleMetrics {
  pendentes: number;
  roteirizados: number;
  confirmados: number;
  convertidos: number;
  cancelados: number;
  taxa_conversao: number;
  tempo_medio_conversao: number;
}

export const LifecycleDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<LifecycleMetrics>({
    pendentes: 0,
    roteirizados: 0,
    confirmados: 0,
    convertidos: 0,
    cancelados: 0,
    taxa_conversao: 0,
    tempo_medio_conversao: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      const data = await orderLifecycleService.getLifecycleMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('❌ Erro ao carregar métricas:', error);
      toast.error('Erro ao carregar métricas do ciclo de vida');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadMetrics();
    setIsRefreshing(false);
    toast.success('Métricas atualizadas!');
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const totalAgendamentos = metrics.pendentes + metrics.roteirizados + metrics.confirmados + metrics.convertidos + metrics.cancelados;

  const getStatusCard = (
    title: string,
    value: number,
    icon: React.ElementType,
    color: string,
    description: string
  ) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {totalAgendamentos > 0 && (
          <div className="mt-2">
            <Progress 
              value={(value / totalAgendamentos) * 100} 
              className="h-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {((value / totalAgendamentos) * 100).toFixed(1)}% do total
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dashboard do Ciclo de Vida</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard do Ciclo de Vida</h2>
          <p className="text-muted-foreground">
            Acompanhe o fluxo completo: Agendamento → Roteirização → Confirmação → OS
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {getStatusCard(
          "Pendentes",
          metrics.pendentes,
          Clock,
          "text-yellow-600",
          "Aguardando roteirização"
        )}
        
        {getStatusCard(
          "Roteirizados",
          metrics.roteirizados,
          Route,
          "text-blue-600",
          "Roteirizados pela IA"
        )}
        
        {getStatusCard(
          "Confirmados",
          metrics.confirmados,
          Calendar,
          "text-green-600",
          "Confirmados pelo cliente"
        )}
        
        {getStatusCard(
          "Convertidos",
          metrics.convertidos,
          FileCheck,
          "text-purple-600",
          "Convertidos em OS"
        )}
        
        {getStatusCard(
          "Cancelados",
          metrics.cancelados,
          AlertTriangle,
          "text-red-600",
          "Cancelados ou rejeitados"
        )}
      </div>

      {/* Métricas de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Taxa de Conversão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Taxa de Conversão
            </CardTitle>
            <CardDescription>
              Percentual de agendamentos convertidos em OS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-3xl font-bold text-green-600">
                {metrics.taxa_conversao.toFixed(1)}%
              </div>
              
              <Progress value={metrics.taxa_conversao} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Convertidos</p>
                  <p className="font-medium">{metrics.convertidos}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Processados</p>
                  <p className="font-medium">{metrics.convertidos + metrics.cancelados}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tempo Médio de Conversão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Tempo Médio de Conversão
            </CardTitle>
            <CardDescription>
              Tempo médio do agendamento até a OS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-3xl font-bold text-blue-600">
                {metrics.tempo_medio_conversao.toFixed(1)}h
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meta: &lt; 24h</span>
                  <Badge variant={metrics.tempo_medio_conversao <= 24 ? "default" : "destructive"}>
                    {metrics.tempo_medio_conversao <= 24 ? "✓ Dentro da meta" : "⚠ Acima da meta"}
                  </Badge>
                </div>
                
                <Progress 
                  value={Math.min((24 / Math.max(metrics.tempo_medio_conversao, 24)) * 100, 100)} 
                  className="h-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fluxo Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Fluxo do Ciclo de Vida
          </CardTitle>
          <CardDescription>
            Visualização do pipeline de agendamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-4 overflow-x-auto pb-4">
            {[
              { label: 'Pendentes', value: metrics.pendentes, color: 'bg-yellow-500' },
              { label: 'Roteirizados', value: metrics.roteirizados, color: 'bg-blue-500' },
              { label: 'Confirmados', value: metrics.confirmados, color: 'bg-green-500' },
              { label: 'Convertidos', value: metrics.convertidos, color: 'bg-purple-500' }
            ].map((stage, index, array) => (
              <React.Fragment key={stage.label}>
                <div className="flex flex-col items-center space-y-2 min-w-0 flex-1">
                  <div className={`w-12 h-12 rounded-full ${stage.color} flex items-center justify-center text-white font-bold`}>
                    {stage.value}
                  </div>
                  <p className="text-sm font-medium text-center">{stage.label}</p>
                  <p className="text-xs text-muted-foreground text-center">
                    {totalAgendamentos > 0 ? `${((stage.value / totalAgendamentos) * 100).toFixed(0)}%` : '0%'}
                  </p>
                </div>
                {index < array.length - 1 && (
                  <div className="flex-shrink-0 w-8 h-0.5 bg-gray-300 mt-6"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
