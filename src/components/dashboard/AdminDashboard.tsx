
import React, { useState, useEffect } from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  TrendingDown,
  Users,
  Wrench,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Plus,
  Filter,
  Download,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Star,
  Sparkles
} from 'lucide-react';
import { DisplayNumber } from '@/components/common/DisplayNumber';
import { useNavigate } from 'react-router-dom';
import FinancialAlertsWidget from '@/components/finance/FinancialAlertsWidget';
import FinancialSyncWidget from '@/components/finance/FinancialSyncWidget';
import GoogleAdsConversionsExport from '@/components/analytics/GoogleAdsConversionsExport';
import ConversionDetailsReport from '@/components/analytics/ConversionDetailsReport';
import AdvancedBIDashboard from '@/components/analytics/AdvancedBIDashboard';
import ConversionTestRunner from '@/components/testing/ConversionTestRunner';
import RealTimeMonitoringDashboard from '@/components/monitoring/RealTimeMonitoringDashboard';
import { DashboardAnalyticsService, WeeklyPerformanceData, TeamPerformanceData, GrowthMetrics, ExecutiveSummary } from '@/services/dashboardAnalyticsService';

interface AdminDashboardProps {
  serviceOrders: ServiceOrder[];
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  totalRevenue: number;
  pendingRevenue: number;
  clientCount: number;
  technicianCount: number;
  scheduledServicesCount: number;
  totalOrdersCount: number;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  serviceOrders,
  pendingOrders,
  inProgressOrders,
  completedOrders,
  totalRevenue,
  pendingRevenue,
  clientCount,
  technicianCount,
  scheduledServicesCount,
  totalOrdersCount,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel
}) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [weeklyData, setWeeklyData] = useState<WeeklyPerformanceData[]>([]);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(true);
  const [teamData, setTeamData] = useState<TeamPerformanceData[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics>({
    revenueGrowth: 0,
    ordersGrowth: 0,
    clientsGrowth: 0,
    avgOrderValueGrowth: 0
  });
  const [isLoadingGrowth, setIsLoadingGrowth] = useState(true);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary>({
    efficiency: 0,
    quality: 0,
    punctuality: 0,
    totalOrders: 0,
    avgCompletionTime: 0,
    customerSatisfaction: 0
  });
  const [isLoadingExecutive, setIsLoadingExecutive] = useState(true);

  // Atualizar horário em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Carregar todos os dados do dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Carregar dados em paralelo
        const [weeklyPerformance, teamPerformance, growth, executive] = await Promise.all([
          DashboardAnalyticsService.getWeeklyPerformance(),
          DashboardAnalyticsService.getTeamPerformance(),
          DashboardAnalyticsService.getGrowthMetrics(),
          DashboardAnalyticsService.getExecutiveSummary()
        ]);

        setWeeklyData(weeklyPerformance);
        setTeamData(teamPerformance);
        setGrowthMetrics(growth);
        setExecutiveSummary(executive);
      } catch (error) {
        console.error('❌ Erro ao carregar dados do dashboard:', error);
      } finally {
        setIsLoadingWeekly(false);
        setIsLoadingTeam(false);
        setIsLoadingGrowth(false);
        setIsLoadingExecutive(false);
      }
    };

    loadDashboardData();
  }, []);

  // Calcular métricas avançadas
  const totalOrders = pendingOrders + inProgressOrders + completedOrders;
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Ordens recentes (últimas 5)
  const recentOrders = serviceOrders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Dados de performance semanal agora vêm do banco de dados (não mais mockados)

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setIsLoadingWeekly(true);
    setIsLoadingTeam(true);
    setIsLoadingGrowth(true);
    setIsLoadingExecutive(true);

    try {
      // Recarregar todos os dados
      const [weeklyPerformance, teamPerformance, growth, executive] = await Promise.all([
        DashboardAnalyticsService.getWeeklyPerformance(),
        DashboardAnalyticsService.getTeamPerformance(),
        DashboardAnalyticsService.getGrowthMetrics(),
        DashboardAnalyticsService.getExecutiveSummary()
      ]);

      setWeeklyData(weeklyPerformance);
      setTeamData(teamPerformance);
      setGrowthMetrics(growth);
      setExecutiveSummary(executive);
    } catch (error) {
      console.error('❌ Erro ao atualizar dados:', error);
    } finally {
      setIsRefreshing(false);
      setIsLoadingWeekly(false);
      setIsLoadingTeam(false);
      setIsLoadingGrowth(false);
      setIsLoadingExecutive(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header com Welcome e Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Dashboard Administrativo
              </h1>
              <p className="text-muted-foreground">
                {currentTime.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} • {currentTime.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/orders')}
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4" />
            Nova Ordem
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Ordens Pendentes */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 dark:from-orange-600 dark:to-orange-800 rounded-bl-full opacity-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200">Ordens Pendentes</CardTitle>
            <div className="p-2 bg-orange-500 dark:bg-orange-600 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">{pendingOrders}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-orange-200 text-orange-800 text-xs">
                Urgente
              </Badge>
              <p className="text-xs text-orange-700">
                Aguardando atendimento
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ordens em Andamento */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-bl-full opacity-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Em Andamento</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg">
              <Activity className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{inProgressOrders}</div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={65} className="flex-1 h-2" />
              <p className="text-xs text-blue-700">65% concluído</p>
            </div>
          </CardContent>
        </Card>

        {/* Ordens Concluídas */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-bl-full opacity-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Concluídas</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{completedOrders}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-700 font-medium">+8.2%</span>
              </div>
              <p className="text-xs text-green-700">vs. mês anterior</p>
            </div>
          </CardContent>
        </Card>

        {/* Receita Total */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-bl-full opacity-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Receita Total</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{formatCurrency(totalRevenue)}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-purple-600" />
                <span className="text-xs text-purple-700 font-medium">+{revenueGrowth}%</span>
              </div>
              <p className="text-xs text-purple-700">crescimento mensal</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Secundárias */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Taxa de Conclusão */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
              <Progress value={completionRate} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {completedOrders} de {totalOrders} ordens concluídas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">+5.2%</span>
                </div>
                <p className="text-xs text-muted-foreground">vs. período anterior</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receita Pendente */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Receita Pendente</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando recebimento
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com Conteúdo Principal */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <FileText className="h-4 w-4" />
            Ordens Recentes
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <PieChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico de Performance Semanal */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Semanal
                  {isLoadingWeekly && (
                    <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingWeekly ? (
                  <div className="space-y-4">
                    {Array.from({ length: 7 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-8 h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between">
                            <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
                            <div className="w-20 h-3 bg-gray-200 rounded animate-pulse" />
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {weeklyData.map((day, index) => {
                      const maxOrders = Math.max(...weeklyData.map(d => d.orders), 1);
                      return (
                        <div key={day.day} className="flex items-center gap-4">
                          <div className="w-8 text-xs font-medium text-muted-foreground">
                            {day.day}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{day.orders} ordens</span>
                              <span>{formatCurrency(day.revenue)}</span>
                            </div>
                            <Progress
                              value={(day.orders / maxOrders) * 100}
                              className="h-2"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                </div>
              </CardContent>
            </Card>

            {/* Estatísticas do Sistema */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Estatísticas do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total de Clientes</p>
                        <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{clientCount}</div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <Wrench className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Técnicos Ativos</p>
                        <p className="text-xs text-muted-foreground">Disponíveis para serviço</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{technicianCount}</div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Serviços Agendados</p>
                        <p className="text-xs text-muted-foreground">Para os próximos dias</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">{scheduledServicesCount}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Widget de Alertas Financeiros */}
          <div className="mt-6">
            <FinancialAlertsWidget maxHeight="300px" showActions={true} />
          </div>

          {/* Widget de Sincronização Financeira */}
          <div className="mt-6">
            <FinancialSyncWidget showActions={true} />
          </div>
        </TabsContent>

        {/* Tab: Ordens Recentes */}
        <TabsContent value="orders" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Ordens de Serviço Recentes
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/orders')}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Ver Todas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order, index) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <DisplayNumber
                              item={order}
                              index={index}
                              variant="inline"
                              size="sm"
                              showIcon={false}
                            />
                            <Badge
                              variant="outline"
                              className={`${getStatusColor(order.status)} text-xs`}
                            >
                              {getStatusLabel(order.status)}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{order.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.equipmentType} • {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {order.finalCost && (
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrency(order.finalCost)}</p>
                            <p className="text-xs text-muted-foreground">Valor</p>
                          </div>
                        )}
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma ordem de serviço encontrada</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Equipe */}
        <TabsContent value="team" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Performance da Equipe */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Performance da Equipe
                  {isLoadingTeam && (
                    <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTeam ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-full" />
                          <div className="space-y-2">
                            <div className="w-24 h-4 bg-gray-300 rounded" />
                            <div className="w-16 h-3 bg-gray-300 rounded" />
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="w-12 h-4 bg-gray-300 rounded" />
                          <div className="w-8 h-3 bg-gray-300 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : teamData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum técnico encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamData.map((tech, index) => (
                      <div key={tech.technicianId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {tech.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tech.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={tech.status === 'Ativo' ? 'default' : tech.status === 'Ocupado' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {tech.status}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                <span className="text-xs text-muted-foreground">{tech.rating}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{tech.orders}</p>
                          <p className="text-xs text-muted-foreground">ordens</p>
                          {tech.revenue > 0 && (
                            <p className="text-xs text-green-600 font-medium">{formatCurrency(tech.revenue)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Button
                    variant="outline"
                    className="justify-start gap-3 h-auto p-4"
                    onClick={() => navigate('/orders')}
                  >
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Plus className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Nova Ordem de Serviço</p>
                      <p className="text-xs text-muted-foreground">Criar nova ordem</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start gap-3 h-auto p-4"
                    onClick={() => navigate('/clients')}
                  >
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Gerenciar Clientes</p>
                      <p className="text-xs text-muted-foreground">Ver todos os clientes</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start gap-3 h-auto p-4"
                    onClick={() => navigate('/technicians')}
                  >
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Wrench className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Gerenciar Técnicos</p>
                      <p className="text-xs text-muted-foreground">Equipe e agendamentos</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start gap-3 h-auto p-4"
                    onClick={() => navigate('/finance')}
                  >
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <DollarSign className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Relatórios Financeiros</p>
                      <p className="text-xs text-muted-foreground">Receitas e pagamentos</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Sub-navegação Analytics */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="conversions">Conversões Google Ads</TabsTrigger>
              <TabsTrigger value="detailed">Relatório Detalhado</TabsTrigger>
              <TabsTrigger value="bi">Dashboard BI</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
              <TabsTrigger value="tests">Testes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid gap-6 lg:grid-cols-3">
            {/* Métricas de Crescimento */}
            <Card className="border-0 shadow-lg lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Métricas de Crescimento
                  {isLoadingGrowth && (
                    <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingGrowth ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="p-4 bg-gray-100 rounded-lg animate-pulse">
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-24 h-4 bg-gray-300 rounded" />
                            <div className="w-4 h-4 bg-gray-300 rounded" />
                          </div>
                          <div className="w-16 h-8 bg-gray-300 rounded mb-1" />
                          <div className="w-20 h-3 bg-gray-300 rounded" />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="p-4 bg-gray-100 rounded-lg animate-pulse">
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-24 h-4 bg-gray-300 rounded" />
                            <div className="w-4 h-4 bg-gray-300 rounded" />
                          </div>
                          <div className="w-16 h-8 bg-gray-300 rounded mb-1" />
                          <div className="w-20 h-3 bg-gray-300 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${
                        growthMetrics.revenueGrowth >= 0
                          ? 'bg-gradient-to-r from-green-50 to-green-100'
                          : 'bg-gradient-to-r from-red-50 to-red-100'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-sm font-medium ${
                            growthMetrics.revenueGrowth >= 0 ? 'text-green-800' : 'text-red-800'
                          }`}>Crescimento de Receita</p>
                          {growthMetrics.revenueGrowth >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <p className={`text-2xl font-bold ${
                          growthMetrics.revenueGrowth >= 0 ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {growthMetrics.revenueGrowth >= 0 ? '+' : ''}{growthMetrics.revenueGrowth}%
                        </p>
                        <p className={`text-xs ${
                          growthMetrics.revenueGrowth >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>vs. período anterior</p>
                      </div>

                      <div className={`p-4 rounded-lg ${
                        growthMetrics.ordersGrowth >= 0
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100'
                          : 'bg-gradient-to-r from-red-50 to-red-100'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-sm font-medium ${
                            growthMetrics.ordersGrowth >= 0 ? 'text-blue-800' : 'text-red-800'
                          }`}>Crescimento de Ordens</p>
                          {growthMetrics.ordersGrowth >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <p className={`text-2xl font-bold ${
                          growthMetrics.ordersGrowth >= 0 ? 'text-blue-900' : 'text-red-900'
                        }`}>
                          {growthMetrics.ordersGrowth >= 0 ? '+' : ''}{growthMetrics.ordersGrowth}%
                        </p>
                        <p className={`text-xs ${
                          growthMetrics.ordersGrowth >= 0 ? 'text-blue-700' : 'text-red-700'
                        }`}>vs. período anterior</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${
                        growthMetrics.clientsGrowth >= 0
                          ? 'bg-gradient-to-r from-purple-50 to-purple-100'
                          : 'bg-gradient-to-r from-red-50 to-red-100'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-sm font-medium ${
                            growthMetrics.clientsGrowth >= 0 ? 'text-purple-800' : 'text-red-800'
                          }`}>Novos Clientes</p>
                          {growthMetrics.clientsGrowth >= 0 ? (
                            <Users className="h-4 w-4 text-purple-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <p className={`text-2xl font-bold ${
                          growthMetrics.clientsGrowth >= 0 ? 'text-purple-900' : 'text-red-900'
                        }`}>
                          {growthMetrics.clientsGrowth >= 0 ? '+' : ''}{growthMetrics.clientsGrowth}%
                        </p>
                        <p className={`text-xs ${
                          growthMetrics.clientsGrowth >= 0 ? 'text-purple-700' : 'text-red-700'
                        }`}>vs. período anterior</p>
                      </div>

                      <div className={`p-4 rounded-lg ${
                        growthMetrics.avgOrderValueGrowth >= 0
                          ? 'bg-gradient-to-r from-orange-50 to-orange-100'
                          : 'bg-gradient-to-r from-red-50 to-red-100'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-sm font-medium ${
                            growthMetrics.avgOrderValueGrowth >= 0 ? 'text-orange-800' : 'text-red-800'
                          }`}>Ticket Médio</p>
                          {growthMetrics.avgOrderValueGrowth >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <p className={`text-2xl font-bold ${
                          growthMetrics.avgOrderValueGrowth >= 0 ? 'text-orange-900' : 'text-red-900'
                        }`}>
                          {growthMetrics.avgOrderValueGrowth >= 0 ? '+' : ''}{growthMetrics.avgOrderValueGrowth}%
                        </p>
                        <p className={`text-xs ${
                          growthMetrics.avgOrderValueGrowth >= 0 ? 'text-orange-700' : 'text-red-700'
                        }`}>vs. período anterior</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumo Executivo */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Resumo Executivo
                  {isLoadingExecutive && (
                    <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingExecutive ? (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-gray-100 rounded-lg animate-pulse">
                      <div className="w-16 h-8 bg-gray-300 rounded mx-auto mb-2" />
                      <div className="w-24 h-4 bg-gray-300 rounded mx-auto" />
                    </div>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="w-16 h-4 bg-gray-300 rounded animate-pulse" />
                          <div className="w-12 h-4 bg-gray-300 rounded animate-pulse" />
                        </div>
                        <div className="w-full h-2 bg-gray-300 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {executiveSummary.totalOrders}
                      </div>
                      <p className="text-sm text-muted-foreground">Total de Ordens (30 dias)</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Eficiência</span>
                        <span className="text-sm font-medium">{executiveSummary.efficiency}%</span>
                      </div>
                      <Progress value={executiveSummary.efficiency} className="h-2" />
                      <p className="text-xs text-muted-foreground">Ordens concluídas no prazo</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Qualidade</span>
                        <span className="text-sm font-medium">{executiveSummary.quality}%</span>
                      </div>
                      <Progress value={executiveSummary.quality} className="h-2" />
                      <p className="text-xs text-muted-foreground">Ordens sem cancelamento</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pontualidade</span>
                        <span className="text-sm font-medium">{executiveSummary.punctuality}%</span>
                      </div>
                      <Progress value={executiveSummary.punctuality} className="h-2" />
                      <p className="text-xs text-muted-foreground">Entregues no dia agendado</p>
                    </div>

                    {executiveSummary.customerSatisfaction > 0 && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Satisfação</span>
                          <span className="text-sm font-medium">{executiveSummary.customerSatisfaction}/5</span>
                        </div>
                        <Progress value={(executiveSummary.customerSatisfaction / 5) * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground">Avaliação média dos clientes</p>
                      </div>
                    )}

                    {executiveSummary.avgCompletionTime > 0 && (
                      <div className="text-center p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-green-700">
                          {executiveSummary.avgCompletionTime} dias
                        </div>
                        <p className="text-xs text-muted-foreground">Tempo médio de conclusão</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

            </TabsContent>

            <TabsContent value="conversions" className="space-y-6 mt-6">
              <GoogleAdsConversionsExport />
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6 mt-6">
              <ConversionDetailsReport />
            </TabsContent>

            <TabsContent value="bi" className="space-y-6 mt-6">
              <AdvancedBIDashboard />
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-6 mt-6">
              <RealTimeMonitoringDashboard />
            </TabsContent>

            <TabsContent value="tests" className="space-y-6 mt-6">
              <ConversionTestRunner />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
