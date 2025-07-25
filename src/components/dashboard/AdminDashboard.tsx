
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

  // Atualizar horário em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calcular métricas avançadas
  const totalOrders = pendingOrders + inProgressOrders + completedOrders;
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
  const revenueGrowth = 12.5; // Simulado - pode ser calculado com dados históricos
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Ordens recentes (últimas 5)
  const recentOrders = serviceOrders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Dados para gráficos (simulados - podem ser calculados com dados reais)
  const weeklyData = [
    { day: 'Seg', orders: 12, revenue: 2400 },
    { day: 'Ter', orders: 19, revenue: 3800 },
    { day: 'Qua', orders: 15, revenue: 3000 },
    { day: 'Qui', orders: 22, revenue: 4400 },
    { day: 'Sex', orders: 18, revenue: 3600 },
    { day: 'Sáb', orders: 8, revenue: 1600 },
    { day: 'Dom', orders: 5, revenue: 1000 }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simular refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weeklyData.map((day, index) => (
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
                          value={(day.orders / 25) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Simulando dados de técnicos */}
                  {[
                    { name: 'Pedro Santos', orders: 15, rating: 4.8, status: 'Ativo' },
                    { name: 'Paulo Cesar', orders: 12, rating: 4.6, status: 'Ativo' },
                    { name: 'Ana Silva', orders: 8, rating: 4.9, status: 'Ocupado' },
                    { name: 'Carlos Lima', orders: 6, rating: 4.5, status: 'Disponível' }
                  ].map((tech, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                      </div>
                    </div>
                  ))}
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
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Métricas de Crescimento */}
            <Card className="border-0 shadow-lg lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Métricas de Crescimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-green-800">Crescimento Mensal</p>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold text-green-900">+{revenueGrowth}%</p>
                      <p className="text-xs text-green-700">vs. mês anterior</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-blue-800">Novos Clientes</p>
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <p className="text-2xl font-bold text-blue-900">+24</p>
                      <p className="text-xs text-blue-700">este mês</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-purple-800">Satisfação</p>
                        <Star className="h-4 w-4 text-purple-600" />
                      </div>
                      <p className="text-2xl font-bold text-purple-900">4.8/5</p>
                      <p className="text-xs text-purple-700">avaliação média</p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-orange-800">Tempo Médio</p>
                        <Clock className="h-4 w-4 text-orange-600" />
                      </div>
                      <p className="text-2xl font-bold text-orange-900">2.3 dias</p>
                      <p className="text-xs text-orange-700">para conclusão</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumo Executivo */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Resumo Executivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {totalOrdersCount}
                    </div>
                    <p className="text-sm text-muted-foreground">Total de Ordens</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Eficiência</span>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Qualidade</span>
                      <span className="text-sm font-medium">96%</span>
                    </div>
                    <Progress value={96} className="h-2" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pontualidade</span>
                      <span className="text-sm font-medium">88%</span>
                    </div>
                    <Progress value={88} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
