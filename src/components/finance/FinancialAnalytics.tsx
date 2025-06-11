import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Download,
  Calendar,
  Users,
  Target,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { useFinancialAnalytics } from '@/hooks/useFinancialAnalytics';
import { FinancialFilters } from '@/services/financialAnalyticsService';
import { FinancialCharts } from './FinancialCharts';
import { FinancialFilters as FiltersComponent } from './FinancialFilters';

interface FinancialAnalyticsProps {
  className?: string;
}

export function FinancialAnalytics({ className }: FinancialAnalyticsProps) {
  const {
    analytics,
    isLoading,
    error,
    lastUpdated,
    loadAnalytics,
    refreshAnalytics,
    exportReport,
    formatCurrency,
    formatPercentage,
    getGrowthColor,
    getGrowthIcon
  } = useFinancialAnalytics();

  // Filtros padrão (último mês)
  const [filters, setFilters] = useState<FinancialFilters>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status: 'all'
    };
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadAnalytics(filters);
  }, []);

  /**
   * Aplicar filtros
   */
  const handleFiltersChange = (newFilters: FinancialFilters) => {
    setFilters(newFilters);
    loadAnalytics(newFilters);
  };

  /**
   * Renderizar ícone de crescimento
   */
  const renderGrowthIcon = (growth: number) => {
    const icon = getGrowthIcon(growth);
    const color = getGrowthColor(growth);
    
    switch (icon) {
      case 'up':
        return <ArrowUp className={`h-4 w-4 ${color}`} />;
      case 'down':
        return <ArrowDown className={`h-4 w-4 ${color}`} />;
      default:
        return <Minus className={`h-4 w-4 ${color}`} />;
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Financeiros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={refreshAnalytics} variant="outline">
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
      {/* Header com filtros e ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Analytics Financeiros
            </CardTitle>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-sm text-gray-500">
                  Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
                </span>
              )}
              <Button onClick={refreshAnalytics} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={() => exportReport('csv')} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FiltersComponent 
            filters={filters} 
            onFiltersChange={handleFiltersChange}
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mr-3" />
              <span className="text-lg">Carregando analytics...</span>
            </div>
          </CardContent>
        </Card>
      ) : analytics ? (
        <>
          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Receita Total
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(analytics.performanceMetrics.totalRevenue)}
                  </span>
                  <div className="flex items-center gap-1">
                    {renderGrowthIcon(analytics.periodComparison.revenueGrowth)}
                    <span className={`text-sm ${getGrowthColor(analytics.periodComparison.revenueGrowth)}`}>
                      {formatPercentage(analytics.periodComparison.revenueGrowth)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Despesas Totais
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-red-600">
                    {formatCurrency(analytics.performanceMetrics.totalExpenses)}
                  </span>
                  <div className="flex items-center gap-1">
                    {renderGrowthIcon(analytics.periodComparison.expenseGrowth)}
                    <span className={`text-sm ${getGrowthColor(analytics.periodComparison.expenseGrowth)}`}>
                      {formatPercentage(analytics.periodComparison.expenseGrowth)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Lucro Líquido
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${analytics.performanceMetrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(analytics.performanceMetrics.netProfit)}
                  </span>
                  <div className="flex items-center gap-1">
                    {renderGrowthIcon(analytics.periodComparison.profitGrowth)}
                    <span className={`text-sm ${getGrowthColor(analytics.periodComparison.profitGrowth)}`}>
                      {formatPercentage(analytics.periodComparison.profitGrowth)}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Margem: {analytics.performanceMetrics.profitMargin.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total de Ordens
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600">
                    {analytics.performanceMetrics.totalOrders}
                  </span>
                  <div className="flex items-center gap-1">
                    {renderGrowthIcon(analytics.periodComparison.ordersGrowth)}
                    <span className={`text-sm ${getGrowthColor(analytics.periodComparison.ordersGrowth)}`}>
                      {formatPercentage(analytics.periodComparison.ordersGrowth)}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Ticket Médio: {formatCurrency(analytics.performanceMetrics.averageOrderValue)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs com diferentes visualizações */}
          <Tabs defaultValue="charts" className="space-y-6">
            <TabsList>
              <TabsTrigger value="charts">Gráficos</TabsTrigger>
              <TabsTrigger value="services">Por Tipo de Serviço</TabsTrigger>
              <TabsTrigger value="technicians">Por Técnico</TabsTrigger>
              <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
            </TabsList>

            <TabsContent value="charts">
              <FinancialCharts analytics={analytics} />
            </TabsContent>

            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>Receita por Tipo de Serviço</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.revenueByServiceType.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{item.serviceType}</h4>
                          <p className="text-sm text-gray-600">
                            {item.count} ordens • Ticket médio: {formatCurrency(item.averageValue)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(item.revenue)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="technicians">
              <Card>
                <CardHeader>
                  <CardTitle>Performance por Técnico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.revenueByTechnician.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{item.technicianName}</h4>
                          <p className="text-sm text-gray-600">
                            {item.ordersCount} ordens • Ticket médio: {formatCurrency(item.averageOrderValue)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {formatCurrency(item.revenue)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>Evolução Temporal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.revenueByPeriod.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border-l-4 border-l-blue-500 bg-gray-50">
                        <div>
                          <h4 className="font-medium">{new Date(item.date).toLocaleDateString('pt-BR')}</h4>
                          <p className="text-sm text-gray-600">
                            Lucro: {formatCurrency(item.profit)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            <span className="text-green-600">+{formatCurrency(item.revenue)}</span>
                            {' / '}
                            <span className="text-red-600">-{formatCurrency(item.expenses)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum dado disponível para o período selecionado</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
